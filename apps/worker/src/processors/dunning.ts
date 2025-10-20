import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendSms } from '../services/comms/twilio';
import { sendEmail } from '../services/comms/sendgrid';
import { createJobLogger } from '../config/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const dunningWorker = new Worker('dunning', async (job: Job) => {
  const logger = createJobLogger('dunning-worker', job.id!, job.data.orgId);
  
  try {
    const { orgId, payload } = job.data;
    
    logger.info('Processing dunning job', { orgId, payload });

    // Send dunning message via SMS or email
    if (payload.contact?.phone) {
      const result = await sendSms({
        orgId,
        to: payload.contact.phone,
        body: payload.message || 'Payment reminder: Please update your payment method to continue service.',
      });
      
      if (result.success) {
        logger.info('Dunning SMS sent', { orgId, messageId: result.messageId });
      } else {
        logger.error('Failed to send dunning SMS', { orgId, error: result.error });
      }
    }

    if (payload.contact?.email && !payload.contact?.phone) {
      const result = await sendEmail({
        orgId,
        to: payload.contact.email,
        subject: payload.subject || 'Payment Reminder',
        html: payload.message || '<p>Payment reminder: Please update your payment method to continue service.</p>',
      });
      
      if (result.success) {
        logger.info('Dunning email sent', { orgId, messageId: result.messageId });
      } else {
        logger.error('Failed to send dunning email', { orgId, error: result.error });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Dunning job failed', { error, orgId: job.data.orgId });
    throw error;
  }
}, { 
  connection,
  concurrency: 2,
});

dunningWorker.on('completed', (job) => {
  console.log(`Dunning job ${job.id} completed`);
});

dunningWorker.on('failed', (job, err) => {
  console.error(`Dunning job ${job?.id} failed:`, err);
});
