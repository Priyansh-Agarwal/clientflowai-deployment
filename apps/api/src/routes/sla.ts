import { Router, Request, Response } from 'express';
import { requireOrg } from '../lib/tenancy';
import { createRequestLogger } from '../config/logger';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/sla/unanswered', requireOrg, async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const orgId = (req as any).orgId as string;
  const minutes = parseInt(req.query.minutes as string) || 5;

  try {
    const thresholdTime = new Date(Date.now() - minutes * 60 * 1000);
    
    // Find conversations with unanswered inbound messages
    const unansweredConversations = await prisma.conversation.findMany({
      where: {
        orgId,
        status: 'active',
        messages: {
          some: {
            direction: 'inbound',
            createdAt: {
              lte: thresholdTime,
            },
          },
        },
        NOT: {
          messages: {
            some: {
              direction: 'outbound',
              createdAt: {
                gte: thresholdTime,
              },
            },
          },
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
        messages: {
          where: {
            direction: 'inbound',
            createdAt: {
              lte: thresholdTime,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const data = unansweredConversations.map(conversation => {
      const lastInboundMessage = conversation.messages[0];
      const timeSinceLastMessage = Math.floor(
        (Date.now() - new Date(lastInboundMessage.createdAt).getTime()) / (1000 * 60)
      );

      return {
        conversation_id: conversation.id,
        contact: conversation.contact,
        last_message: {
          id: lastInboundMessage.id,
          body: lastInboundMessage.body,
          channel: lastInboundMessage.channel,
          created_at: lastInboundMessage.createdAt,
        },
        minutes_unanswered: timeSinceLastMessage,
        sla_violation: timeSinceLastMessage > minutes,
        assigned_to: conversation.assignedTo,
        priority: conversation.priority,
      };
    });

    logger.info('Retrieved unanswered conversations for SLA monitoring', {
      orgId,
      minutes,
      count: data.length,
      violations: data.filter(c => c.sla_violation).length,
    });

    res.json({ data });
  } catch (error) {
    logger.error('Failed to retrieve unanswered conversations', { error, orgId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unanswered conversations',
    });
  }
});

export default router;
