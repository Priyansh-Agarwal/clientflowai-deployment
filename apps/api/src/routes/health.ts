import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { createRequestLogger } from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

// Redis client for health checks
let redisClient: any = null;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err: Error) => {
    console.error('Redis client error:', err);
  });
}

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'clientflow-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
    
    logger.debug('Health check requested', { health });
    
    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'clientflow-api',
      error: 'Health check failed',
    });
  }
});

// Readiness check endpoint
router.get('/ready', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  const checks: Record<string, boolean> = {};
  let isReady = true;
  
  try {
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      checks.database = false;
      isReady = false;
    }
    
    // Check Redis connection
    if (redisClient) {
      try {
        await redisClient.ping();
        checks.redis = true;
      } catch (error) {
        logger.error('Redis health check failed', { error });
        checks.redis = false;
        isReady = false;
      }
    } else {
      checks.redis = true; // Redis is optional
    }
    
    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      logger.error('Missing required environment variables', { missingEnvVars });
      checks.environment = false;
      isReady = false;
    } else {
      checks.environment = true;
    }
    
    const readiness = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      service: 'clientflow-api',
      checks,
    };
    
    logger.debug('Readiness check requested', { readiness });
    
    res.status(isReady ? 200 : 503).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      service: 'clientflow-api',
      error: 'Readiness check failed',
      checks: {},
    });
  }
});

// Liveness check endpoint (for Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    service: 'clientflow-api',
  });
});

export default router;
