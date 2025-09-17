// Google Drive Service
// Handles client-side Google Drive operations

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  bookFolderId?: string;
  bookFolderName?: string;
}

export interface DriveInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class GoogleDriveService {
  private accessToken: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get Drive storage information
   */
  async getDriveInfo(): Promise<DriveInfo> {
    const response = await this.makeDriveRequest('getInfo');
    return response;
  }

  /**
   * Create required folders for BookLever
   */
  async createRequiredFolders(): Promise<{ booksFolderId: string; highlightsFolderId: string }> {
    const response = await this.makeDriveRequest('createFolders');
    return response;
  }

  /**
   * Create a dedicated folder for a book
   */
  async createBookFolder(bookTitle: string, booksFolderId: string): Promise<{ bookFolderId: string; bookFolderName: string }> {
    const response = await this.makeDriveRequest('createBookFolder', {
      bookTitle,
      booksFolderId
    });
    return response;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    fileName: string,
    fileData: Uint8Array,
    mimeType: string,
    parentFolderId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DriveFile> {
    // Convert file data to base64
    const base64Data = this.uint8ArrayToBase64(fileData);

    const response = await this.makeDriveRequest('uploadFile', {
      fileName,
      fileData: base64Data,
      mimeType,
      parentFolderId
    });

    return response;
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string, mimeType?: string): Promise<DriveFile[]> {
    const response = await this.makeDriveRequest('listFiles', {
      folderId,
      mimeType
    });

    return response.files;
  }

  /**
   * List all books from Google Drive (metadata only, no file data)
   */
  async listBooks(): Promise<DriveFile[]> {
    try {
      // First, get the books folder ID
      const foldersResponse = await this.makeDriveRequest('listFiles', {
        folderId: 'root',
        mimeType: 'application/vnd.google-apps.folder'
      });

      // Find BookLever folder
      const bookLeverFolder = foldersResponse.files.find(
        (folder: any) => folder.name === 'BookLever'
      );

      if (!bookLeverFolder) {
        console.log('No BookLever folder found');
        return [];
      }

      // Find Books folder inside BookLever
      const booksFolderResponse = await this.makeDriveRequest('listFiles', {
        folderId: bookLeverFolder.id,
        mimeType: 'application/vnd.google-apps.folder'
      });

      const booksFolder = booksFolderResponse.files.find(
        (folder: any) => folder.name === 'Books'
      );

      if (!booksFolder) {
        console.log('No Books folder found');
        return [];
      }

      // List all files in the Books folder
      const allFiles: DriveFile[] = [];
      
      // Get all subfolders (individual book folders)
      const subfoldersResponse = await this.makeDriveRequest('listFiles', {
        folderId: booksFolder.id,
        mimeType: 'application/vnd.google-apps.folder'
      });

      // For each book folder, get the actual book files
      for (const bookFolder of subfoldersResponse.files) {
        const bookFilesResponse = await this.makeDriveRequest('listFiles', {
          folderId: bookFolder.id
        });

        // Filter for EPUB and PDF files
        const bookFiles = bookFilesResponse.files.filter((file: any) => 
          file.mimeType === 'application/epub+zip' || 
          file.mimeType === 'application/pdf'
        );

        // Add metadata about the book folder
        const bookFilesWithFolder = bookFiles.map((file: any) => ({
          ...file,
          bookFolderId: bookFolder.id,
          bookFolderName: bookFolder.name
        }));

        allFiles.push(...bookFilesWithFolder);
      }

      return allFiles;
    } catch (error) {
      console.error('Failed to list books from Google Drive:', error);
      return [];
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<Uint8Array> {
    const response = await this.makeDriveRequest('downloadFile', {
      fileId
    });

    // Convert base64 back to Uint8Array
    return this.base64ToUint8Array(response.data);
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.makeDriveRequest('deleteFile', {
      fileId
    });
  }

  /**
   * Make a request to the Drive API
   */
  private async makeDriveRequest(action: string, data?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch('/api/auth/drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: this.accessToken,
        action,
        data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Drive operation failed');
    }

    return await response.json();
  }

  /**
   * Convert Uint8Array to base64
   */
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Get MIME type for file extension
   */
  static getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'epub':
        return 'application/epub+zip';
      case 'pdf':
        return 'application/pdf';
      case 'mobi':
        return 'application/x-mobipocket-ebook';
      case 'azw':
      case 'azw3':
        return 'application/vnd.amazon.ebook';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Check if file type is supported
   */
  static isSupportedFileType(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const supportedTypes = ['epub', 'pdf', 'mobi', 'azw', 'azw3'];
    return supportedTypes.includes(extension || '');
  }

  /**
   * Convert Drive file to Book object (metadata only)
   */
  static driveFileToBook(driveFile: DriveFile): any {
    const fileType = driveFile.mimeType === 'application/epub+zip' ? 'epub' : 'pdf';
    const fileSize = driveFile.size ? parseInt(driveFile.size) : 0;
    
    // Generate a unique book ID based on Drive file ID
    const bookId = `drive-${driveFile.id}`;
    
    // Extract title from filename (remove extension)
    const title = driveFile.name.replace(/\.[^/.]+$/, '');
    
    return {
      id: bookId,
      title: title,
      author: 'Unknown Author', // Will be updated when downloaded
      cover: undefined,
      fileType: fileType,
      fileSize: fileSize,
      uploadDate: new Date(driveFile.createdTime),
      lastRead: undefined,
      progress: 0,
      totalPages: undefined,
      currentPage: undefined,
      // Drive-specific metadata
      driveFileId: driveFile.id,
      driveBookFolderId: driveFile.bookFolderId,
      driveBookFolderName: driveFile.bookFolderName,
      isFromDrive: true,
      isDownloaded: false
    };
  }
}
