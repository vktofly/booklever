// Book Upload Service
// Handles book upload, processing, and storage

import { Book } from '@/types';
import { IndexedDBService, StoredBook } from '@/lib/storage/indexedDB';
// import { GoogleDriveService } from '@/lib/providers/googleDrive';

export interface UploadProgress {
  stage: 'uploading' | 'processing' | 'storing' | 'complete';
  progress: number;
  message: string;
}

export interface UploadResult {
  book: Book;
  success: boolean;
  error?: string;
}

export class BookUploadService {
  private indexedDB: IndexedDBService;
  private maxFileSize: number = 100 * 1024 * 1024; // 100MB
  private supportedTypes: string[] = ['application/epub+zip', 'application/pdf'];

  constructor() {
    this.indexedDB = new IndexedDBService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.indexedDB.initialize();
  }

  /**
   * Upload a book file
   */
  async uploadBook(
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    driveService?: any, // Temporarily disabled GoogleDriveService
    booksFolderId?: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          book: {} as Book,
          success: false,
          error: validation.error
        };
      }

      // Update progress
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Reading file...'
      });

      // Read file data
      const fileData = await this.readFileData(file);
      
      onProgress?.({
        stage: 'processing',
        progress: 25,
        message: 'Processing book metadata...'
      });

      // Extract metadata
      const metadata = await this.extractMetadata(file, fileData);
      
      onProgress?.({
        stage: 'processing',
        progress: 50,
        message: 'Creating book record...'
      });

      // Create book object
      const book: Book = {
        id: this.generateBookId(),
        title: metadata.title,
        author: metadata.author,
        cover: metadata.cover,
        fileType: metadata.fileType,
        fileSize: file.size,
        uploadDate: new Date(),
        progress: 0,
        totalPages: metadata.totalPages
      };

      onProgress?.({
        stage: 'storing',
        progress: 75,
        message: 'Storing book locally...'
      });

      // Store locally
      const storedBook: StoredBook = {
        ...book,
        fileData,
        cachedAt: new Date(),
        lastAccessed: new Date()
      };

      await this.indexedDB.storeBook(storedBook);

      // Upload to Google Drive if service is provided (temporarily disabled)
      // if (driveService && booksFolderId) {
      //   onProgress?.({
      //     stage: 'storing',
      //     progress: 90,
      //     message: 'Uploading to Google Drive...'
      //   });

      //   try {
      //     await driveService.uploadFile(file, booksFolderId);
      //   } catch (error) {
      //     console.warn('Failed to upload to Google Drive:', error);
      //     // Continue with local storage only
      //   }
      // }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      });

      return {
        book,
        success: true
      };

    } catch (error) {
      console.error('Book upload failed:', error);
      return {
        book: {} as Book,
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`
      };
    }

    // Check file type
    if (!this.supportedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please upload EPUB or PDF files.'
      };
    }

    return { valid: true };
  }

  /**
   * Read file data
   */
  private async readFileData(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extract metadata from file
   */
  private async extractMetadata(file: File, fileData: Uint8Array): Promise<{
    title: string;
    author: string;
    cover?: string;
    fileType: 'epub' | 'pdf';
    totalPages?: number;
  }> {
    const fileType = file.type === 'application/epub+zip' ? 'epub' : 'pdf';
    
    // Basic metadata extraction
    let title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    let author = 'Unknown Author';
    let cover: string | undefined;
    let totalPages: number | undefined;

    if (fileType === 'epub') {
      try {
        // For EPUB, we could use epubjs to extract metadata
        // For now, use filename as title
        const metadata = await this.extractEPUBMetadata(fileData);
        title = metadata.title || title;
        author = metadata.author || author;
        cover = metadata.cover;
        totalPages = metadata.totalPages;
      } catch (error) {
        console.warn('Failed to extract EPUB metadata:', error);
      }
    } else if (fileType === 'pdf') {
      try {
        // For PDF, we could use PDF.js to extract metadata
        // For now, use filename as title
        const metadata = await this.extractPDFMetadata(fileData);
        title = metadata.title || title;
        author = metadata.author || author;
        totalPages = metadata.totalPages;
      } catch (error) {
        console.warn('Failed to extract PDF metadata:', error);
      }
    }

    return {
      title,
      author,
      cover,
      fileType,
      totalPages
    };
  }

  /**
   * Extract EPUB metadata
   */
  private async extractEPUBMetadata(fileData: Uint8Array): Promise<{
    title?: string;
    author?: string;
    cover?: string;
    totalPages?: number;
  }> {
    // This is a simplified implementation
    // In a real app, you'd use epubjs to extract proper metadata
    return {
      title: undefined,
      author: undefined,
      cover: undefined,
      totalPages: undefined
    };
  }

  /**
   * Extract PDF metadata
   */
  private async extractPDFMetadata(fileData: Uint8Array): Promise<{
    title?: string;
    author?: string;
    totalPages?: number;
  }> {
    // This is a simplified implementation
    // In a real app, you'd use PDF.js to extract proper metadata
    return {
      title: undefined,
      author: undefined,
      totalPages: undefined
    };
  }

  /**
   * Generate unique book ID
   */
  private generateBookId(): string {
    return `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all uploaded books
   */
  async getAllBooks(): Promise<Book[]> {
    const storedBooks = await this.indexedDB.getAllBooks();
    return storedBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      cover: book.cover,
      fileType: book.fileType,
      fileSize: book.fileSize,
      uploadDate: book.uploadDate,
      lastRead: book.lastRead,
      progress: book.progress,
      totalPages: book.totalPages,
      currentPage: book.currentPage
    }));
  }

  /**
   * Get book by ID
   */
  async getBook(bookId: string): Promise<StoredBook | null> {
    return await this.indexedDB.getBook(bookId);
  }

  /**
   * Update book progress
   */
  async updateBookProgress(bookId: string, progress: number, currentPage?: number): Promise<void> {
    const book = await this.indexedDB.getBook(bookId);
    if (book) {
      book.progress = progress;
      if (currentPage !== undefined) {
        book.currentPage = currentPage;
      }
      book.lastRead = new Date();
      await this.indexedDB.storeBook(book);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    return await this.indexedDB.getStorageStats();
  }

  /**
   * Delete a book by ID
   */
  async deleteBook(bookId: string): Promise<void> {
    console.log('BookUploadService: Deleting book with ID:', bookId);
    await this.indexedDB.deleteBook(bookId);
    console.log('BookUploadService: Book deleted successfully');
  }

  /**
   * Clean up old books
   */
  async cleanupOldBooks(maxBooks: number = 50): Promise<void> {
    await this.indexedDB.cleanupOldBooks(maxBooks);
  }
}
