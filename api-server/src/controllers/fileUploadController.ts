import { Request, Response } from 'express';
import multer from 'multer';
import { FileUploadService } from '../services/fileUploadService';
import { 
  validateFileMetadata, 
  validateFileUploadSafety,
  generateUniqueFilename,
  sanitizeFilename
} from '../validation/uploadSchemas';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fileFilter: (req, file, cb) => {
      // Basic mime type validation
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed'
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not supported'), false);
      }
    }
  }
});

export class FileUploadController {
  /**
   * POST /upload/files - Upload file to Supabase Storage
   */
  static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      // Validate file presence
      if (!req.file) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'No file provided for upload'
        });
        return;
      }

      const file = req.file;
      
      // Get metadata from request body
      const {
        description,
        folder = 'general',
        tags,
        category,
        confidential = false
      } = req.body;

      // Parse tags if provided as string
      let parsedTags: string[] = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (error) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Invalid tags format. Expected JSON array.'
          });
          return;
        }
      }

      // Validate file metadata
      const fileValidation = validateFileMetadata(file);
      if (!fileValidation.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          message: fileValidation.errors.join(', ')
        });
        return;
      }

      // Security validation
      const safetyCheck = validateFileUploadSafety(file);
      if (!safetyCheck.safe) {
        res.status(400).json({
          error: 'Security validation failed',
          message: safetyCheck.errors.join(', '),
          warnings: safetyCheck.warnings
        });
        return;
      }

      // Upload file to Supabase Storage
      const uploadResult = await FileUploadService.uploadFile(
        businessId,
        userId,
        file,
        {
          description,
          folder,
          tags: parsedTags,
          category,
          confidential: confidential === 'true' || confidential === true
        }
      );

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          file_id: uploadResult.file_id,
          file_name: uploadResult.file_name,
          file_path: uploadResult.file_path,
          file_size_bytes: uploadResult.file_size_bytes,
          file_size_mb: uploadResult.file_size_mb,
          file_type: uploadResult.file_type,
          mime_type: uploadResult.mime_type,
          public_url: uploadResult.public_url,
          notification_id: uploadResult.notification_id,
          upload_url: `/api/upload/files/${uploadResult.file_id}`,
          download_url: uploadResult.public_url
        },
        metadata: {
          uploaded_at: new Date().toISOString(),
          uploaded_by: userId,
          business_id: businessId
        }
      });
    } catch (error) {
      console.error('File upload error:', error);

      if (error instanceof Error) {
        if (error.message.includes('File validation failed')) {
          res.status(400).json({
            error: 'Validation failed',
            message: error.message
          });
          return;
        }
        if (error.message.includes('File security check failed')) {
          res.status(400).json({
            error: 'Security check failed',
            message: error.message
          });
          return;
        }
        if (error.message.includes('upload file to storage')) {
          res.status(500).json({
            error: 'Storage error',
            message: 'Failed to upload file to storage'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to upload file'
      });
    }
  }

  /**
   * GET /upload/files - Get uploaded files for business
   */
  static async getUploadedFiles(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        folder,
        fileType,
        category,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        folder: folder as string,
        fileType: fileType as string,
        category: category as string,
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await FileUploadService.getUploadedFiles(
        businessId,
        userId,
        options
      );

      res.status(200).json({
        success: true,
        data: {
          files: result.files,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          pagination: {
            current_page: result.page,
            total_pages: result.totalPages,
            total_count: result.total,
            per_page: options.limit,
            has_next: result.page < result.totalPages,
            has_prev: result.page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get uploaded files error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch uploaded files'
      });
    }
  }

  /**
   * GET /upload/files/:id - Get specific uploaded file
   */
  static async getUploadedFile(req: Request, res: Response): Promise<void> {
    try {
      const { id: fileId } = req.params;
      const businessId = req.businessId!;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fileId)) {
        res.status(400).json({
          error: 'Invalid file ID',
          message: 'File ID must be a valid UUID'
        });
        return;
      }

      const file = await FileUploadService.getFileById(fileId, businessId);

      if (!file) {
        res.status(404).json({
          error: 'Not found',
          message: 'File not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: file
      });
    } catch (error) {
      console.error('Get file error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch file details'
      });
    }
  }

  /**
   * DELETE /upload/files/:id - Delete uploaded file
   */
  static async deleteUploadedFile(req: Request, res: Response): Promise<void> {
    try {
      const { id: fileId } = req.params;
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fileId)) {
        res.status(400).json({
          error: 'Invalid file ID',
          message: 'File ID must be a valid UUID'
        });
        return;
      }

      await FileUploadService.deleteUploadedFile(fileId, businessId, userId);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Delete file error:', error);

      if (error instanceof Error) {
        if (error.message.includes('File not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete file'
      });
    }
  }

  /**
   * GET /upload/files/stats - Get file upload statistics
   */
  static async getFileUploadStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const timeframe = (req.query.timeframe as string) || '30d';

      if (!['24h', '7d', '30d', '90d', 'all'].includes(timeframe)) {
        res.status(400).json({
          error: 'Invalid timeframe',
          message: 'Timeframe must be one of: 24h, 7d, 30d, 90d, all'
        });
        return;
      }

      const stats = await FileUploadService.getFileUploadStats(businessId, timeframe as any);

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          timeframe,
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get file stats error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch file upload statistics'
      });
    }
  }

  /**
   * GET /upload/files/:id/download - Get signed URL for file download
   */
  static async getSignedDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { id: fileId } = req.params;
      const businessId = req.businessId!;
      const expiresIn = parseInt(req.query.expires_in as string) || 3600; // Default 1 hour

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(fileId)) {
        res.status(400).json({
          error: 'Invalid file ID',
          message: 'File ID must be a valid UUID'
        });
        return;
      }

      const signedUrl = await FileUploadService.getSignedUrl(fileId, businessId, expiresIn);

      res.status(200).json({
        success: true,
        data: {
          download_url: signedUrl,
          expires_in: expiresIn,
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          file_id: fileId
        }
      });
    } catch (error) {
      console.error('Get signed URL error:', error);

      if (error instanceof Error) {
        if (error.message.includes('File not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate download URL'
      });
    }
  }
}

// Middleware function for file upload
export const fileUploadMiddleware = upload.single('file');

export { upload };
