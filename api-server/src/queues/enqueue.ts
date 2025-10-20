import { remindersQueue, nurtureQueue, dunningQueue, snapshotsQueue } from './queues';

export const enqueueReminder = (data: any) => remindersQueue.add('reminder', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
export const enqueueNurture = (data: any) => nurtureQueue.add('nurture', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
export const enqueueDunning = (data: any) => dunningQueue.add('dunning', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
export const enqueueSnapshot = (data: any) => snapshotsQueue.add('snapshot', data, { attempts: 3 });
