import { Router } from 'express';
import { requireOrg } from '../lib/tenancy';

const r = Router();

r.get('/api/appointments', requireOrg, async (req, res) => {
  const { window, status, within } = req.query as any;
  // For now, return mock shapes expected by n8n; replace with real DB later.
  if (window === 'next_24h') {
    return res.json({ data: [
      { id: 'appt1', starts_at: new Date(Date.now() + 23 * 3600e3).toISOString(), reminder_offset_minutes: 60, contact: { phone: '+15555550123' } }
    ]});
  }
  if (status === 'completed' && within === '1d') {
    return res.json({ data: [
      { id: 'apptC', starts_at: new Date(Date.now() - 1 * 3600e3).toISOString(), contact: { phone: '+15555550123' } }
    ]});
  }
  res.json({ data: []});
});

export default r;