import { Router, Request, Response } from 'express';
import { requireOrg } from '../lib/tenancy';
import { createRequestLogger } from '../config/logger';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/appointments', requireOrg, async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const orgId = (req as any).orgId as string;
  const { window, status, within } = req.query as Record<string, string | undefined>;

  try {
    if (window === 'next_24h') {
      // Return upcoming appointments in next 24 hours with reminder offset
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const appointments = await prisma.appointment.findMany({
        where: {
          orgId,
          startsAt: {
            gte: now,
            lte: tomorrow,
          },
          status: 'confirmed',
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: {
          startsAt: 'asc',
        },
      });

      const data = appointments.map(appointment => {
        const startsAt = new Date(appointment.startsAt);
        const now = new Date();
        const diffMinutes = Math.floor((startsAt.getTime() - now.getTime()) / (1000 * 60));
        
        return {
          id: appointment.id,
          starts_at: appointment.startsAt,
          ends_at: appointment.endsAt,
          status: appointment.status,
          location: appointment.location,
          contact: appointment.contact,
          reminder_offset_minutes: Math.max(0, Math.min(1440, diffMinutes)),
        };
      });

      logger.info('Retrieved appointments for next 24h', { 
        orgId, 
        count: data.length 
      });

      return res.json({ data });
    }

    if (status === 'completed' && within === '1d') {
      // Return completed appointments within 1 day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const appointments = await prisma.appointment.findMany({
        where: {
          orgId,
          status: 'completed',
          updatedAt: {
            gte: oneDayAgo,
          },
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const data = appointments.map(appointment => ({
        id: appointment.id,
        starts_at: appointment.startsAt,
        ends_at: appointment.endsAt,
        status: appointment.status,
        location: appointment.location,
        contact: appointment.contact,
        completed_at: appointment.updatedAt,
      }));

      logger.info('Retrieved completed appointments within 1 day', { 
        orgId, 
        count: data.length 
      });

      return res.json({ data });
    }

    // Default: return all appointments with pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { orgId },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: {
          startsAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.appointment.count({
        where: { orgId },
      }),
    ]);

    const data = appointments.map(appointment => ({
      id: appointment.id,
      starts_at: appointment.startsAt,
      ends_at: appointment.endsAt,
      status: appointment.status,
      location: appointment.location,
      contact: appointment.contact,
    }));

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve appointments', { error, orgId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve appointments',
    });
  }
});

export default router;