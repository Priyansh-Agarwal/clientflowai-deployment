import { remindersQueue, nurtureQueue, dunningQueue, snapshotsQueue } from './queues';

export interface EnqueueJob {
  orgId: string;
  payload?: any;
}

export async function enqueueReminder(job: EnqueueJob) {
  return remindersQueue.add('reminder', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function enqueueNurture(job: EnqueueJob) {
  return nurtureQueue.add('nurture', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function enqueueDunning(job: EnqueueJob) {
  return dunningQueue.add('dunning', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function enqueueSnapshots(job: EnqueueJob) {
  return snapshotsQueue.add('snapshots', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}
