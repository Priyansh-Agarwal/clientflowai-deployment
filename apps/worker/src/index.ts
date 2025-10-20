// Initialize telemetry and Sentry first
import './config/telemetry';
import './config/sentry';

import { createWorkers } from './processors';
import { logger } from './config/logger';
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { remindersQueue, snapshotsQueue } from '../api/src/queues';

const prisma = new PrismaClient();

// Create workers
const workers = createWorkers();

// Scheduled jobs using node-cron
const setupScheduledJobs = () => {
  // Every hour: scan appointments for reminders
  cron.schedule('0 * * * *', async () => {
    logger.info('Running hourly appointment reminder scan');
    
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      
      // Find appointments that need reminders
      const appointments24h = await prisma.appointment.findMany({
        where: {
          startsAt: {
            gte: now,
            lte: tomorrow,
          },
          status: 'confirmed',
        },
        include: {
          contact: true,
          org: true,
        },
      });
      
      const appointments3h = await prisma.appointment.findMany({
        where: {
          startsAt: {
            gte: now,
            lte: threeHoursFromNow,
          },
          status: 'confirmed',
        },
        include: {
          contact: true,
          org: true,
        },
      });
      
      // Queue 24-hour reminders
      for (const appointment of appointments24h) {
        const delay = appointment.startsAt.getTime() - now.getTime() - 24 * 60 * 60 * 1000;
        
        if (delay > 0) {
          await remindersQueue.add('process-reminder', {
            orgId: appointment.orgId,
            contactId: appointment.contactId,
            appointmentId: appointment.id,
            message: `Reminder: You have an appointment tomorrow at ${appointment.startsAt.toLocaleString()}`,
            scheduledFor: appointment.startsAt,
            reminderType: '24h',
          }, {
            delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          });
        }
      }
      
      // Queue 3-hour reminders
      for (const appointment of appointments3h) {
        const delay = appointment.startsAt.getTime() - now.getTime() - 3 * 60 * 60 * 1000;
        
        if (delay > 0) {
          await remindersQueue.add('process-reminder', {
            orgId: appointment.orgId,
            contactId: appointment.contactId,
            appointmentId: appointment.id,
            message: `Reminder: You have an appointment in 3 hours at ${appointment.startsAt.toLocaleString()}`,
            scheduledFor: appointment.startsAt,
            reminderType: '3h',
          }, {
            delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          });
        }
      }
      
      logger.info('Appointment reminders queued', {
        count24h: appointments24h.length,
        count3h: appointments3h.length,
      });
    } catch (error) {
      logger.error('Failed to scan appointments for reminders', { error });
    }
  });
  
  // Every day at 01:00: enqueue snapshots jobs per org
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running daily snapshots job');
    
    try {
      const organizations = await prisma.organization.findMany({
        select: { id: true },
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const org of organizations) {
        await snapshotsQueue.add('process-snapshots', {
          orgId: org.id,
          date: today.toISOString(),
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }
      
      logger.info('Daily snapshots queued', { orgCount: organizations.length });
    } catch (error) {
      logger.error('Failed to queue daily snapshots', { error });
    }
  });
  
  logger.info('Scheduled jobs configured');
};

// Start the worker
const startWorker = async () => {
  try {
    logger.info('Starting ClientFlow Worker', {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
    });
    
    // Setup scheduled jobs
    setupScheduledJobs();
    
    // Log worker status
    logger.info('Worker started successfully', {
      workers: workers.length,
      queues: ['reminders', 'nurture', 'dunning', 'snapshots'],
    });
    
    console.log('🚀 ClientFlow Worker started');
    console.log('📅 Scheduled jobs:');
    console.log('  - Hourly appointment reminder scan');
    console.log('  - Daily snapshots at 01:00');
    console.log('🔄 Active queues:');
    console.log('  - reminders');
    console.log('  - nurture');
    console.log('  - dunning');
    console.log('  - snapshots');
    
  } catch (error) {
    logger.error('Failed to start worker', { error });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down worker gracefully');
  
  try {
    // Close all workers
    await Promise.all(workers.map(worker => worker.close()));
    
    // Close database connection
    await prisma.$disconnect();
    
    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the worker
startWorker();