import { supabase, supabaseServiceRole } from '../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { 
  FileUploadResult, 
  FileUploadStats,
  UploadedFileInsert 
} from '../types/database';
import {
  validateFileMetadata,
  validateFileUploadSafety,
  generateUniqueFilename,
  sanitizeFilename,
  getFileExtension,
  getFileIcon,
  formatFileSize
} from '../validation/uploadSchemas';

export class FileUploadService {
  /**
   * Upload file to Supabase Storage and create database record
   */
  static async uploadFile(
    businessId: string,
    userId: string,
    file: Express.Multer.File,
    metadata?: {
      description?: string;
      folder?: string;
      tags?: string[];
      category?: string;
      confidential?: boolean;
    }
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const fileValidation = validateFileMetadata(file);
      if (!fileValidation.isValid) {
        throw new Error(`File validation failed: ${fileValidation.errors.join(', ')}`);
      }

      // Security check
      const safetyCheck = validateFileUploadSafety(file);
      if (!safetyCheck.safe) {
        throw new Error(`File security check failed: ${safetyCheck.errors.join(', ')}`);
      }

      // Generate safe filename and path
      const safeFilename = generateUniqueFilename(file.originalname);
      const fileExtension = getFileExtension(file.originalname);
      const uploadPath = `${businessId}/${safeFilename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-files')
        .upload(uploadPath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('business-files')
        .getPublicUrl(uploadPath);

      const publicUrl = publicUrlData.publicUrl;

      // Calculate file size in MB
      const fileSizeBytes = file.size;
      const fileSizeMb = Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100;

      // Create database record
      const uploadedFileData: UploadedFileInsert = {
        business_id: businessId,
        user_id: userId,
        file_name: sanitizeFilename(file.originalname),
        file_path: uploadPath,
        file_size_bytes: fileSizeBytes,
        file_type: fileValidation.fileType,
        mime_type: file.mimetype,
        storage_bucket: 'business-files',
        public_url: publicUrl,
        metadata: {
          description: metadata?.description,
          folder: metadata?.folder,
          tags: metadata?.tags || [],
          category: metadata?.category || fileValidation.category,
          confidential: metadata?.confidential || false,
          safe_filename: safeFilename,
          file_icon: getFileIcon(file.mimetype, file.originalname),
          upload_source: 'web_upload'
        }
      };

      const { data: dbFileData, error: dbError } = await supabaseServiceRole
        .from('uploaded_files')
        .insert(uploadedFileData)
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('business-files')
          .remove([uploadPath]);

        throw new Error(`Failed to create file record: ${dbError.message}`);
      }

      // Create notification for successful upload
      const { data: notificationData, error: notificationError } = await supabaseServiceRole
        .from('notifications')
        .insert({
          business_id: businessId,
          user_id: userId,
          type: 'file_uploaded',
          title: 'File Upload Complete',
          message: `File "${file.originalname}" (${formatFileSize(fileSizeBytes)}) has been uploaded successfully.`,
          data: {
            file_name: file.originalname,
            file_size_bytes: fileSizeBytes,
            file_type: fileValidation.fileType,
            upload_path: uploadPath,
            public_url: publicUrl
          },
          action_url: `/files/${dbFileData.id}`,
          action_label: 'View File',
          priority: 'low'
        })
        .select()
        .single();

      if (notificationError) {
        console.warn('Failed to create upload notification:', notificationError.message);
      }

      return {
        file_id: dbFileData.id,
        file_name: dbFileData.file_name,
        file_path: dbFileData.file_path,
        file_size_bytes: dbFileData.file_size_bytes,
        file_size_mb: fileSizeMb,
        file_type: dbFileData.file_type!,
        mime_type: dbFileData.mime_type!,
        public_url: dbFileData.public_url!,
        notification_id: notificationData?.id || ''
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get uploaded files for a business
   */
  static async getUploadedFiles(
    businessId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      folder?: string;
      fileType?: string;
      category?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    files: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        folder,
        fileType,
        category,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      let query = supabaseServiceRole
        .from('uploaded_files')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Apply filters
      if (folder) {
        query = query.eq('metadata->folder', folder);
      }

      if (fileType) {
        query = query.eq('file_type', fileType);
      }

      if (category) {
        query = query.eq('metadata->category', category);
      }

      if (search) {
        query = query.or(`file_name.ilike.%${search}%,metadata->description.ilike.%${search}%`);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch uploaded files: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        files: data || [],
        total: count || 0,
        page,
        totalPages
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get file upload statistics for a business
   */
  static async getFileUploadStats(
    businessId: string,
    timeframe: '24h' | '7d' | '30d' | '90d' | 'all' = '30d'
  ): Promise<FileUploadStats> {
    try {
      // Calculate date filter
      let dateFilter = '';
      const now = new Date();
      
      switch (timeframe) {
        case '24h':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'all':
          dateFilter = '';
          break;
      }

      let query = supabaseServiceRole
        .from('uploaded_files')
        .select('file_type, file_size_bytes')
        .eq('business_id', businessId);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch upload statistics: ${error.message}`);
      }

      const files = data || [];
      const totalFiles = files.length;
      const totalSizeBytes = files.reduce((sum, file) => sum + file.file_size_bytes, 0);
      const totalSizeMb = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;

      // Count by file type
      const filesByType: Record<string, number> = {};
      files.forEach(file => {
        filesByType[file.file_type] = (filesByType[file.file_type] || 0) + 1;
      });

      // Get recent uploads
      const recentUploads = await supabaseServiceRole
        .from('uploaded_files')
        .select('file_name, file_size_bytes, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentList = recentUploads.data?.map(file => ({
        file_name: file.file_name,
        file_size_mb: Math.round((file.file_size_bytes / (1024 * 1024)) * 100) / 100,
        created_at: file.created_at
      })) || [];

      return {
        total_files: totalFiles,
        total_size_mb: totalSizeMb,
        files_by_type: filesByType,
        recent_uploads: recentList
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete an uploaded file
   */
  static async deleteUploadedFile(
    fileId: string,
    businessId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get file record first
      const { data: fileRecord, error: fetchError } = await supabaseServiceRole
        .from('uploaded_files')
        .select('file_path, storage_bucket')
        .eq('id', fileId)
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !fileRecord) {
        throw new Error('File not found or access denied');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(fileRecord.storage_bucket)
        .remove([fileRecord.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError.message);
      }

      // Delete database record
      const { error: dbError } = await supabaseServiceRole
        .from('uploaded_files')
        .delete()
        .eq('id', fileId)
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (dbError) {
        throw new Error(`Failed to delete file record: ${dbError.message}`);
      }

      console.log(`File ${fileId} deleted successfully`);
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get signed URL for file access
   */
  static async getSignedUrl(
    fileId: string,
    businessId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // Get file record
      const { data: fileRecord, error: fetchError } = await supabaseServiceRole
        .from('uploaded_files')
        .select('file_path, storage_bucket')
        .eq('id', fileId)
        .eq('business_id', businessId)
        .single();

      if (fetchError || !fileRecord) {
        throw new Error('File not found or access denied');
      }

      // Generate signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(fileRecord.storage_bucket)
        .createSignedUrl(fileRecord.file_path, expiresIn);

      if (signedUrlError) {
        throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get file details by ID
   */
  static async getFileById(
    fileId: string,
    businessId: string
  ): Promise<any | null> {
    try {
      const { data, error } = await supabaseServiceRole
        .from('uploaded_files')
        .select('*')
        .eq('id', fileId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // File not found
        }
        throw new Error(`Failed to fetch file: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create folder structure for file organization
   */
  static async createFolder(
    businessId: string,
    userId: string,
    folderName: string,
    description?: string
  ): Promise<{ folder_name: string; created_at: string }> {
    try {
      // Validate folder name
      const sanitizedFolderName = sanitizeFilename(folderName);
      if (!sanitizedFolderName || sanitizedFolderName.length < 1) {
        throw new Error('Invalid folder name');
      }

      // Create a placeholder file to represent the folder
      const folderPath = `${businessId}/_folders/${sanitizedFolderName}/.folder_marker`;
      
      const { error: storageError } = await supabase.storage
        .from('business-files')
        .upload(folderPath, Buffer.from(''), {
          contentType: 'application/octet-stream',
          cacheControl: '3600'
        });

      if (storageError && storageError.message !== 'The resource already exists') {
        throw new Error(`Failed to create folder: ${storageError.message}`);
      }

      // Store folder metadata in database
      const { data: folderData, error: dbError } = await supabaseServiceRole
        .from('uploaded_files')
        .insert({
          business_id: businessId,
          user_id: userId,
          file_name: `.folder_marker`,
          file_path: folderPath,
          file_size_bytes: 0,
          file_type: 'other',
          mime_type: 'application/octet-stream',
          storage_bucket: 'business-files',
          public_url: '',
          metadata: {
            is_folder: true,
            folder_name: sanitizedFolderName,
            description: description || '',
            created_by: userId,
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to create folder metadata: ${dbError.message}`);
      }

      return {
        folder_name: sanitizedFolderName,
        created_at: folderData.created_at
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
