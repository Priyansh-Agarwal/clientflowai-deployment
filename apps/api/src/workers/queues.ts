import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const remindersQueue = new Queue('reminders', { 
  connection,
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
  connection,
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
  connection,
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
  connection,
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

export const closeAllQueues = async () => {
  await Promise.all([
    remindersQueue.close(),
    nurtureQueue.close(),
    dunningQueue.close(),
    snapshotsQueue.close(),
  ]);
};
