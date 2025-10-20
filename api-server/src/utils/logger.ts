import winston from 'winston';

// Configure winston logger for production
const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  // Use console format in development, JSON in production
  format: nodeEnv === 'production' ? logFormat : consoleFormat,
  defaultMeta: {
    service: 'clientflow-api',
    environment: nodeEnv,
  },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      level: logLevel,
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      level: 'error',
      format: winston.format.simple(),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      level: 'error',
      format: winston.format.simple(),
    }),
  ],
});

// Add file transports in production
if (nodeEnv === 'production') {
  // Error logs
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    })
  );

  // Combined logs
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    })
  );

  // Application logs (info level and above)
  logger.add(
    new winston.transports.File({
      filename: 'logs/app.log',
      level: 'info',
      format: logFormat,
    })
  );
}

// Helper functions for structured logging
export const logRequest = (req: any, res: any, responseTime: number) => {
  const logData = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    businessId: req.businessId,
  };

  if (res.statusCode >= 400) {
    logger.error('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

export const logAuth = (type: string, data: any) => {
  logger.info('Authentication', { type, ...data });
};

export const logBusiness = (action: string, businessId: string, userId: string, data?: any) => {
  logger.info('Business Action', {
    action,
    businessId,
    userId,
    ...data,
  });
};

export const logWebhook = (source: string, eventType: string, data: any) => {
  logger.info('Webhook Event', {
    source,
    eventType,
    ...data,
  });
};

export const logDatabase = (operation: string, table: string, data: any) => {
  logger.debug('Database Operation', {
    operation,
    table,
    ...data,
  });
};

export const logError = (error: Error, context: any = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logSecurity = (event: string, data: any) => {
  logger.warn('Security Event', {
    event,
    ...data,
  });
};

export const logPerformance = (operation: string, duration: number, data?: any) => {
  if (duration > 1000) { // Log slow operations
    logger.warn('Slow Operation', {
      operation,
      duration,
      ...data,
    });
  } else {
    logger.debug('Operation', {
      operation,
      duration,
      ...data,
    });
  }
};

// Database connection logging
export const logDbConnection = (event: string, data?: any) => {
  logger.info('Database', { event, ...data });
};

// SMS/Twilio logging
export const logSMS = (action: string, phoneNumber: string, data: any) => {
  logger.info('SMS Action', {
    action,
    phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // Mask phone number
    ...data,
  });
};

// File upload logging
export const logFileUpload = (action: string, fileName: string, data: any) => {
  logger.info('File Upload', {
    action,
    fileName,
    ...data,
  });
};

// Analytics logging
export const logAnalytics = (metric: string, businessId: string, data: any) => {
  logger.info('Analytics', {
    metric,
    businessId,
    ...data,
  });
};

// Notification logging
export const logNotification = (type: string, recipientId: string, data: any) => {
  logger.info('Notification', {
    type,
    recipientId,
    ...data,
  });
};

// Rate limiting logging
export const logRateLimit = (ip: string, endpoint: string, data: any) => {
  logger.warn('Rate Limit', {
    ip,
    endpoint,
    ...data,
  });
};

export default logger;
