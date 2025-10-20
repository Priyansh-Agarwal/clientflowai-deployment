import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';

// File upload configuration for call recordings
export const fileUploadConfig = {
  // Memory storage for processing
  storage: multer.memoryStorage(),
  
  // File size limits
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max for call recordings
    files: 1, // Only one file at a time
  },
  
  // File filter
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      // Check MIME type
      const validAudioTypes = [
        'audio/wav',
        'audio/mp3',
        'audio/mpeg',
        'audio/ogg',
        'audio/webm',
        'audio/flac',
        'audio/x-wav',
        'audio/audio'
      ];
      
      const mimeType = file.mimetype.toLowerCase();
      
      if (!validAudioTypes.some(type => mimeType.includes(type))) {
        return cb(new Error('Invalid file type. Only audio files (WAV, MP3, OGG, WebM, FLAC) are allowed.'));
      }
      
      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const validExtensions = ['.wav', '.mp3', '.ogg', '.webm', '.flac'];
      
      if (!validExtensions.includes(ext)) {
        return cb(new Error('Invalid file extension. Only .wav, .mp3, .ogg, .webm, .flac files are allowed.'));
      }
      
      cb(null, true);
    } catch (error) {
      cb(new Error('File validation error'));
    }
  }
};

// Multer instance for call recording uploads
export const uploadRecordingMulter = multer(fileUploadConfig);

// Twilio signature verification middleware
export function verifyTwilioSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!signature || !authToken) {
      return res.status(401).json({
        error: 'Twilio signature verification failed',
        message: 'Missing signature or authorization token'
      });
    }
    
    // Get the request URL
    const protocol = req.secure ? 'https' : 'http';
    const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
    
    // Get the request body for verification
    const body = req.body ? JSON.stringify(req.body) : '';
    
    const crypto = require('crypto');
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(url + body)
      .digest('base64');
    
    // Compare signatures
    if (signature !== computedSignature) {
      return res.status(403).json({
        error: 'Twilio signature verification failed',
        message: 'Invalid signature'
      });
    }
    
    next();
  } catch (error) {
    console.error('Twilio signature verification error:', error);
    return res.status(500).json({
      error: 'Signature verification error',
      message: 'Internal server error'
    });
  }
}

// Request, Response, NextFunction types
import { Request as ExpressRequest } from 'express';

interface Request extends ExpressRequest {
  file?: Express.Multer.File;
}

interface Response {
  status(code: number): Response;
  json(data: any): Response;
}

interface NextFunction {
  (error?: any): void;
}

// Audio metadata extraction middleware
export function extractAudioMetadata(req: Request, res: Response, next: NextFunction) {
  if (req.file) {
    try {
      // Extract metadata from audio file
      const { extractAudioMetadata } = require('../validation/callSchemas');
      const metadata = extractAudioMetadata(req.file.buffer);
      
      // Attach metadata to request
      req.file.metadata = metadata;
      
      // Add file hash for integrity checking
      req.file.hash = generateFileHash(req.file.buffer);
      
      next();
    } catch (error) {
      console.error('Audio metadata extraction error:', error);
      return res.status(400).json({
        error: 'Invalid audio file',
        message: 'Could not process audio file metadata'
      });
    }
  } else {
    next();
  }
}

// File validation middleware
export function validateCallRecording(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file provided',
      message: 'Recording file is required'
    });
  }
  
  try {
    // Validate file size
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (req.file.size > maxSize) {
      return res.status(413).json({
        error: 'File too large',
        message: 'Recording file must be less than 100MB'
      });
    }
    
    // Validate metadata exists
    if (!req.file.metadata) {
      return res.status(400).json({
        error: 'Invalid audio file',
        message: 'Could not extract audio metadata'
      });
    }
    
    // Validate duration (cannot be 0 or negative)
    if (req.file.metadata.duration <= 0) {
      return res.status(400).json({
        error: 'Invalid audio file',
        message: 'Audio file has invalid duration'
      });
    }
    
    next();
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({
      error: 'File validation error',
      message: 'Internal server error'
    });
  }
}

// Cleanup uploaded file middleware (if using disk storage)
export function cleanupUploadedFile(req: Request, res: Response, next: NextFunction) {
  // This middleware can be used to cleanup files after processing
  // Since we're using memory storage, this is mainly for future disk storage implementation
  
  req.on('end', () => {
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error('File cleanup error:', error);
      }
    }
  });
  
  next();
}

// Security middleware for uploaded files
export function sanitizeFileUpload(req: Request, res: Response, next: NextFunction) {
  if (req.file) {
    try {
      // Sanitize filename
      const { sanitizeFileName } = require('../validation/callSchemas');
      req.file.originalname = sanitizeFileName(req.file.originalname);
      
      // Generate secure filename
      const timestamp = Date.now();
      const randomHash = crypto.randomBytes(8).toString('hex');
      const extension = path.extname(req.file.originalname);
      
      req.file.filename = `call_${timestamp}_${randomHash}${extension}`;
      
      next();
    } catch (error) {
      console.error('File sanitization error:', error);
      return res.status(400).json({
        error: 'File sanitization failed',
        message: 'Could not sanitize uploaded file'
      });
    }
  } else {
    next();
  }
}

// Rate limiting for file uploads
export function uploadRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const key = `upload_${userId || req.ip}`;
  
  // Basic rate limiting - in production, use Redis or similar
  const uploadLimits = {
    perMinute: 5,
    perHour: 20,
    perDay: 50
  };
  
  try {
    // This would typically check against Redis/database
    // For now, we'll just pass through
    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next();
  }
}

// Helper function to generate file hash
export function generateFileHash(fileBuffer: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Helper function to validate audio format
export function validateAudioFormat(mimeType: string, extension: string): boolean {
  const validTypes = [
    'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg',
    'audio/webm', 'audio/flac', 'audio/x-wav', 'audio/audio'
  ];
  
  const validExtensions = ['.wav', '.mp3', '.ogg', '.webm', '.flac'];
  
  const mimeValid = validTypes.includes(mimeType.toLowerCase());
  const extValid = validExtensions.includes(extension.toLowerCase());
  
  return mimeValid && extValid;
}

export default {
  uploadRecordingMulter,
  verifyTwilioSignature,
  extractAudioMetadata,
  validateCallRecording,
  cleanupUploadedFile,
  sanitizeFileUpload,
  uploadRateLimit,
  generateFileHash,
  validateAudioFormat
};
