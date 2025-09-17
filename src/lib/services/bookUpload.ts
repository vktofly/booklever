// Book Upload Service
// Handles book upload, processing, and storage

import { Book } from '@/types';
import { IndexedDBService, StoredBook } from '@/lib/storage/indexedDB';
import { GoogleDriveService } from '@/lib/services/googleDriveService';
import { CoverManager } from './coverManager';

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
  private coverManager: CoverManager;
  private maxFileSize: number = 100 * 1024 * 1024; // 100MB
  private supportedTypes: string[] = ['application/epub+zip', 'application/pdf'];

  constructor() {
    this.indexedDB = new IndexedDBService();
    this.coverManager = new CoverManager();
  }

  /**
   * Set the current user for account-specific storage
   */
  setCurrentUser(userId: string | null): void {
    this.indexedDB.setCurrentUser(userId);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.indexedDB.initialize();
    await this.coverManager.initialize();
  }

  /**
   * Upload a book file
   */
  async uploadBook(
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    driveService?: GoogleDriveService,
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
        cover: undefined, // Will be set after cover extraction
        fileType: metadata.fileType,
        fileSize: file.size,
        uploadDate: new Date(),
        progress: 0,
        totalPages: metadata.totalPages,
        // Phase 1: Enhanced metadata fields
        rating: undefined,
        priority: 'normal',
        status: 'unread',
        collections: [],
        tags: [],
        notes: undefined,
        isFavorite: false,
        isFromDrive: true, // All uploads go to Drive
        isDownloaded: false, // Will be downloaded when clicked
        metadata: {
          isbn: metadata.isbn,
          publisher: metadata.publisher,
          publicationDate: metadata.publicationDate,
          language: metadata.language,
          description: metadata.description,
          genre: metadata.genre,
          series: metadata.series,
          volume: metadata.volume
        }
      };

      onProgress?.({
        stage: 'processing',
        progress: 60,
        message: 'Extracting book cover...'
      });

      // Extract and store cover
      const coverResult = await this.coverManager.extractAndStoreCover(book, fileData);
      book.cover = coverResult.thumbnailUrl;

      onProgress?.({
        stage: 'storing',
        progress: 75,
        message: 'Uploading to Google Drive...'
      });

      // Upload directly to Google Drive (no local storage)
      if (!driveService || !booksFolderId) {
        throw new Error('Google Drive service is required for book uploads');
      }

      onProgress?.({
        stage: 'storing',
        progress: 85,
        message: 'Creating book folder in Google Drive...'
      });

      // Create dedicated folder for this book
      const bookFolder = await driveService.createBookFolder(book.title, booksFolderId);
      
      onProgress?.({
        stage: 'storing',
        progress: 90,
        message: 'Uploading book to Google Drive...'
      });

      // Upload the book file
      const mimeType = GoogleDriveService.getMimeType(file.name);
      
      await driveService.uploadFile(
        `book.${file.name.split('.').pop()}`,
        fileData,
        mimeType,
        bookFolder.bookFolderId
      );

      // Upload cover if available
      if (book.cover && coverResult.coverUrl) {
        onProgress?.({
          stage: 'storing',
          progress: 95,
          message: 'Uploading book cover...'
        });

        try {
          // Convert cover URL to blob and upload
          const coverResponse = await fetch(coverResult.coverUrl);
          const coverBlob = await coverResponse.blob();
          const coverArrayBuffer = await coverBlob.arrayBuffer();
          const coverData = new Uint8Array(coverArrayBuffer);
          
          await driveService.uploadFile(
            'cover.jpg',
            coverData,
            'image/jpeg',
            bookFolder.bookFolderId
          );
        } catch (coverError) {
          console.warn('Failed to upload cover:', coverError);
        }
      }

      // Upload metadata
      const metadataJson = JSON.stringify({
        title: book.title,
        author: book.author,
        fileType: book.fileType,
        fileSize: book.fileSize,
        uploadDate: book.uploadDate.toISOString(),
        totalPages: book.totalPages,
        cover: book.cover,
        // Include Phase 1 metadata
        rating: book.rating,
        priority: book.priority,
        status: book.status,
        collections: book.collections,
        tags: book.tags,
        notes: book.notes,
        isFavorite: book.isFavorite,
        isFromDrive: book.isFromDrive,
        isDownloaded: book.isDownloaded,
        metadata: book.metadata
      }, null, 2);

      const metadataData = new TextEncoder().encode(metadataJson);
      await driveService.uploadFile(
        'metadata.json',
        metadataData,
        'application/json',
        bookFolder.bookFolderId
      );

      console.log(`Book "${book.title}" uploaded to Google Drive folder: ${bookFolder.bookFolderName}`);

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
    fileType: 'epub' | 'pdf';
    totalPages?: number;
  }> {
    const fileType = file.type === 'application/epub+zip' ? 'epub' : 'pdf';
    
    // Basic metadata extraction
    let title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    let author = 'Unknown Author';
    let totalPages: number | undefined;

    try {
      // Use cover manager to extract metadata
      if (fileType === 'epub') {
        const metadata = await this.coverManager['coverExtractor'].extractEPUBMetadata(fileData);
        title = metadata.title || title;
        author = metadata.author || author;
        totalPages = metadata.totalPages;
      } else {
        const metadata = await this.coverManager['coverExtractor'].extractPDFMetadata(fileData);
        title = metadata.title || title;
        author = metadata.author || author;
        totalPages = metadata.totalPages;
      }
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
    }

    return {
      title,
      author,
      fileType,
      totalPages
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

  /**
   * Upload highlights to Google Drive for a specific book
   */
  async uploadHighlights(
    bookId: string,
    highlights: any[],
    driveService: GoogleDriveService,
    booksFolderId: string
  ): Promise<void> {
    try {
      // Get book info to find the book folder
      const book = await this.indexedDB.getBook(bookId);
      if (!book) {
        throw new Error('Book not found');
      }

      // Create book folder if it doesn't exist
      const bookFolder = await driveService.createBookFolder(book.title, booksFolderId);
      
      // Upload highlights as JSON
      const highlightsJson = JSON.stringify(highlights, null, 2);
      const highlightsData = new TextEncoder().encode(highlightsJson);
      
      await driveService.uploadFile(
        'highlights.json',
        highlightsData,
        'application/json',
        bookFolder.bookFolderId
      );

      console.log(`Highlights uploaded for book "${book.title}"`);
    } catch (error) {
      console.error('Failed to upload highlights:', error);
      throw error;
    }
  }

  /**
   * Clear all data for the current user (useful when switching accounts)
   */
  async clearUserData(): Promise<void> {
    await this.indexedDB.clearUserData();
  }

  // ===== COLLECTIONS MANAGEMENT =====

  /**
   * Create a new collection
   */
  async createCollection(collection: Omit<Collection, 'id' | 'bookCount' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
    return await this.indexedDB.createCollection(collection);
  }

  /**
   * Get all collections
   */
  async getAllCollections(): Promise<Collection[]> {
    return await this.indexedDB.getAllCollections();
  }

  /**
   * Update a collection
   */
  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
    return await this.indexedDB.updateCollection(id, updates);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(id: string): Promise<void> {
    return await this.indexedDB.deleteCollection(id);
  }

  // ===== TAGS MANAGEMENT =====

  /**
   * Create or get a tag
   */
  async createOrGetTag(name: string, color?: string): Promise<Tag> {
    return await this.indexedDB.createOrGetTag(name, color);
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<Tag[]> {
    return await this.indexedDB.getAllTags();
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    return await this.indexedDB.deleteTag(id);
  }

  // ===== BOOK METADATA EDITING =====

  /**
   * Update book metadata
   */
  async updateBookMetadata(bookId: string, updates: BookEditData): Promise<Book | null> {
    try {
      const book = await this.indexedDB.getBook(bookId);
      if (!book) {
        throw new Error('Book not found');
      }

      const updatedBook = {
        ...book,
        ...updates,
        // Handle collections and tags specially
        collections: updates.collections || book.collections,
        tags: updates.tags || book.tags,
        // Update metadata if provided
        metadata: updates.metadata ? { ...book.metadata, ...updates.metadata } : book.metadata
      };

      await this.indexedDB.storeBook(updatedBook);
      console.log('Book metadata updated:', bookId);
      
      return updatedBook;
    } catch (error) {
      console.error('Failed to update book metadata:', error);
      throw error;
    }
  }

  /**
   * Add book to collection
   */
  async addBookToCollection(bookId: string, collectionId: string): Promise<void> {
    const book = await this.indexedDB.getBook(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const collections = book.collections || [];
    if (!collections.includes(collectionId)) {
      collections.push(collectionId);
      await this.updateBookMetadata(bookId, { collections });
    }
  }

  /**
   * Remove book from collection
   */
  async removeBookFromCollection(bookId: string, collectionId: string): Promise<void> {
    const book = await this.indexedDB.getBook(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const collections = (book.collections || []).filter(id => id !== collectionId);
    await this.updateBookMetadata(bookId, { collections });
  }

  /**
   * Add tags to book
   */
  async addTagsToBook(bookId: string, tagNames: string[]): Promise<void> {
    const book = await this.indexedDB.getBook(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    // Create tags if they don't exist
    for (const tagName of tagNames) {
      await this.createOrGetTag(tagName);
    }

    const existingTags = book.tags || [];
    const newTags = [...new Set([...existingTags, ...tagNames])];
    await this.updateBookMetadata(bookId, { tags: newTags });
  }

  /**
   * Remove tags from book
   */
  async removeTagsFromBook(bookId: string, tagNames: string[]): Promise<void> {
    const book = await this.indexedDB.getBook(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const tags = (book.tags || []).filter(tag => !tagNames.includes(tag));
    await this.updateBookMetadata(bookId, { tags });
  }

  // ===== ADVANCED SEARCH =====

  /**
   * Search books with advanced filters
   */
  async searchBooks(filters: SearchFilters, options?: SearchOptions): Promise<Book[]> {
    try {
      let books = await this.getAllBooksWithDrive();

      // Apply filters
      if (filters.query) {
        const query = filters.query.toLowerCase();
        books = books.filter(book => 
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.tags?.some(tag => tag.toLowerCase().includes(query)) ||
          book.notes?.toLowerCase().includes(query) ||
          book.metadata?.description?.toLowerCase().includes(query)
        );
      }

      if (filters.collections && filters.collections.length > 0) {
        books = books.filter(book => 
          book.collections?.some(collectionId => filters.collections!.includes(collectionId))
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        books = books.filter(book => 
          book.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters.fileTypes && filters.fileTypes.length > 0) {
        books = books.filter(book => filters.fileTypes!.includes(book.fileType));
      }

      if (filters.status && filters.status.length > 0) {
        books = books.filter(book => book.status && filters.status!.includes(book.status));
      }

      if (filters.rating) {
        books = books.filter(book => book.rating && book.rating >= filters.rating!);
      }

      if (filters.isFavorite !== undefined) {
        books = books.filter(book => book.isFavorite === filters.isFavorite);
      }

      if (filters.isFromDrive !== undefined) {
        books = books.filter(book => book.isFromDrive === filters.isFromDrive);
      }

      if (filters.isDownloaded !== undefined) {
        books = books.filter(book => book.isDownloaded === filters.isDownloaded);
      }

      if (filters.priority && filters.priority.length > 0) {
        books = books.filter(book => book.priority && filters.priority!.includes(book.priority));
      }

      if (filters.author) {
        books = books.filter(book => 
          book.author.toLowerCase().includes(filters.author!.toLowerCase())
        );
      }

      if (filters.genre) {
        books = books.filter(book => 
          book.metadata?.genre?.toLowerCase().includes(filters.genre!.toLowerCase())
        );
      }

      if (filters.dateRange) {
        books = books.filter(book => {
          const uploadDate = new Date(book.uploadDate);
          return uploadDate >= filters.dateRange!.start && uploadDate <= filters.dateRange!.end;
        });
      }

      if (filters.fileSizeRange) {
        books = books.filter(book => 
          book.fileSize >= filters.fileSizeRange!.min && book.fileSize <= filters.fileSizeRange!.max
        );
      }

      // Apply sorting
      if (options?.sortBy) {
        books.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (options.sortBy) {
            case 'title':
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
              break;
            case 'author':
              aValue = a.author.toLowerCase();
              bValue = b.author.toLowerCase();
              break;
            case 'uploadDate':
              aValue = new Date(a.uploadDate).getTime();
              bValue = new Date(b.uploadDate).getTime();
              break;
            case 'lastRead':
              aValue = a.lastRead ? new Date(a.lastRead).getTime() : 0;
              bValue = b.lastRead ? new Date(b.lastRead).getTime() : 0;
              break;
            case 'progress':
              aValue = a.progress;
              bValue = b.progress;
              break;
            case 'rating':
              aValue = a.rating || 0;
              bValue = b.rating || 0;
              break;
            case 'fileSize':
              aValue = a.fileSize;
              bValue = b.fileSize;
              break;
            default:
              return 0;
          }

          if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
          if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Apply pagination
      if (options?.limit) {
        const offset = options.offset || 0;
        books = books.slice(offset, offset + options.limit);
      }

      return books;
    } catch (error) {
      console.error('Failed to search books:', error);
      return [];
    }
  }

  /**
   * Get all books (Drive only - no local storage)
   */
  async getAllBooksWithDrive(driveService?: GoogleDriveService): Promise<Book[]> {
    try {
      if (!driveService) {
        console.warn('BookUploadService: No Google Drive service available');
        return [];
      }

      console.log('BookUploadService: Getting books from Google Drive...');
      
      // Get remote books from Google Drive only
      const driveFiles = await driveService.listBooks();
      console.log('BookUploadService: Drive files returned:', driveFiles.length);
      
      const remoteBooks = driveFiles.map(file => GoogleDriveService.driveFileToBook(file));

      console.log('BookUploadService: Converted to books:', remoteBooks.length);
      console.log('BookUploadService: Book details:', remoteBooks.map(b => ({ id: b.id, title: b.title, isFromDrive: b.isFromDrive })));
      
      return remoteBooks;
    } catch (error) {
      console.error('BookUploadService: Failed to get books from Drive:', error);
      return [];
    }
  }

  /**
   * Download book from Google Drive and store locally
   */
  async downloadBookFromDrive(
    bookId: string, 
    driveService: GoogleDriveService,
    onProgress?: (progress: number) => void
  ): Promise<StoredBook | null> {
    try {
      console.log('Downloading book from Drive:', bookId);
      
      // Extract Drive file ID from book ID
      const driveFileId = bookId.replace('drive-', '');
      
      // Download file data
      onProgress?.(10);
      const fileData = await driveService.downloadFile(driveFileId);
      onProgress?.(50);
      
      // Get book metadata
      const driveFiles = await driveService.listBooks();
      const driveFile = driveFiles.find(file => file.id === driveFileId);
      
      if (!driveFile) {
        throw new Error('Book not found in Google Drive');
      }
      
      // Convert to Book object
      const book = GoogleDriveService.driveFileToBook(driveFile);
      book.isDownloaded = true;
      
      // Extract metadata from file data
      const metadata = await this.extractMetadata(
        new File([fileData], driveFile.name, { type: driveFile.mimeType }),
        fileData
      );
      
      book.title = metadata.title;
      book.author = metadata.author;
      book.totalPages = metadata.totalPages;
      
      onProgress?.(80);
      
      // Extract and store cover
      const coverResult = await this.coverManager.extractAndStoreCover(book, fileData);
      book.cover = coverResult.thumbnailUrl;
      
      onProgress?.(90);
      
      // Store locally
      const storedBook: StoredBook = {
        ...book,
        fileData,
        cachedAt: new Date(),
        lastAccessed: new Date()
      };
      
      await this.indexedDB.storeBook(storedBook);
      
      onProgress?.(100);
      console.log('Book downloaded and stored successfully:', book.title);
      
      return storedBook;
    } catch (error) {
      console.error('Failed to download book from Drive:', error);
      throw error;
    }
  }
}
