import { Queue } from 'bullmq';
import { createJobLogger } from '../config/logger';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Create queues
export const remindersQueue = new Queue('reminders', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const nurtureQueue = new Queue('nurture', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const dunningQueue = new Queue('dunning', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const snapshotsQueue = new Queue('snapshots', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Queue event handlers
const setupQueueEvents = (queue: Queue, queueName: string) => {
  queue.on('waiting', (job) => {
    const logger = createJobLogger(queueName, job.id!, job.data.orgId);
    logger.info('Job waiting', { jobId: job.id, queueName });
  });

  queue.on('active', (job) => {
    const logger = createJobLogger(queueName, job.id!, job.data.orgId);
    logger.info('Job started', { jobId: job.id, queueName });
  });

  queue.on('completed', (job, result) => {
    const logger = createJobLogger(queueName, job.id!, job.data.orgId);
    logger.info('Job completed', { jobId: job.id, queueName, result });
  });

  queue.on('failed', (job, err) => {
    const logger = createJobLogger(queueName, job?.id!, job?.data?.orgId);
    logger.error('Job failed', { jobId: job?.id, queueName, error: err });
  });

  queue.on('stalled', (job) => {
    const logger = createJobLogger(queueName, job.id!, job.data.orgId);
    logger.warn('Job stalled', { jobId: job.id, queueName });
  });

  queue.on('progress', (job, progress) => {
    const logger = createJobLogger(queueName, job.id!, job.data.orgId);
    logger.info('Job progress', { jobId: job.id, queueName, progress });
  });
};

// Setup event handlers for all queues
setupQueueEvents(remindersQueue, 'reminders');
setupQueueEvents(nurtureQueue, 'nurture');
setupQueueEvents(dunningQueue, 'dunning');
setupQueueEvents(snapshotsQueue, 'snapshots');

// Queue management functions
export const getQueueStats = async () => {
  const stats = await Promise.all([
    remindersQueue.getJobCounts(),
    nurtureQueue.getJobCounts(),
    dunningQueue.getJobCounts(),
    snapshotsQueue.getJobCounts(),
  ]);

  return {
    reminders: stats[0],
    nurture: stats[1],
    dunning: stats[2],
    snapshots: stats[3],
  };
};

export const pauseAllQueues = async () => {
  await Promise.all([
    remindersQueue.pause(),
    nurtureQueue.pause(),
    dunningQueue.pause(),
    snapshotsQueue.pause(),
  ]);
};

export const resumeAllQueues = async () => {
  await Promise.all([
    remindersQueue.resume(),
    nurtureQueue.resume(),
    dunningQueue.resume(),
    snapshotsQueue.resume(),
  ]);
};

export const clearAllQueues = async () => {
  await Promise.all([
    remindersQueue.obliterate({ force: true }),
    nurtureQueue.obliterate({ force: true }),
    dunningQueue.obliterate({ force: true }),
    snapshotsQueue.obliterate({ force: true }),
  ]);
};

// Graceful shutdown
export const closeAllQueues = async () => {
  await Promise.all([
    remindersQueue.close(),
    nurtureQueue.close(),
    dunningQueue.close(),
    snapshotsQueue.close(),
  ]);
};

// Health check
export const checkQueuesHealth = async () => {
  try {
    const stats = await getQueueStats();
    return {
      healthy: true,
      stats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};
