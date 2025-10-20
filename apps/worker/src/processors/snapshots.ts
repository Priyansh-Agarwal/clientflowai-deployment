import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { createJobLogger } from '../config/logger';
import { PrismaClient } from '@prisma/client';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();

export const snapshotsWorker = new Worker('snapshots', async (job: Job) => {
  const logger = createJobLogger('snapshots-worker', job.id!, job.data.orgId);
  
  try {
    const { orgId, payload } = job.data;
    
    logger.info('Processing snapshots job', { orgId, payload });

    // Calculate daily metrics
    const date = payload.date ? new Date(payload.date) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get leads created today
    const leads = await prisma.contact.count({
      where: {
        orgId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Get deals won today
    const dealsWon = await prisma.deal.findMany({
      where: {
        orgId,
        stage: 'won',
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const revenueCents = dealsWon.reduce((sum, deal) => sum + deal.valueCents, 0);

    // Get appointments for show rate calculation
    const appointments = await prisma.appointment.findMany({
      where: {
        orgId,
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const showRate = appointments.length > 0 
      ? appointments.filter(apt => apt.status === 'completed').length / appointments.length
      : 0;

    // Create or update daily metrics
    await prisma.dailyMetric.upsert({
      where: {
        date_orgId: {
          date: startOfDay,
          orgId,
        },
      },
      update: {
        leads,
        dealsWon: dealsWon.length,
        revenueCents,
        showRate,
      },
      create: {
        date: startOfDay,
        orgId,
        leads,
        dealsWon: dealsWon.length,
        revenueCents,
        showRate,
      },
    });

    logger.info('Snapshots processed successfully', {
      orgId,
      date: startOfDay,
      leads,
      dealsWon: dealsWon.length,
      revenueCents,
      showRate,
    });

    return {
      success: true,
      metrics: {
        leads,
        dealsWon: dealsWon.length,
        revenueCents,
        showRate,
      },
    };
  } catch (error) {
    logger.error('Snapshots job failed', { error, orgId: job.data.orgId });
    throw error;
  }
}, { 
  connection,
  concurrency: 1,
});

snapshotsWorker.on('completed', (job) => {
  console.log(`Snapshots job ${job.id} completed`);
});

snapshotsWorker.on('failed', (job, err) => {
  console.error(`Snapshots job ${job?.id} failed:`, err);
});
