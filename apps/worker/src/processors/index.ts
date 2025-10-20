import { Job, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createJobLogger } from '../config/logger';
import { twilioService } from '../services/twilio';
import { sendGridService } from '../services/sendgrid';
import { googleCalendarService } from '../services/google-calendar';
import { remindersQueue, nurtureQueue, dunningQueue, snapshotsQueue } from './queues';

const prisma = new PrismaClient();

// Reminder processor
export const processReminder = async (job: Job) => {
  const logger = createJobLogger('reminder-processor', job.id!, job.data.orgId);
  
  try {
    const { orgId, contactId, message, scheduledFor, reminderType } = job.data;
    
    logger.info('Processing reminder job', {
      contactId,
      reminderType,
      scheduledFor,
    });

    // Get contact details
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId },
    });

    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }

    // Get organization details
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new Error(`Organization ${orgId} not found`);
    }

    // Send reminder based on contact preferences
    let sent = false;
    
    if (contact.phone) {
      const smsResult = await twilioService.sendSms({
        to: contact.phone,
        body: message,
        orgId,
      });
      
      if (smsResult.success) {
        sent = true;
        logger.info('Reminder SMS sent', { contactId, messageId: smsResult.messageId });
      }
    }

    if (contact.email && !sent) {
      const emailResult = await sendGridService.sendEmail({
        to: contact.email,
        subject: `Reminder from ${org.name}`,
        html: `<p>${message}</p>`,
        orgId,
      });
      
      if (emailResult.success) {
        sent = true;
        logger.info('Reminder email sent', { contactId, messageId: emailResult.messageId });
      }
    }

    // Record activity
    await prisma.activity.create({
      data: {
        orgId,
        contactId,
        type: 'sms',
        content: `Reminder sent: ${message}`,
        meta: {
          reminderType,
          scheduledFor,
          sent,
          jobId: job.id,
        },
      },
    });

    logger.info('Reminder processed successfully', { contactId, sent });
    return { success: true, sent };
  } catch (error) {
    logger.error('Failed to process reminder', { error });
    throw error;
  }
};

// Nurture processor
export const processNurture = async (job: Job) => {
  const logger = createJobLogger('nurture-processor', job.id!, job.data.orgId);
  
  try {
    const { orgId, contactId, sequenceStep, template, personalization } = job.data;
    
    logger.info('Processing nurture job', {
      contactId,
      sequenceStep,
      template,
    });

    // Get contact details
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId },
    });

    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }

    // Get organization details
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new Error(`Organization ${orgId} not found`);
    }

    // Personalize message
    let personalizedMessage = template;
    if (personalization) {
      personalizedMessage = personalizedMessage
        .replace(/{contact_name}/g, `${contact.firstName} ${contact.lastName || ''}`.trim())
        .replace(/{business_name}/g, org.name)
        .replace(/{contact_email}/g, contact.email || '')
        .replace(/{contact_phone}/g, contact.phone || '');
    }

    // Send nurture message
    let sent = false;
    let channel = 'email';
    
    if (contact.email) {
      const emailResult = await sendGridService.sendEmail({
        to: contact.email,
        subject: `Message from ${org.name}`,
        html: `<p>${personalizedMessage}</p>`,
        orgId,
      });
      
      if (emailResult.success) {
        sent = true;
        logger.info('Nurture email sent', { contactId, messageId: emailResult.messageId });
      }
    }

    if (contact.phone && !sent) {
      const smsResult = await twilioService.sendSms({
        to: contact.phone,
        body: personalizedMessage,
        orgId,
      });
      
      if (smsResult.success) {
        sent = true;
        channel = 'sms';
        logger.info('Nurture SMS sent', { contactId, messageId: smsResult.messageId });
      }
    }

    // Record activity
    await prisma.activity.create({
      data: {
        orgId,
        contactId,
        type: channel as any,
        content: `Nurture message sent: ${personalizedMessage}`,
        meta: {
          sequenceStep,
          template,
          personalization,
          sent,
          jobId: job.id,
        },
      },
    });

    logger.info('Nurture processed successfully', { contactId, sent, channel });
    return { success: true, sent, channel };
  } catch (error) {
    logger.error('Failed to process nurture', { error });
    throw error;
  }
};

