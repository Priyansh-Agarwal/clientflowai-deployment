import { prisma } from '../lib/prisma';
import logger from '../middleware/logger';

export interface DailyMetrics {
  date: Date;
  orgId: string;
  leads: number;
  dealsWon: number;
  revenueCents: number;
  showRate: number;
}

export interface MetricsQuery {
  orgId: string;
  from: Date;
  to: Date;
}

export class MetricsService {
  static async computeDailySnapshot(orgId: string, date: Date): Promise<DailyMetrics> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Count new leads (contacts created today)
      const leads = await prisma.contact.count({
        where: {
          orgId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      // Count deals won today
      const dealsWon = await prisma.deal.count({
        where: {
          orgId,
          stage: 'won',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      // Calculate revenue from deals won today
      const revenueResult = await prisma.deal.aggregate({
        where: {
          orgId,
          stage: 'won',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _sum: {
          valueCents: true,
        },
      });

      const revenueCents = revenueResult._sum.valueCents || 0;

      // Calculate show rate (appointments completed vs total scheduled)
      const totalAppointments = await prisma.appointment.count({
        where: {
          orgId,
          startsAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const completedAppointments = await prisma.appointment.count({
        where: {
          orgId,
          startsAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'completed',
        },
      });

      const showRate = totalAppointments > 0 ? completedAppointments / totalAppointments : 0;

      const metrics: DailyMetrics = {
        date,
        orgId,
        leads,
        dealsWon,
        revenueCents,
        showRate,
      };

      // Upsert daily metrics
      await prisma.dailyMetric.upsert({
        where: {
          date_orgId: {
            date: startOfDay,
            orgId,
          },
        },
        update: metrics,
        create: metrics,
      });

      logger.info('Daily metrics computed', {
        orgId,
        date: startOfDay.toISOString().split('T')[0],
        leads,
        dealsWon,
        revenueCents,
        showRate,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to compute daily metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
        date,
      });
      throw error;
    }
  }

  static async getDailyMetrics({ orgId, from, to }: MetricsQuery) {
    try {
      const metrics = await prisma.dailyMetric.findMany({
        where: {
          orgId,
          date: {
            gte: from,
            lte: to,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      logger.info('Daily metrics retrieved', {
        orgId,
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
        count: metrics.length,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get daily metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
        from,
        to,
      });
      throw error;
    }
  }

  static async getMetricsSummary(orgId: string, from: Date, to: Date) {
    try {
      const metrics = await this.getDailyMetrics({ orgId, from, to });

      const summary = {
        totalLeads: metrics.reduce((sum, m) => sum + m.leads, 0),
        totalDealsWon: metrics.reduce((sum, m) => sum + m.dealsWon, 0),
        totalRevenueCents: metrics.reduce((sum, m) => sum + m.revenueCents, 0),
        averageShowRate: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + Number(m.showRate), 0) / metrics.length 
          : 0,
        days: metrics.length,
        period: {
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0],
        },
      };

      logger.info('Metrics summary computed', {
        orgId,
        summary,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to get metrics summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
        from,
        to,
      });
      throw error;
    }
  }

  static async computeAllDailySnapshots(orgId: string, from: Date, to: Date) {
    try {
      const current = new Date(from);
      const results: DailyMetrics[] = [];

      while (current <= to) {
        const metrics = await this.computeDailySnapshot(orgId, new Date(current));
        results.push(metrics);
        current.setDate(current.getDate() + 1);
      }

      logger.info('All daily snapshots computed', {
        orgId,
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
        count: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to compute all daily snapshots', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
        from,
        to,
      });
      throw error;
    }
  }
}

