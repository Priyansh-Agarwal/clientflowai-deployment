// Initialize telemetry and Sentry first
import './telemetry';
import './sentry';

import express from 'express';
import compression from 'compression';
import { requestId } from './middleware/requestId';
import { logger } from './middleware/logger';
import { auth } from './middleware/auth';
import { tenancy } from './middleware/tenancy';
import { validation } from './middleware/validation';
import { 
  helmetConfig, 
  corsMiddleware, 
  globalRateLimit, 
  authRateLimit, 
  apiRateLimit, 
  orgRateLimit, 
  speedLimiter, 
  requestSizeLimit, 
  securityHeaders 
} from './middleware/security';
import { createRequestLogger } from './config/logger';
import healthRouter from './routes/health';

const app = express();

// Trust proxy for accurate IP addresses behind load balancer
app.set('trust proxy', 1);

// Security middleware (order matters)
app.use(helmetConfig);
app.use(corsMiddleware);
app.use(securityHeaders);

// Compression middleware
app.use(compression());

// Request parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestSizeLimit);

// Rate limiting middleware
app.use(globalRateLimit);
app.use(speedLimiter);

// Custom middleware
app.use(requestId);
app.use(logger);

// Health endpoints (no auth required)
app.use('/', healthRouter);

// Request logging
app.use((req, res, next) => {
  const requestLogger = createRequestLogger(req);
  requestLogger.info('Request received', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });
  next();
});

// Auth and tenancy middleware (applied per route as needed)
// app.use(auth);
// app.use(tenancy);
// app.use(validation);

export default app;
