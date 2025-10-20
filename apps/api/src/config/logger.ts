import pino from 'pino';
import { pinoRedactionSerializer } from '../utils/redaction';

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const logger = pino({
  level: logLevel,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  serializers: {
    ...pinoRedactionSerializer,
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.headers["x-auth-token"]',
      'req.body.password',
      'req.body.token',
      'req.body.email',
      'req.body.phone',
      'res.body.email',
      'res.body.phone',
      'res.body.token',
      'err.message',
      'err.stack',
    ],
    censor: '[REDACTED]',
  },
});

// Create child logger with request context
export function createRequestLogger(req: any) {
  return logger.child({
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });
}

// Create child logger with job context
export function createJobLogger(jobName: string, jobId: string, orgId?: string) {
  return logger.child({
    jobName,
    jobId,
    orgId,
  });
}

export default logger;
