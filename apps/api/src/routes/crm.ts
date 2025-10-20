import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { auth, getAuthContext } from '../middleware/auth';
import { tenancy, ensureOrgId } from '../middleware/tenancy';
import { validation } from '../middleware/validation';
import { createRequestLogger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

// Schemas
const CreateContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const UpdateContactSchema = CreateContactSchema.partial();

const ContactQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(),
});

const CreateDealSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
  title: z.string().min(1, 'Title is required'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'won', 'lost']).default('lead'),
  valueCents: z.number().min(0, 'Value must be positive'),
  currency: z.string().default('USD'),
});

const UpdateDealSchema = CreateDealSchema.partial();

const DealQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  stage: z.enum(['lead', 'qualified', 'proposal', 'won', 'lost']).optional(),
  contactId: z.string().uuid().optional(),
});

const CreateActivitySchema = z.object({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  type: z.enum(['note', 'call', 'sms', 'email', 'task']),
  content: z.string().min(1, 'Content is required'),
  meta: z.record(z.any()).optional(),
});

const ActivityQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  type: z.enum(['note', 'call', 'sms', 'email', 'task']).optional(),
});

const CreateAppointmentSchema = z.object({
  contactId: z.string().uuid('Invalid contact ID'),
  startsAt: z.string().datetime('Invalid start time'),
  endsAt: z.string().datetime('Invalid end time'),
  status: z.enum(['pending', 'confirmed', 'completed', 'no_show', 'canceled']).default('pending'),
  location: z.string().optional(),
});

const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

const AppointmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  contactId: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'no_show', 'canceled']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Apply middleware
router.use(auth);
router.use(tenancy);

// Health endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'clientflow-api',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// User info endpoint
router.get('/me', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const { userId, orgId, user, org } = getAuthContext(req as any);
    
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      currentOrg: {
        id: org.id,
        name: org.name,
        createdAt: org.createdAt,
      },
      memberships: memberships.map(m => ({
        orgId: m.orgId,
        role: m.role,
        org: m.org,
      })),
    });
  } catch (error) {
    logger.error('Failed to get user info', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user information',
    });
  }
});

// Contact routes
router.get('/contacts', validation(ContactQuerySchema, 'query'), async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { page, limit, search, tags } = req.query as any;
  
  try {
    const where: any = { orgId };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (tags) {
      const tagArray = tags.split(',').map((t: string) => t.trim());
      where.tags = { hasSome: tagArray };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          deals: {
            select: {
              id: true,
              title: true,
              stage: true,
              valueCents: true,
            },
          },
          appointments: {
            select: {
              id: true,
              startsAt: true,
              status: true,
            },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get contacts', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get contacts',
    });
  }
});

router.post('/contacts', validation(CreateContactSchema), async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  
  try {
    const contactData = ensureOrgId(req.body, orgId);
    
    // Check for duplicate email/phone within org
    if (contactData.email) {
      const existingEmail = await prisma.contact.findFirst({
        where: { orgId, email: contactData.email },
      });
      if (existingEmail) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Contact with this email already exists',
        });
      }
    }
    
    if (contactData.phone) {
      const existingPhone = await prisma.contact.findFirst({
        where: { orgId, phone: contactData.phone },
      });
      if (existingPhone) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Contact with this phone number already exists',
        });
      }
    }

    const contact = await prisma.contact.create({
      data: contactData,
    });

    logger.info('Contact created', { contactId: contact.id, orgId });
    res.status(201).json(contact);
  } catch (error) {
    logger.error('Failed to create contact', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create contact',
    });
  }
});

router.get('/contacts/:id', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { id } = req.params;
  
  try {
    const contact = await prisma.contact.findFirst({
      where: { id, orgId },
      include: {
        deals: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        appointments: {
          orderBy: { startsAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    res.json(contact);
  } catch (error) {
    logger.error('Failed to get contact', { error, contactId: id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get contact',
    });
  }
});

router.put('/contacts/:id', validation(UpdateContactSchema), async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { id } = req.params;
  
  try {
    const contact = await prisma.contact.findFirst({
      where: { id, orgId },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: req.body,
    });

    logger.info('Contact updated', { contactId: id, orgId });
    res.json(updatedContact);
  } catch (error) {
    logger.error('Failed to update contact', { error, contactId: id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update contact',
    });
  }
});

router.delete('/contacts/:id', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { id } = req.params;
  
  try {
    const contact = await prisma.contact.findFirst({
      where: { id, orgId },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    await prisma.contact.delete({
      where: { id },
    });

    logger.info('Contact deleted', { contactId: id, orgId });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete contact', { error, contactId: id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete contact',
    });
  }
});

// Deal routes
router.get('/deals', validation(DealQuerySchema, 'query'), async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { page, limit, stage, contactId } = req.query as any;
  
  try {
    const where: any = { orgId };
    
    if (stage) {
      where.stage = stage;
    }
    
    if (contactId) {
      where.contactId = contactId;
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    res.json({
      data: deals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get deals', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get deals',
    });
  }
});

router.post('/deals', validation(CreateDealSchema), async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  
  try {
    const dealData = ensureOrgId(req.body, orgId);
    
    // Verify contact exists and belongs to org
    const contact = await prisma.contact.findFirst({
      where: { id: dealData.contactId, orgId },
    });
    
    if (!contact) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Contact not found',
      });
    }

    const deal = await prisma.deal.create({
      data: dealData,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    logger.info('Deal created', { dealId: deal.id, orgId });
    res.status(201).json(deal);
  } catch (error) {
    logger.error('Failed to create deal', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create deal',
    });
  }
});

router.put('/deals/:id', validation(UpdateDealSchema), async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { id } = req.params;
  
  try {
    const deal = await prisma.deal.findFirst({
      where: { id, orgId },
    });

    if (!deal) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Deal not found',
      });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: req.body,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    logger.info('Deal updated', { dealId: id, orgId });
    res.json(updatedDeal);
  } catch (error) {
    logger.error('Failed to update deal', { error, dealId: id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update deal',
    });
  }
});

router.delete('/deals/:id', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const { orgId } = getAuthContext(req as any);
  const { id } = req.params;
  
  try {
    const deal = await prisma.deal.findFirst({
      where: { id, orgId },
    });

    if (!deal) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Deal not found',
      });
    }

    await prisma.deal.delete({
      where: { id },
    });

    logger.info('Deal deleted', { dealId: id, orgId });
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete deal', { error, dealId: id });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete deal',
    });
  }
});

export default router;