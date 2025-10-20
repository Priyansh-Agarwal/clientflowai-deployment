import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '00000000-0000-0000-0000-000000000000';

describe('Automation API Endpoints', () => {
  beforeAll(async () => {
    // Create test organization if it doesn't exist
    await prisma.organization.upsert({
      where: { id: ORG_ID },
      update: {},
      create: {
        id: ORG_ID,
        name: 'Test Organization',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany({
      where: { orgId: ORG_ID },
    });
    await prisma.contact.deleteMany({
      where: { orgId: ORG_ID },
    });
    await prisma.appointment.deleteMany({
      where: { orgId: ORG_ID },
    });
    await prisma.conversation.deleteMany({
      where: { orgId: ORG_ID },
    });
    await prisma.organization.delete({
      where: { id: ORG_ID },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/messages/outbound', () => {
    it('should send SMS message successfully', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .set('x-org-id', ORG_ID)
        .send({
          orgId: ORG_ID,
          channel: 'sms',
          to_addr: '+15555550123',
          body: 'Test SMS message',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBeDefined();
    });

    it('should send email message successfully', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .set('x-org-id', ORG_ID)
        .send({
          orgId: ORG_ID,
          channel: 'email',
          to_addr: 'test@example.com',
          subject: 'Test Email',
          body: '<p>Test email message</p>',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBeDefined();
    });

    it('should return 400 for invalid channel', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .set('x-org-id', ORG_ID)
        .send({
          orgId: ORG_ID,
          channel: 'invalid',
          to_addr: '+15555550123',
          body: 'Test message',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 for missing org ID', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .send({
          orgId: ORG_ID,
          channel: 'sms',
          to_addr: '+15555550123',
          body: 'Test message',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/appointments?window=next_24h', () => {
    it('should return appointments in next 24 hours', async () => {
      // Create test appointment
      const appointment = await prisma.appointment.create({
        data: {
          orgId: ORG_ID,
          contactId: (await prisma.contact.create({
            data: {
              orgId: ORG_ID,
              firstName: 'Test',
              lastName: 'Contact',
              phone: '+15555550123',
            },
          })).id,
          startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
          status: 'confirmed',
        },
      });

      const response = await request(app)
        .get('/api/appointments?window=next_24h')
        .set('x-org-id', ORG_ID);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('reminder_offset_minutes');
    });
  });

  describe('GET /api/appointments?status=completed&within=1d', () => {
    it('should return completed appointments within 1 day', async () => {
      const response = await request(app)
        .get('/api/appointments?status=completed&within=1d')
        .set('x-org-id', ORG_ID);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/sla/unanswered?minutes=5', () => {
    it('should return unanswered conversations', async () => {
      // Create test conversation with unanswered message
      const conversation = await prisma.conversation.create({
        data: {
          orgId: ORG_ID,
          contactId: (await prisma.contact.create({
            data: {
              orgId: ORG_ID,
              firstName: 'Test',
              lastName: 'Contact',
              phone: '+15555550123',
            },
          })).id,
          status: 'active',
        },
      });

      await prisma.message.create({
        data: {
          orgId: ORG_ID,
          direction: 'inbound',
          channel: 'sms',
          toAddr: '+15555551234',
          fromAddr: '+15555550123',
          body: 'Test message',
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      });

      const response = await request(app)
        .get('/api/sla/unanswered?minutes=5')
        .set('x-org-id', ORG_ID);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/automations/sms_inbound', () => {
    it('should process SMS inbound message', async () => {
      const response = await request(app)
        .post('/api/automations/sms_inbound')
        .set('x-org-id', ORG_ID)
        .send({
          From: '+15555550123',
          To: '+15555551234',
          Body: 'Test SMS from automation',
          MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
          MessageStatus: 'received',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orgId).toBe(ORG_ID);
    });
  });

  describe('POST /api/automations/email_inbound', () => {
    it('should process email inbound message', async () => {
      const response = await request(app)
        .post('/api/automations/email_inbound')
        .set('x-org-id', ORG_ID)
        .send({
          from: 'test@example.com',
          to: 'support@clientflow.ai',
          subject: 'Test Email',
          text: 'Test email content',
          html: '<p>Test email content</p>',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orgId).toBe(ORG_ID);
    });
  });

  describe('POST /api/automations/run', () => {
    it('should enqueue reminder automation', async () => {
      const response = await request(app)
        .post('/api/automations/run')
        .set('x-org-id', ORG_ID)
        .send({
          type: 'reminder',
          orgId: ORG_ID,
          payload: {
            test: true,
            message: 'Test reminder',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should enqueue nurture automation', async () => {
      const response = await request(app)
        .post('/api/automations/run')
        .set('x-org-id', ORG_ID)
        .send({
          type: 'nurture',
          orgId: ORG_ID,
          payload: {
            test: true,
            message: 'Test nurture',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should enqueue dunning automation', async () => {
      const response = await request(app)
        .post('/api/automations/run')
        .set('x-org-id', ORG_ID)
        .send({
          type: 'dunning',
          orgId: ORG_ID,
          payload: {
            test: true,
            message: 'Test dunning',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should return 400 for invalid automation type', async () => {
      const response = await request(app)
        .post('/api/automations/run')
        .set('x-org-id', ORG_ID)
        .send({
          type: 'invalid',
          orgId: ORG_ID,
          payload: {},
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/automations/presets', () => {
    it('should return automation presets', async () => {
      const response = await request(app)
        .get('/api/automations/presets');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