// Dunning processor
export const processDunning = async (job: Job) => {
  const logger = createJobLogger('dunning-processor', job.id!, job.data.orgId);
  
  try {
    const { orgId, contactId, amount, daysOverdue, paymentLink } = job.data;
    
    logger.info('Processing dunning job', {
      contactId,
      amount,
      daysOverdue,
    });

    // Get contact details
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, orgId },
    });

    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }

    // Get organization details
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new Error(`Organization ${orgId} not found`);
    }

    // Create dunning message
    const dunningMessage = `Hi ${contact.firstName}, your payment of $${(amount / 100).toFixed(2)} is ${daysOverdue} days overdue. Please pay now: ${paymentLink}`;

    // Send dunning message
    let sent = false;
    let channel = 'email';
    
    if (contact.email) {
      const emailResult = await sendGridService.sendEmail({
        to: contact.email,
        subject: `Payment Overdue - ${org.name}`,
        html: `<p>${dunningMessage}</p><p>Payment Link: <a href="${paymentLink}">Pay Now</a></p>`,
        orgId,
      });
      
      if (emailResult.success) {
        sent = true;
        logger.info('Dunning email sent', { contactId, messageId: emailResult.messageId });
      }
    }

    if (contact.phone && !sent) {
      const smsResult = await twilioService.sendSms({
        to: contact.phone,
        body: dunningMessage,
        orgId,
      });
      
      if (smsResult.success) {
        sent = true;
        channel = 'sms';
        logger.info('Dunning SMS sent', { contactId, messageId: smsResult.messageId });
      }
    }

    // Record activity
    await prisma.activity.create({
      data: {
        orgId,
        contactId,
        type: channel as any,
        content: `Dunning message sent: ${dunningMessage}`,
        meta: {
          amount,
          daysOverdue,
          paymentLink,
          sent,
          jobId: job.id,
        },
      },
    });

    logger.info('Dunning processed successfully', { contactId, sent, channel });
    return { success: true, sent, channel };
  } catch (error) {
    logger.error('Failed to process dunning', { error });
    throw error;
  }
};

// Snapshots processor
export const processSnapshots = async (job: Job) => {
  const logger = createJobLogger('snapshots-processor', job.id!, job.data.orgId);
  
  try {
    const { orgId, date } = job.data;
    
    logger.info('Processing snapshots job', { orgId, date });

    // Calculate daily metrics
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
      date,
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
    logger.error('Failed to process snapshots', { error });
    throw error;
  }
};

// Create workers
export const createWorkers = () => {
  const workers = [];

  // Reminder worker
  const reminderWorker = new Worker('reminders', processReminder, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  reminderWorker.on('completed', (job) => {
    console.log(`Reminder job ${job.id} completed`);
  });

  reminderWorker.on('failed', (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err);
  });

  workers.push(reminderWorker);

  // Nurture worker
  const nurtureWorker = new Worker('nurture', processNurture, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 3,
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  nurtureWorker.on('completed', (job) => {
    console.log(`Nurture job ${job.id} completed`);
  });

  nurtureWorker.on('failed', (job, err) => {
    console.error(`Nurture job ${job?.id} failed:`, err);
  });

  workers.push(nurtureWorker);

  // Dunning worker
  const dunningWorker = new Worker('dunning', processDunning, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 2,
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  dunningWorker.on('completed', (job) => {
    console.log(`Dunning job ${job.id} completed`);
  });

  dunningWorker.on('failed', (job, err) => {
    console.error(`Dunning job ${job?.id} failed:`, err);
  });

  workers.push(dunningWorker);

  // Snapshots worker
  const snapshotsWorker = new Worker('snapshots', processSnapshots, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 1,
    removeOnComplete: 50,
    removeOnFail: 25,
  });

  snapshotsWorker.on('completed', (job) => {
    console.log(`Snapshots job ${job.id} completed`);
  });

  snapshotsWorker.on('failed', (job, err) => {
    console.error(`Snapshots job ${job?.id} failed:`, err);
  });

  workers.push(snapshotsWorker);

  return workers;
};
