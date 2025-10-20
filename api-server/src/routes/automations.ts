import { Router } from 'express';
import { requireOrg } from '../lib/tenancy';
import { z } from 'zod';
import { enqueueReminder, enqueueNurture, enqueueDunning } from '../queues/enqueue';

const r = Router();

r.post('/api/automations/sms_inbound', requireOrg, async (req, res) => {
  // Store raw inbound message; upsert contact if desired (stub ok)
  res.json({ ok: true });
});

r.post('/api/automations/email_inbound', requireOrg, async (req, res) => {
  res.json({ ok: true });
});

const RunBody = z.object({
  type: z.enum(['booking', 'reminder', 'review', 'nurture', 'dunning', 'sla']),
  orgId: z.string(),
  payload: z.any().optional()
});

r.post('/api/automations/run', requireOrg, async (req, res) => {
  const { type, orgId, payload } = RunBody.parse(req.body);
  // enqueue to queues
  if (type === 'reminder') await enqueueReminder({ orgId, payload });
  if (type === 'nurture') await enqueueNurture({ orgId, payload });
  if (type === 'dunning') await enqueueDunning({ orgId, payload });
  res.json({ ok: true, queued: type });
});

export default r;
