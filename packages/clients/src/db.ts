import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

class DatabaseClient {
  private static instance: PrismaClient;
  private static isConnected = false;

  static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      });

      // Set up logging
      DatabaseClient.instance.$on('query', (e: any) => {
        logger.debug('Database query', {
          query: e.query,
          params: e.params,
          duration: e.duration,
        });
      });

      DatabaseClient.instance.$on('error', (e: any) => {
        logger.error('Database error', {
          message: e.message,
          target: e.target,
        });
      });

      DatabaseClient.instance.$on('info', (e: any) => {
        logger.info('Database info', {
          message: e.message,
          target: e.target,
        });
      });

      DatabaseClient.instance.$on('warn', (e: any) => {
        logger.warn('Database warning', {
          message: e.message,
          target: e.target,
        });
      });
    }

    return DatabaseClient.instance;
  }

  static async connect(): Promise<void> {
    if (DatabaseClient.isConnected) {
      return;
    }

    try {
      await DatabaseClient.getInstance().$connect();
      DatabaseClient.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (!DatabaseClient.isConnected) {
      return;
    }

    try {
      await DatabaseClient.getInstance().$disconnect();
      DatabaseClient.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database', { error });
      throw error;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await DatabaseClient.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  // Safe transaction wrapper with retry logic
  static async transaction<T>(
    fn: (tx: PrismaClient) => Promise<T>,
    retries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await DatabaseClient.getInstance().$transaction(fn);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retries) {
          logger.error('Transaction failed after all retries', {
            error: lastError.message,
            attempts: retries,
          });
          throw lastError;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn('Transaction failed, retrying', {
          attempt,
          retries,
          delay,
          error: lastError.message,
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Safe query wrapper with error handling
  static async safeQuery<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await fn(DatabaseClient.getInstance());
    } catch (error) {
      logger.error('Database query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context,
      });
      throw error;
    }
  }
}

export default DatabaseClient;

