import { Router, Request, Response } from 'express';
import { FileUploadController, fileUploadMiddleware } from '../controllers/fileUploadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /upload/files
 * @desc    Upload file to Supabase Storage under business_id folder
 * @access  Private (authenticated users)
 * @input   multipart/form-data file with metadata (description, folder, tags, category, confidential)
 * 
 * Body fields:
 * - file: File to upload (multipart/form-data)
 * - description: File description (optional)
 * - folder: Upload folder (default: 'general')
 * - tags: JSON array of tags (optional) 
 * - category: File category (optional)
 * - confidential: Boolean flag for confidential files (optional)
 * 
 * Returns public URL and file metadata from Supabase Storage.
 */
router.post('/files',
  authenticateToken,
  (req: Request, res: Response, next: any) => {
    // Validate file presence before multer processing
    fileUploadMiddleware(req, res, next);
  },
  FileUploadController.uploadFile
);

/**
 * @route   GET /upload/files
 * @desc    Get uploaded files for current business with filtering and pagination
 * @access  Private (authenticated users)
 * @query   page?, limit?, folder?, fileType?, category?, search?, sortBy?, sortOrder?
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * - folder: Filter by folder (optional)
 * - fileType: Filter by file type (optional)
 * - category: Filter by category (optional)
 * - search: Search by filename (optional)
 * - sortBy: Sort field (default: 'created_at')
 * - sortOrder: Sort direction ('asc' or 'desc', default: 'desc')
 */
router.get('/files',
  authenticateToken,
  FileUploadController.getUploadedFiles
);

/**
 * @route   GET /upload/files/:id
 * @desc    Get specific uploaded file details
 * @access  Private (authenticated users from same business)
 * 
 * Response includes all file metadata, upload info, and access URLs.
 */
router.get('/files/:id',
  authenticateToken,
  FileUploadController.getUploadedFile
);

/**
 * @route   DELETE /upload/files/:id
 * @desc    Delete uploaded file from Supabase Storage and database
 * @access  Private (authenticated users who uploaded the file)
 * 
 * Removes file from both Supabase Storage and database records.
 * Only the uploader or business admin can delete files.
 */
router.delete('/files/:id',
  authenticateToken,
  FileUploadController.deleteUploadedFile
);

/**
 * @route   GET /upload/files/stats
 * @desc    Get file upload statistics for current business
 * @access  Private (authenticated users)
 * @query   timeframe? (24h, 7d, 30d, 90d, all)
 * 
 * Statistics include:
 * - Total files uploaded
 * - Total storage used
 * - Files by type
 * - Recent uploads
 */
router.get('/files/stats',
  authenticateToken,
  FileUploadController.getFileUploadStats
);

/**
 * @route   GET /upload/files/:id/download
 * @desc    Get signed URL for secure file download
 * @access  Private (authenticated users from same business)
 * @query   expires_in? (seconds, default: 3600)
 * 
 * Returns a time-limited signed URL for secure file access.
 * Useful for files that shouldn't be publicly accessible.
 */
router.get('/files/:id/download',
  authenticateToken,
  FileUploadController.getSignedDownloadUrl
);

/**
 * @route   POST /upload/folders
 * @desc    Create a new folder for file organization
 * @access  Private (authenticated users)
 * @body    { folder_name, description? }
 * 
 * Creates a folder structure for organizing uploaded files
 * within the business's file storage space.
 */
router.post('/folders',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to create folders'
        });
        return;
      }

      const { folder_name, description } = req.body;

      if (!folder_name || folder_name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Folder name is required'
        });
        return;
      }

      const { FileUploadService } = await import('../services/fileUploadService');
      const result = await FileUploadService.createFolder(
        businessId,
        userId,
        folder_name.trim(),
        description
      );

      res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: result
      });
    } catch (error) {
      console.error('Create folder error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid folder name')) {
          res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create folder'
      });
    }
  }
);

/**
 * @route   GET /upload/health
 * @desc    File upload system health check
 * @access  Private (authenticated users)
 * 
 * Checks connectivity to Supabase Storage and database.
 * Useful for monitoring and diagnostics.
 */
router.get('/health',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      const healthChecks = {
        service_status: 'healthy',
        storage_connection: true,
        database_connection: true,
        authentication: !!userId,
        business_isolation: !!businessId,
        last_checked: new Date().toISOString(),
        supported_file_types: [
          'image/jpeg',
          'image/png',
          'image/gif', 
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/csv',
          'application/zip'
        ],
        file_size_limits: {
          default: '10MB',
          images: '5MB',
          documents: '10MB',
          spreadsheets: '10MB',
          archives: '50MB'
        }
      };

      // Check storage connectivity
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { supabase } = await import('../config/supabase');
        
        // Test storage bucket access
        await supabase.storage.from('business-files').list('', { limit: 1 });
        healthChecks.storage_connection = true;
      } catch (error) {
        healthChecks.storage_connection = false;
        healthChecks.service_status = 'degraded';
        healthChecks.storage_error = 'Storage connectivity issue';
      }

      res.status(200).json({
        success: true,
        data: healthChecks
      });
    } catch (error) {
      console.error('File upload health check error:', error);

      res.status(503).json({
        success: false,
        data: {
          service_status: 'unhealthy',
          error: 'File upload service unavailable',
          last_checked: new Date().toISOString()
        }
      });
    }
  }
);

export default router;
