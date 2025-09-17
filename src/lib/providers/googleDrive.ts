// Google Drive API Service
// Handles file operations with Google Drive

import { google } from 'googleapis';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

export interface UploadResult {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
}

export class GoogleDriveService {
  private drive: any;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeDrive();
  }

  /**
   * Initialize Google Drive API client
   */
  private initializeDrive(): void {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: this.accessToken });
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string, mimeType?: string): Promise<DriveFile[]> {
    try {
      const query = `'${folderId}' in parents and trashed=false`;
      const mimeTypeQuery = mimeType ? ` and mimeType='${mimeType}'` : '';
      
      const { data } = await this.drive.files.list({
        q: query + mimeTypeQuery,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents)',
        orderBy: 'modifiedTime desc'
      });

      return data.files || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    file: File,
    folderId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      const fileMetadata = {
        name: file.name,
        parents: [folderId]
      };

      const media = {
        mimeType: file.type,
        body: file
      };

      const { data } = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, size, mimeType'
      });

      return {
        fileId: data.id,
        name: data.name,
        size: parseInt(data.size || '0'),
        mimeType: data.mimeType
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    try {
      const { data } = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      return data;
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      const { data } = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents'
      });

      return data;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Create a folder
   */
  async createFolder(name: string, parentId?: string): Promise<DriveFile> {
    try {
      const { data } = await this.drive.files.create({
        requestBody: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined
        },
        fields: 'id, name, mimeType, createdTime, modifiedTime, parents'
      });

      return data;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  /**
   * Search for files
   */
  async searchFiles(query: string, folderId?: string): Promise<DriveFile[]> {
    try {
      let searchQuery = `name contains '${query}' and trashed=false`;
      if (folderId) {
        searchQuery += ` and '${folderId}' in parents`;
      }

      const { data } = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, parents)',
        orderBy: 'modifiedTime desc'
      });

      return data.files || [];
    } catch (error) {
      console.error('Failed to search files:', error);
      throw error;
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<{
    limit: number;
    usage: number;
    usageInDrive: number;
    usageInDriveTrash: number;
  }> {
    try {
      const { data } = await this.drive.about.get({
        fields: 'storageQuota'
      });

      const quota = data.storageQuota;
      return {
        limit: parseInt(quota.limit || '0'),
        usage: parseInt(quota.usage || '0'),
        usageInDrive: parseInt(quota.usageInDrive || '0'),
        usageInDriveTrash: parseInt(quota.usageInDriveTrash || '0')
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName: string, folderId: string): Promise<boolean> {
    try {
      const files = await this.listFiles(folderId);
      return files.some(file => file.name === fileName);
    } catch (error) {
      console.error('Failed to check if file exists:', error);
      return false;
    }
  }

  /**
   * Get file by name
   */
  async getFileByName(fileName: string, folderId: string): Promise<DriveFile | null> {
    try {
      const files = await this.listFiles(folderId);
      return files.find(file => file.name === fileName) || null;
    } catch (error) {
      console.error('Failed to get file by name:', error);
      return null;
    }
  }
}
