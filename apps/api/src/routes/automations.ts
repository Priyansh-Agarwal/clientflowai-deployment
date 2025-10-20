import { Router, Request, Response } from 'express';
import { requireOrg, optionalOrg } from '../lib/tenancy';
import { z } from 'zod';
import { createRequestLogger } from '../config/logger';
import { PrismaClient } from '@prisma/client';
import { sendSms } from '../services/comms/twilio';
import { sendEmail } from '../services/comms/sendgrid';
import { normalizePhone, normalizeEmail } from '../lib/tenancy';

const router = Router();
const prisma = new PrismaClient();

// SMS Inbound Proxy
router.post('/automations/sms_inbound', optionalOrg, async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const orgId = (req as any).orgId || req.body.orgId || req.headers['x-org-id'];
  
  try {
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
    }

    const { From, To, Body, MessageSid, MessageStatus } = req.body;
    
    logger.info('SMS inbound proxy received', {
      orgId,
      from: From,
      to: To,
      messageSid: MessageSid,
    });

    // Store inbound message
    await prisma.message.create({
      data: {
        orgId,
        direction: 'inbound',
        channel: 'sms',
        toAddr: To,
        fromAddr: From,
        body: Body,
        meta: {
          messageSid: MessageSid,
          messageStatus: MessageStatus,
          source: 'n8n',
        },
      },
    });

    // Upsert contact
    const normalizedPhone = normalizePhone(From);
    if (normalizedPhone) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          orgId,
          phone: normalizedPhone,
        },
      });

      if (!existingContact) {
        await prisma.contact.create({
          data: {
            orgId,
            firstName: 'SMS',
            lastName: 'Contact',
            phone: normalizedPhone,
            tags: ['sms-inbound'],
          },
        });
      }
    }

    res.json({ 
      success: true, 
      messageId: MessageSid,
      orgId,
    });
  } catch (error) {
    logger.error('SMS inbound proxy error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process SMS inbound',
    });
  }
});

// Email Inbound Proxy
router.post('/automations/email_inbound', optionalOrg, async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const orgId = (req as any).orgId || req.body.orgId || req.headers['x-org-id'];
  
  try {
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
    }

    const { from, to, subject, text, html, headers } = req.body;
    
    logger.info('Email inbound proxy received', {
      orgId,
      from,
      to,
      subject,
    });

    // Store inbound email
    await prisma.message.create({
      data: {
        orgId,
        direction: 'inbound',
        channel: 'email',
        toAddr: to,
        fromAddr: from,
        body: html || text,
        meta: {
          subject,
          headers,
          source: 'n8n',
        },
      },
    });

    // Upsert contact
    const normalizedEmail = normalizeEmail(from);
    if (normalizedEmail) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          orgId,
          email: normalizedEmail,
        },
      });

      if (!existingContact) {
        await prisma.contact.create({
          data: {
            orgId,
            firstName: 'Email',
            lastName: 'Contact',
            email: normalizedEmail,
            tags: ['email-inbound'],
          },
        });
      }
    }

    res.json({ 
      success: true, 
      orgId,
    });
  } catch (error) {
    logger.error('Email inbound proxy error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process email inbound',
    });
  }
});

// Automation Run Schema
const RunBodySchema = z.object({
  type: z.enum(['booking', 'reminder', 'review', 'nurture', 'dunning', 'sla']),
  orgId: z.string().uuid(),
  payload: z.any().optional(),
});

// Automation Run Endpoint
router.post('/automations/run', requireOrg, async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const orgId = (req as any).orgId as string;
  
  try {
    const { type, payload } = RunBodySchema.parse(req.body);
    
    logger.info('Automation run requested', { type, orgId, payload });

    let jobId: string | undefined;

    // Import queue functions
    const { enqueueReminder, enqueueNurture, enqueueDunning, enqueueSnapshots } = await import('../workers/enqueue');

    switch (type) {
      case 'reminder':
        jobId = await enqueueReminder({ orgId, payload });
        break;
      case 'nurture':
        jobId = await enqueueNurture({ orgId, payload });
        break;
      case 'dunning':
        jobId = await enqueueDunning({ orgId, payload });
        break;
      case 'booking':
        // Handle booking automation (could be a reminder type)
        jobId = await enqueueReminder({ orgId, payload });
        break;
      case 'review':
        // Handle review automation (could be a nurture type)
        jobId = await enqueueNurture({ orgId, payload });
        break;
      case 'sla':
        // Handle SLA automation (could be a snapshots type)
        jobId = await enqueueSnapshots({ orgId, payload });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown automation type: ${type}`,
        });
    }

    logger.info('Automation job queued', { type, orgId, jobId });
    
    res.json({
      success: true,
      jobId,
      type,
      orgId,
    });
  } catch (error) {
    logger.error('Failed to run automation', { error, type: req.body.type });
    res.status(500).json({
      success: false,
      error: 'Failed to queue automation job',
    });
  }
});

// Get Automation Presets
router.get('/automations/presets', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const presetsDir = path.join(__dirname, '../../automations/presets');
    const presetFiles = fs.readdirSync(presetsDir).filter((file: string) => file.endsWith('.json'));
    
    const presets = presetFiles.map((file: string) => {
      const filePath = path.join(presetsDir, file);
      const presetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return presetData;
    });

    logger.info('Automation presets retrieved', { count: presets.length });
    res.json(presets);
  } catch (error) {
    logger.error('Failed to get automation presets', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to load automation presets',
    });
  }
});

export default router;