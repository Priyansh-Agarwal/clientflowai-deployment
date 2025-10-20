import { Router } from 'express';
import { requireOrg } from '../lib/tenancy';

const r = Router();

r.get('/api/sla/unanswered', requireOrg, async (req, res) => {
  const minutes = Number(req.query.minutes || 5);
  // Stub: return one pending conversation (replace with DB query)
  res.json({ data: [{ id: 'conv_123', waiting_minutes: minutes + 1, on_call_phone: process.env.ON_CALL_PHONE || '+15555550100' }]});
});

export default r;
