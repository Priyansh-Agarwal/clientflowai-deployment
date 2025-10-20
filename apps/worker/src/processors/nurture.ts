import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendSms } from '../services/comms/twilio';
import { sendEmail } from '../services/comms/sendgrid';
import { createJobLogger } from '../config/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const nurtureWorker = new Worker('nurture', async (job: Job) => {
  const logger = createJobLogger('nurture-worker', job.id!, job.data.orgId);
  
  try {
    const { orgId, payload } = job.data;
    
    logger.info('Processing nurture job', { orgId, payload });

    // Send nurture message via SMS or email
    if (payload.contact?.phone) {
      const result = await sendSms({
        orgId,
        to: payload.contact.phone,
        body: payload.message || 'Thank you for your interest! We\'ll be in touch soon.',
      });
      
      if (result.success) {
        logger.info('Nurture SMS sent', { orgId, messageId: result.messageId });
      } else {
        logger.error('Failed to send nurture SMS', { orgId, error: result.error });
      }
    }

    if (payload.contact?.email && !payload.contact?.phone) {
      const result = await sendEmail({
        orgId,
        to: payload.contact.email,
        subject: payload.subject || 'Thank you for your interest',
        html: payload.message || '<p>Thank you for your interest! We\'ll be in touch soon.</p>',
      });
      
      if (result.success) {
        logger.info('Nurture email sent', { orgId, messageId: result.messageId });
      } else {
        logger.error('Failed to send nurture email', { orgId, error: result.error });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Nurture job failed', { error, orgId: job.data.orgId });
    throw error;
  }
}, { 
  connection,
  concurrency: 3,
});

nurtureWorker.on('completed', (job) => {
  console.log(`Nurture job ${job.id} completed`);
});

nurtureWorker.on('failed', (job, err) => {
  console.error(`Nurture job ${job?.id} failed:`, err);
});