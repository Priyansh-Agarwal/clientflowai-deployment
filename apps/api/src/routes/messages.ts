import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireOrg } from '../lib/tenancy';
import { sendSms } from '../services/comms/twilio';
import { sendEmail } from '../services/comms/sendgrid';
import { createRequestLogger } from '../config/logger';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const MessageBodySchema = z.object({
  orgId: z.string().uuid(),
  channel: z.enum(['sms', 'email']),
  to_addr: z.string().min(1),
  body: z.string().min(1),
  subject: z.string().optional(),
  from_addr: z.string().optional(),
});

router.post('/messages/outbound', requireOrg, async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const orgId = (req as any).orgId as string;
  
  try {
    const { channel, to_addr, body, subject, from_addr } = MessageBodySchema.parse(req.body);
    
    logger.info('Sending outbound message', {
      orgId,
      channel,
      to_addr,
      subject,
    });

    let result;
    
    if (channel === 'sms') {
      result = await sendSms({
        orgId,
        to: to_addr,
        body,
        from: from_addr,
      });
    } else {
      result = await sendEmail({
        orgId,
        to: to_addr,
        subject: subject || 'Message from ClientFlow',
        html: body,
        from: from_addr,
      });
    }

    // Store message in database
    try {
      await prisma.message.create({
        data: {
          orgId,
          direction: 'outbound',
          channel,
          toAddr: to_addr,
          fromAddr: from_addr || (channel === 'sms' ? process.env.TWILIO_FROM : process.env.SENDGRID_FROM) || '',
          body,
          meta: {
            subject,
            messageId: result.messageId,
            sandbox: result.sandbox,
            error: result.error,
          },
        },
      });
    } catch (dbError) {
      logger.error('Failed to store message in database', { error: dbError });
      // Don't fail the request if DB storage fails
    }

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        sandbox: result.sandbox,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Failed to send outbound message', { error });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

export default router;
