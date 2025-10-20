import { supabase } from '../config/supabase';
import { Call } from '../types/database';

export class StorageService {
  private static readonly BUCKET_NAME = 'call-recordings';
  
  /**
   * Upload call recording file to Supabase Storage
   */
  static async uploadCallRecording(
    callId: string,
    businessId: string,
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    metadata?: any
  ): Promise<{ url: string; path: string }> {
    try {
      // Generate secure file path
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const secureFileName = `call_${callId}_${timestamp}.${fileExtension}`;
      const filePath = `${businessId}/calls/${secureFileName}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: fileType,
          duplex: 'half',
          metadata: {
            call_id: callId,
            business_id: businessId,
            uploaded_at: new Date().toISOString(),
            ...metadata
          }
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('StorageService upload error:', error);
      throw new Error('Failed to upload call recording');
    }
  }

  /**
   * Delete call recording from Supabase Storage
   */
  static async deleteCallRecording(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        throw new Error(`Storage deletion failed: ${error.message}`);
      }
    } catch (error) {
      console.error('StorageService delete error:', error);
      throw new Error('Failed to delete call recording');
    }
  }

  /**
   * Get signed URL for private file access
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Signed URL generation failed: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('StorageService signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Update call record with recording URL
   */
  static async updateCallWithRecording(
    callId: string,
    businessId: string,
    recordingUrl: string,
    recordingPath: string,
    duration?: number,
    channels?: number,
    sampleRate?: number
  ): Promise<Call> {
    try {
      const updateData: any = {
        recording_url: recordingUrl,
        metadata: {
          recording_path: recordingPath,
          recording_uploaded_at: new Date().toISOString(),
          ...(duration && { recording_duration: duration }),
          ...(channels && { recording_channels: channels }),
          ...(sampleRate && { recording_sample_rate: sampleRate })
        },
        updated_at: new Date().toISOString()
      };

      // Update duration if provided
      if (duration) {
        updateData.duration = duration;
      }

      const { data, error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('StorageService updateCallWithRecording error:', error);
      throw new Error('Failed to update call with recording');
    }
  }

  /**
   * Get file info for call recording
   */
  static async getFileInfo(filePath: string): Promise<any> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          limit: 100,
          search: filePath.split('/').pop()
        });

      if (error) {
        throw new Error(`File info retrieval failed: ${error.message}`);
      }

      return data[0];
    } catch (error) {
      console.error('StorageService getFileInfo error:', error);
      throw new Error('Failed to get file info');
    }
  }

  /**
   * Verify file access permissions for business
   */
  static async verifyFileAccess(filePath: string, businessId: string): Promise<boolean> {
    try {
      // Check if file path contains business ID
      const pathParts = filePath.split('/');
      const pathBusinessId = pathParts[pathParts.findIndex(part => part === 'calls') - 1];
      
      return pathBusinessId === businessId;
    } catch (error) {
      console.error('StorageService verifyFileAccess error:', error);
      return false;
    }
  }

  /**
   * Generate file metadata for call recording
   */
  static generateFileMetadata(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    callId: string,
    businessId: string,
    callSid?: string
  ): any {
    const fileHash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      file_name: fileName,
      file_type: fileType,
      file_size: fileBuffer.length,
      file_hash: fileHash,
      call_id: callId,
      business_id: businessId,
      call_sid: callSid,
      uploaded_at: new Date().toISOString(),
      uploaded_by: 'system' // Could be agent ID if uploaded manually
    };
  }

  /**
   * Clean up orphaned files (files without corresponding call records)
   */
  static async cleanupOrphanedFiles(businessId: string): Promise<string[]> {
    try {
      // Get all files in business call recordings folder
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`${businessId}/calls`, {
          limit: 1000
        });

      if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`);
      }

      // Get all call records for this business
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('id, recording_url')
        .eq('business_id', businessId)
        .not('recording_url', 'is', null);

      if (callsError) {
        throw new Error(`Failed to fetch calls: ${callsError.message}`);
      }

      const callIds = new Set(calls?.map(call => call.id) || []);
      const orphanedFiles: string[] = [];

      // Find orphaned files
      files?.forEach(file => {
        const fileName = file.name;
        const callId = fileName.split('_')[1]; // Extract call ID from filename
        
        if (!callIds.has(callId)) {
          orphanedFiles.push(`${businessId}/calls/${fileName}`);
        }
      });

      // Delete orphaned files
      if (orphanedFiles.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(orphanedFiles);

        if (deleteError) {
          console.warn('Failed to delete some orphaned files:', deleteError);
        }
      }

      return orphanedFiles;
    } catch (error) {
      console.error('StorageService cleanupOrphanedFiles error:', error);
      throw new Error('Failed to cleanup orphaned files');
    }
  }

  /**
   * Get storage usage statistics for business
   */
  static async getStorageStats(businessId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }> {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`${businessId}/calls`, {
          limit: 1000
        });

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      let totalSize = 0;
      const fileTypes: Record<string, number> = {};

      files?.forEach(file => {
        totalSize += file.metadata?.size || 0;
        
        const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      });

      return {
        totalFiles: files?.length || 0,
        totalSize,
        fileTypes
      };
    } catch (error) {
      console.error('StorageService getStorageStats error:', error);
      throw new Error('Failed to get storage statistics');
    }
  }

  /**
   * Create backup of call recording
   */
  static async createRecordingBackup(filePath: string, backupPath: string): Promise<string> {
    try {
      // Download original file
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(filePath);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      // Upload as backup
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(backupPath, downloadData, {
          contentType: 'audio/wav',
          duplex: 'half'
        });

      if (uploadError) {
        throw new Error(`Backup upload failed: ${uploadError.message}`);
      }

      const { data: backupUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(backupPath);

      return backupUrlData.publicUrl;
    } catch (error) {
      console.error('StorageService createRecordingBackup error:', error);
      throw new Error('Failed to create recording backup');
    }
  }
}

export default StorageService;
