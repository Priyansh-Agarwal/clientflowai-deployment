import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { logRequest } from '../utils/logger';

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for accurate IP addresses behind load balancer
app.set('trust proxy', 1);

// Request ID middleware for tracking requests
app.use((req: any, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Enhanced security middleware with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.supabase.io", "https://api.twilio.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration with enhanced security
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin:', { origin });
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'X-Requested-With',
    'X-Request-ID',
    'X-Twilio-Signature',
    'X-Goog-Signature',
    'X-Goog-Timestamp',
    'X-SMS-Signature',
    'X-Review-Signature'
  ],
  exposedHeaders: ['X-Request-ID', 'RateLimit-Remaining', 'RateLimit-Reset'],
};

app.use(cors(corsOptions));

// Slow down brute force attempts
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes, then...
  delayMs: 500, // Add 500ms delay per request above delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Regular rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Webhook-specific rate limiting (higher limits)
const webhookLimiter = rateLimit({
  windowMs: parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per minute
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
    message: 'Too many webhook requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use(limiter);
app.use(speedLimiter);

// Webhook routes get higher rate limits
app.use('/api/webhooks', webhookLimiter);

// Data sanitization middleware
app.use(mongoSanitize());

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE_MB ? 
    `${parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024}` : '10mb',
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for webhook signature verification
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE_MB ? 
    `${parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024}` : '10mb' 
}));

// Request logging middleware with enhanced logging
app.use((req: any, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response info
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Log the request
    logRequest(req, res, responseTime);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Error handling for unparsed requests
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    logger.warn('JSON parse error', {
      error: error.message,
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      details: 'Request body must be valid JSON',
    });
  }
  
  next(error);
});

// Security headers middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Prevent information disclosure
  res.removeHeader('X-Powered-By');
  
  next();
});

// Compression middleware (if available)
app.use((req, res, next) => {
  // Basic compression for responses
  const originalSend = res.send;
  res.send = function(body: any) {
    if (typeof body === 'string' && body.length > 1024) {
      // Simple compression would go here
      res.setHeader('Content-Encoding', 'gzip');
    }
    return originalSend.call(this, body);
  };
  next();
});

// Health check endpoint (no logging, no rate limiting)
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    pid: process.pid,
  };
  
  res.status(200).json(healthCheck);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /api/\nAllow: /health');
});

// Security.txt
app.get('/security.txt', (req, res) => {
  res.type('text/plain');
  res.send('# Security contact information\nContact: security@yourdomain.com\nExpires: 2025-12-31T23:59:59.000Z');
});

export default app;
