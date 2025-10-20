import { Router } from 'express';
import { z } from 'zod';
import { requireOrg } from '../lib/tenancy';
import { sendSms } from '../services/comms/twilio';
import { sendEmail } from '../services/comms/sendgrid';
import { validate } from '../lib/validate';

const r = Router();

const Body = z.object({
  orgId: z.string(),
  channel: z.enum(['sms', 'email']),
  to_addr: z.string().min(3),
  body: z.string().min(1)
});

r.post('/api/messages/outbound', requireOrg, validate(Body), async (req, res) => {
  const { channel, to_addr, body } = req.body;
  const result = channel === 'sms'
    ? await sendSms({ to: to_addr, body })
    : await sendEmail({ to: to_addr, subject: 'ClientFlow', html: body });
  res.json(result);
});

export default r;
