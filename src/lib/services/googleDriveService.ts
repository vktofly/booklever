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
  bookMetadata?: Record<string, unknown>;
  coverImageUrl?: string;
}

export interface DriveInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
}

interface DriveApiFile {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

interface DriveApiResponse {
  files: DriveApiFile[];
  nextPageToken?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class GoogleDriveService {
  private accessToken: string | null = null;
  // Removed coverCache as we now use Google Drive thumbnails directly

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
      console.log('GoogleDriveService: Starting to list books...');
      
      // First, get the books folder ID
      console.log('GoogleDriveService: Making request to list root folders...');
      const foldersResponse = await this.makeDriveRequest('listFiles', {
        folderId: 'root',
        mimeType: 'application/vnd.google-apps.folder'
      });
      console.log('GoogleDriveService: Root folders response received:', foldersResponse);

      console.log('GoogleDriveService: Root folders found:', foldersResponse.files.map((f: DriveApiFile) => f.name));

      // Find BookLever folder (case-insensitive)
      const bookLeverFolder = foldersResponse.files.find(
        (folder: DriveApiFile) => folder.name.toLowerCase() === 'booklever'
      );

      if (!bookLeverFolder) {
        console.log('GoogleDriveService: No BookLever folder found. Available folders:', foldersResponse.files.map((f: DriveApiFile) => f.name));
        return [];
      }

      console.log('GoogleDriveService: Found BookLever folder:', bookLeverFolder.name, bookLeverFolder.id);

      // Find Books folder inside BookLever (case-insensitive)
      const booksFolderResponse = await this.makeDriveRequest('listFiles', {
        folderId: bookLeverFolder.id,
        mimeType: 'application/vnd.google-apps.folder'
      });

      console.log('GoogleDriveService: Folders inside BookLever:', booksFolderResponse.files.map((f: DriveApiFile) => f.name));

      let booksFolder = booksFolderResponse.files.find(
        (folder: DriveApiFile) => folder.name.toLowerCase() === 'books'
      );

      // If no 'books' folder, try 'book' folder (alternative structure)
      if (!booksFolder) {
        booksFolder = booksFolderResponse.files.find(
          (folder: DriveApiFile) => folder.name.toLowerCase() === 'book'
        );
      }

      if (!booksFolder) {
        console.log('GoogleDriveService: No Books or Book folder found. Available folders:', booksFolderResponse.files.map((f: DriveApiFile) => f.name));
        return [];
      }

      console.log('GoogleDriveService: Found Books folder:', booksFolder.name, booksFolder.id);

      // List all files in the Books folder
      const allFiles: DriveFile[] = [];
      
      // Get all subfolders (individual book folders)
      const subfoldersResponse = await this.makeDriveRequest('listFiles', {
        folderId: booksFolder.id,
        mimeType: 'application/vnd.google-apps.folder'
      });

      console.log('GoogleDriveService: Book folders found:', subfoldersResponse.files.map((f: DriveApiFile) => f.name));

      // Check if there are individual book folders
      if (subfoldersResponse.files.length > 0) {
        // Process book folders in parallel for much faster loading
        const bookPromises = subfoldersResponse.files.map(async (bookFolder) => {
          try {
            console.log(`GoogleDriveService: Processing book folder: ${bookFolder.name}`);
            
            const bookFilesResponse = await this.makeDriveRequest('listFiles', {
              folderId: bookFolder.id
            });

            console.log(`GoogleDriveService: Files in ${bookFolder.name}:`, bookFilesResponse.files.map((f: DriveApiFile) => ({ name: f.name, mimeType: f.mimeType })));

            // Look for metadata.json file first
            const metadataFile = bookFilesResponse.files.find((file: DriveApiFile) => file.name === 'metadata.json');
            let bookMetadata = null;
            
            if (metadataFile) {
              console.log(`GoogleDriveService: Found metadata.json in ${bookFolder.name}`);
              try {
                const metadataData = await this.downloadFile(metadataFile.id);
                const metadataJson = new TextDecoder().decode(metadataData);
                bookMetadata = JSON.parse(metadataJson);
                console.log(`GoogleDriveService: Parsed metadata:`, bookMetadata);
              } catch (error) {
                console.warn(`GoogleDriveService: Failed to parse metadata.json:`, error);
              }
            }

            // Look for cover image file
            const coverFile = bookFilesResponse.files.find((file: DriveApiFile) => 
              file.name === 'cover.jpg' || 
              file.name === 'cover.png' || 
              file.name === 'cover.jpeg' ||
              file.name === 'cover.webp'
            );
            
            let coverImageUrl = null;
            if (coverFile) {
              console.log(`GoogleDriveService: Found cover image: ${coverFile.name}`);
              
              // Use Google Drive thumbnail service for much faster loading
              coverImageUrl = `https://drive.google.com/thumbnail?id=${coverFile.id}&sz=w400-h600`;
              console.log(`GoogleDriveService: Using thumbnail URL: ${coverImageUrl}`);
            } else {
              console.log(`GoogleDriveService: No cover image found in ${bookFolder.name}`);
              console.log(`GoogleDriveService: Available files:`, bookFilesResponse.files.map((f: DriveApiFile) => f.name));
            }

            // Filter for EPUB and PDF files
            const bookFiles = bookFilesResponse.files.filter((file: DriveApiFile) => 
              file.mimeType === 'application/epub+zip' || 
              file.mimeType === 'application/pdf'
            );

            console.log(`GoogleDriveService: Book files found in ${bookFolder.name}:`, bookFiles.length);

            // Add metadata about the book folder
            const bookFilesWithFolder = bookFiles.map((file: DriveApiFile) => ({
              ...file,
              bookFolderId: bookFolder.id,
              bookFolderName: bookFolder.name,
              bookMetadata: bookMetadata, // Include parsed metadata
              coverImageUrl: coverImageUrl // Include cover image URL
            }));

            return bookFilesWithFolder;
          } catch (error) {
            console.error(`GoogleDriveService: Error processing book folder ${bookFolder.name}:`, error);
            return [];
          }
        });

        // Wait for all book processing to complete
        const bookResults = await Promise.all(bookPromises);
        const allBookFiles = bookResults.flat();
        allFiles.push(...allBookFiles);
      } else {
        // No subfolders, check for books directly in the books folder
        console.log('GoogleDriveService: No book subfolders found, checking for books directly in books folder');
        
        const directFilesResponse = await this.makeDriveRequest('listFiles', {
          folderId: booksFolder.id
        });

        console.log('GoogleDriveService: Direct files in books folder:', directFilesResponse.files.map((f: DriveApiFile) => ({ name: f.name, mimeType: f.mimeType })));

        // Filter for EPUB and PDF files
        const directBookFiles = directFilesResponse.files.filter((file: DriveApiFile) => 
          file.mimeType === 'application/epub+zip' || 
          file.mimeType === 'application/pdf'
        );

        console.log('GoogleDriveService: Direct book files found:', directBookFiles.length);

        // Add metadata (no book folder info)
        const directBookFilesWithMetadata = directBookFiles.map((file: DriveApiFile) => ({
          ...file,
          bookFolderId: booksFolder.id,
          bookFolderName: booksFolder.name
        }));

        allFiles.push(...directBookFilesWithMetadata);
      }

      console.log('GoogleDriveService: Total book files found:', allFiles.length);
      return allFiles;
    } catch (error) {
      console.error('GoogleDriveService: Failed to list books from Google Drive:', error);
      console.error('GoogleDriveService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      return [];
    }
  }

