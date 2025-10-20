import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import logger from '../config/logger';
import { captureException } from '../config/sentry';

// Queue names
export const QUEUE_NAMES = {
  REMINDERS: 'reminders',
  NURTURE: 'nurture',
  DUNNING: 'dunning',
  SNAPSHOTS: 'snapshots',
} as const;

// Job types
export const JOB_TYPES = {
  // Reminders
  APPOINTMENT_REMINDER_24H: 'appointment_reminder_24h',
  APPOINTMENT_REMINDER_3H: 'appointment_reminder_3h',
  
  // Nurture
  NURTURE_EMAIL: 'nurture_email',
  NURTURE_SMS: 'nurture_sms',
  
  // Dunning
  PAYMENT_RETRY: 'payment_retry',
  PAYMENT_NOTICE: 'payment_notice',
  
  // Snapshots
  DAILY_METRICS: 'daily_metrics',
} as const;

// Queue configurations
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues
export const remindersQueue = new Queue(QUEUE_NAMES.REMINDERS, queueConfig);
export const nurtureQueue = new Queue(QUEUE_NAMES.NURTURE, queueConfig);
export const dunningQueue = new Queue(QUEUE_NAMES.DUNNING, queueConfig);
export const snapshotsQueue = new Queue(QUEUE_NAMES.SNAPSHOTS, queueConfig);

// Queue event handlers
const setupQueueEvents = (queue: Queue, queueName: string) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${queueName} error`, { error: error.message });
    captureException(error, { queue: queueName });
  });

  queue.on('waiting', (job) => {
    logger.debug(`Job ${job.id} waiting in ${queueName}`, { jobName: job.name });
  });

  queue.on('active', (job) => {
    logger.debug(`Job ${job.id} active in ${queueName}`, { jobName: job.name });
  });

  queue.on('completed', (job, result) => {
    logger.info(`Job ${job.id} completed in ${queueName}`, { 
      jobName: job.name,
      duration: Date.now() - job.timestamp,
    });
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job?.id} failed in ${queueName}`, { 
      jobName: job?.name,
      error: error.message,
      attempts: job?.attemptsMade,
    });
    captureException(error, { 
      queue: queueName, 
      jobId: job?.id,
      jobName: job?.name,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled in ${queueName}`, { jobName: job.name });
  });
};

// Setup event handlers for all queues
setupQueueEvents(remindersQueue, QUEUE_NAMES.REMINDERS);
setupQueueEvents(nurtureQueue, QUEUE_NAMES.NURTURE);
setupQueueEvents(dunningQueue, QUEUE_NAMES.DUNNING);
setupQueueEvents(snapshotsQueue, QUEUE_NAMES.SNAPSHOTS);

// Health check function
export const checkQueuesHealth = async () => {
  try {
    const queues = [remindersQueue, nurtureQueue, dunningQueue, snapshotsQueue];
    const health = await Promise.all(
      queues.map(async (queue) => {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        return {
          name: queue.name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        };
      })
    );

    logger.info('Queue health check', { queues: health });
    return health;
  } catch (error) {
    logger.error('Queue health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Graceful shutdown
export const closeQueues = async () => {
  logger.info('Closing queues...');
  
  await Promise.all([
    remindersQueue.close(),
    nurtureQueue.close(),
    nurtureQueue.close(),
    dunningQueue.close(),
    snapshotsQueue.close(),
  ]);
  
  logger.info('All queues closed');
};

