import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const remindersQueue = new Queue('reminders', { connection });
export const nurtureQueue = new Queue('nurture', { connection });
export const dunningQueue = new Queue('dunning', { connection });
export const snapshotsQueue = new Queue('snapshots', { connection });

// Basic workers (replace with real logic)
export const remindersWorker = new Worker('reminders', async (job: Job) => ({ ok: true, job: job.id }), { connection });
export const nurtureWorker = new Worker('nurture', async (job: Job) => ({ ok: true, job: job.id }), { connection });
export const dunningWorker = new Worker('dunning', async (job: Job) => ({ ok: true, job: job.id }), { connection });
export const snapshotsWorker = new Worker('snapshots', async (job: Job) => ({ ok: true, job: job.id }), { connection });