  /**
   * List books with pagination for better performance with large libraries
   */
  async listBooksPaginated(pageToken?: string, pageSize: number = 20): Promise<{ files: DriveFile[], nextPageToken?: string, totalCount?: number }> {
    try {
      console.log('GoogleDriveService: Starting to list books (paginated)...', { pageToken, pageSize });
      
      // First, get the books folder ID
      console.log('GoogleDriveService: Making request to list root folders...');
      const foldersResponse = await this.makeDriveRequest('listFiles', {
        folderId: 'root',
        mimeType: 'application/vnd.google-apps.folder'
      });
      console.log('GoogleDriveService: Root folders response received:', foldersResponse);

      console.log('GoogleDriveService: Root folders found:', foldersResponse.files.map((f: DriveApiFile) => f.name));

      // Find BookLever folder (case-insensitive)
      const bookLeverFolder = foldersResponse.files.find(
        (folder: DriveApiFile) => folder.name.toLowerCase() === 'booklever'
      );

      if (!bookLeverFolder) {
        console.log('GoogleDriveService: No BookLever folder found. Available folders:', foldersResponse.files.map((f: DriveApiFile) => f.name));
        return { files: [], totalCount: 0 };
      }

      console.log('GoogleDriveService: Found BookLever folder:', bookLeverFolder.name, bookLeverFolder.id);

      // Find Books folder inside BookLever (case-insensitive)
      const booksFolderResponse = await this.makeDriveRequest('listFiles', {
        folderId: bookLeverFolder.id,
        mimeType: 'application/vnd.google-apps.folder'
      });

      console.log('GoogleDriveService: Folders inside BookLever:', booksFolderResponse.files.map((f: DriveApiFile) => f.name));

      let booksFolder = booksFolderResponse.files.find(
        (folder: DriveApiFile) => folder.name.toLowerCase() === 'books'
      );

      // If no 'books' folder, try 'book' folder (alternative structure)
      if (!booksFolder) {
        booksFolder = booksFolderResponse.files.find(
          (folder: DriveApiFile) => folder.name.toLowerCase() === 'book'
        );
      }

      if (!booksFolder) {
        console.log('GoogleDriveService: No Books or Book folder found. Available folders:', booksFolderResponse.files.map((f: DriveApiFile) => f.name));
        return { files: [], totalCount: 0 };
      }

      console.log('GoogleDriveService: Found Books folder:', booksFolder.name, booksFolder.id);

      // Get paginated subfolders (individual book folders)
      const subfoldersResponse = await this.makeDriveRequest('listFiles', {
        folderId: booksFolder.id,
        mimeType: 'application/vnd.google-apps.folder',
        pageSize: pageSize,
        pageToken: pageToken
      });

      console.log('GoogleDriveService: Book folders found (page):', subfoldersResponse.files.map((f: DriveApiFile) => f.name));

      const allFiles: DriveFile[] = [];
      
      // Check if there are individual book folders
      if (subfoldersResponse.files.length > 0) {
        // Process book folders in parallel for much faster loading
        const bookPromises = subfoldersResponse.files.map(async (bookFolder) => {
          try {
            console.log(`GoogleDriveService: Processing book folder: ${bookFolder.name}`);
            
            const bookFilesResponse = await this.makeDriveRequest('listFiles', {
              folderId: bookFolder.id
            });

            console.log(`GoogleDriveService: Files in ${bookFolder.name}:`, bookFilesResponse.files.map((f: DriveApiFile) => ({ name: f.name, mimeType: f.mimeType })));

            // Look for metadata.json file first
            const metadataFile = bookFilesResponse.files.find((file: DriveApiFile) => file.name === 'metadata.json');
            let bookMetadata = null;
            
            if (metadataFile) {
              console.log(`GoogleDriveService: Found metadata.json in ${bookFolder.name}`);
              try {
                const metadataData = await this.downloadFile(metadataFile.id);
                const metadataJson = new TextDecoder().decode(metadataData);
                bookMetadata = JSON.parse(metadataJson);
                console.log(`GoogleDriveService: Parsed metadata:`, bookMetadata);
              } catch (error) {
                console.warn(`GoogleDriveService: Failed to parse metadata.json:`, error);
              }
            }

            // Look for cover image file
            const coverFile = bookFilesResponse.files.find((file: DriveApiFile) => 
              file.name === 'cover.jpg' || 
              file.name === 'cover.png' || 
              file.name === 'cover.jpeg' ||
              file.name === 'cover.webp'
            );
            
            let coverImageUrl = null;
            if (coverFile) {
              console.log(`GoogleDriveService: Found cover image: ${coverFile.name}`);
              
              // Use Google Drive thumbnail service for much faster loading
              coverImageUrl = `https://drive.google.com/thumbnail?id=${coverFile.id}&sz=w400-h600`;
              console.log(`GoogleDriveService: Using thumbnail URL: ${coverImageUrl}`);
            } else {
              console.log(`GoogleDriveService: No cover image found in ${bookFolder.name}`);
              console.log(`GoogleDriveService: Available files:`, bookFilesResponse.files.map((f: DriveApiFile) => f.name));
            }

            // Filter for EPUB and PDF files
            const bookFiles = bookFilesResponse.files.filter((file: DriveApiFile) => 
              file.mimeType === 'application/epub+zip' || 
              file.mimeType === 'application/pdf'
            );

            console.log(`GoogleDriveService: Book files found in ${bookFolder.name}:`, bookFiles.length);

            // Add metadata about the book folder
            const bookFilesWithFolder = bookFiles.map((file: DriveApiFile) => ({
              ...file,
              bookFolderId: bookFolder.id,
              bookFolderName: bookFolder.name,
              bookMetadata: bookMetadata, // Include parsed metadata
              coverImageUrl: coverImageUrl // Include cover image URL
            }));

            return bookFilesWithFolder;
          } catch (error) {
            console.error(`GoogleDriveService: Error processing book folder ${bookFolder.name}:`, error);
            return [];
          }
        });

        // Wait for all book processing to complete
        const bookResults = await Promise.all(bookPromises);
        const allBookFiles = bookResults.flat();
        allFiles.push(...allBookFiles);
      } else {
        // No subfolders, check for books directly in the books folder
        console.log('GoogleDriveService: No book subfolders found, checking for books directly in books folder');
        
        const directFilesResponse = await this.makeDriveRequest('listFiles', {
          folderId: booksFolder.id
        });

        console.log('GoogleDriveService: Direct files in books folder:', directFilesResponse.files.map((f: DriveApiFile) => ({ name: f.name, mimeType: f.mimeType })));

        // Filter for EPUB and PDF files
        const directBookFiles = directFilesResponse.files.filter((file: DriveApiFile) => 
          file.mimeType === 'application/epub+zip' || 
          file.mimeType === 'application/pdf'
        );

        console.log('GoogleDriveService: Direct book files found:', directBookFiles.length);

        // Add metadata (no book folder info)
        const directBookFilesWithMetadata = directBookFiles.map((file: DriveApiFile) => ({
          ...file,
          bookFolderId: booksFolder.id,
          bookFolderName: booksFolder.name
        }));

        allFiles.push(...directBookFilesWithMetadata);
      }

      console.log('GoogleDriveService: Book files found in this page:', allFiles.length);
      return { 
        files: allFiles, 
        nextPageToken: subfoldersResponse.nextPageToken,
        totalCount: undefined // Google Drive doesn't provide total count easily
      };
    } catch (error) {
      console.error('GoogleDriveService: Failed to list books from Google Drive:', error);
      console.error('GoogleDriveService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      return { files: [], totalCount: 0 };
    }
  }

  /**
   * Clear cover image cache (no longer needed with Google Drive thumbnails)
   */
  clearCoverCache(): void {
    // No longer needed as we use Google Drive thumbnails directly
    console.log('GoogleDriveService: Cover cache clear called (no-op with thumbnails)');
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

    console.log(`GoogleDriveService: Making ${action} request with data:`, data);

    try {
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

      console.log(`GoogleDriveService: ${action} response status:`, response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`GoogleDriveService: ${action} failed:`, errorData);
        throw new Error(errorData.error || 'Drive operation failed');
      }

      const result = await response.json();
      console.log(`GoogleDriveService: ${action} success:`, result);
      return result;
    } catch (error) {
      console.error(`GoogleDriveService: ${action} error:`, error);
      throw error;
    }
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
    
    // Use metadata if available, otherwise fall back to filename
    const metadata = (driveFile as any).bookMetadata;
    const title = metadata?.title || driveFile.name.replace(/\.[^/.]+$/, '');
    const author = metadata?.author || 'Unknown Author';
    
    // Prioritize Google Drive cover URL over metadata cover (which might be blob URLs)
    const cover = (driveFile as any).coverImageUrl || metadata?.cover || undefined;
    
    console.log(`GoogleDriveService: Converting book "${title}" - metadata cover:`, metadata?.cover);
    console.log(`GoogleDriveService: Converting book "${title}" - drive cover:`, (driveFile as any).coverImageUrl);
    console.log(`GoogleDriveService: Converting book "${title}" - final cover:`, cover);
    
    return {
      id: bookId,
      title: title,
      author: author,
      cover: cover,
      fileType: fileType,
      fileSize: fileSize,
      uploadDate: new Date(driveFile.createdTime),
      lastRead: undefined,
      progress: 0,
      totalPages: undefined,
      currentPage: undefined,
      // Phase 1: Enhanced metadata fields
      rating: undefined,
      priority: 'normal',
      status: 'unread',
      collections: [],
      tags: [],
      notes: undefined,
      isFavorite: false,
      // Drive-specific metadata
      driveFileId: driveFile.id,
      driveBookFolderId: driveFile.bookFolderId,
      driveBookFolderName: driveFile.bookFolderName,
      isFromDrive: true,
      isDownloaded: false,
      metadata: {
        isbn: undefined,
        publisher: undefined,
        publicationDate: undefined,
        language: undefined,
        description: undefined,
        genre: undefined,
        series: undefined,
        volume: undefined
      }
    };
  }
}
