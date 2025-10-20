import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendSms } from '../services/comms/twilio';
import { sendEmail } from '../services/comms/sendgrid';
import { createJobLogger } from '../config/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const remindersWorker = new Worker('reminders', async (job: Job) => {
  const logger = createJobLogger('reminders-worker', job.id!, job.data.orgId);
  
  try {
    const { orgId, payload } = job.data;
    
    logger.info('Processing reminder job', { orgId, payload });

    // Send reminder via SMS or email
    if (payload.contact?.phone) {
      const result = await sendSms({
        orgId,
        to: payload.contact.phone,
        body: payload.message || 'Reminder: You have an upcoming appointment',
      });
      
      if (result.success) {
        logger.info('Reminder SMS sent', { orgId, messageId: result.messageId });
      } else {
        logger.error('Failed to send reminder SMS', { orgId, error: result.error });
      }
    }

    if (payload.contact?.email && !payload.contact?.phone) {
      const result = await sendEmail({
        orgId,
        to: payload.contact.email,
        subject: 'Appointment Reminder',
        html: payload.message || '<p>Reminder: You have an upcoming appointment</p>',
      });
      
      if (result.success) {
        logger.info('Reminder email sent', { orgId, messageId: result.messageId });
      } else {
        logger.error('Failed to send reminder email', { orgId, error: result.error });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Reminder job failed', { error, orgId: job.data.orgId });
    throw error;
  }
}, { 
  connection,
  concurrency: 5,
});

remindersWorker.on('completed', (job) => {
  console.log(`Reminder job ${job.id} completed`);
});

remindersWorker.on('failed', (job, err) => {
  console.error(`Reminder job ${job?.id} failed:`, err);
});