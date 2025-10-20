import pino from 'pino';
import { redactString } from '../utils/redaction';

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  redact: {
    paths: ['password', 'token', 'apiKey', 'secret', 'key'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Create job logger
export const createJobLogger = (processor: string, jobId: string, orgId?: string) => {
  return logger.child({
    processor,
    jobId,
    orgId,
  });
};

// Create request logger
export const createRequestLogger = (req: any) => {
  return logger.child({
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });
};

export default logger;