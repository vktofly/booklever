// Cover Management Service
// Handles book cover storage, Google Images search, and cover management

import { IndexedDBService } from '@/lib/storage/indexedDB';

export interface CoverImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

export interface CoverSearchResult {
  images: CoverImage[];
  totalResults: number;
  searchQuery: string;
}

export interface BookCover {
  id: string;
  bookId: string;
  coverUrl: string;
  thumbnailUrl: string;
  source: 'upload' | 'google_images' | 'extracted' | 'default';
  uploadedAt: Date;
  isDefault: boolean;
}

export class CoverService {
  private indexedDB: IndexedDBService;
  private defaultCovers: Map<string, string> = new Map();

  constructor(indexedDB: IndexedDBService) {
    this.indexedDB = indexedDB;
    this.initializeDefaultCovers();
  }

  /**
   * Initialize default covers for different book types
   */
  private initializeDefaultCovers(): void {
    this.defaultCovers.set('epub', '/images/default-epub-cover.jpg');
    this.defaultCovers.set('pdf', '/images/default-pdf-cover.jpg');
    this.defaultCovers.set('general', '/images/default-book-cover.jpg');
  }

  /**
   * Search for book covers using Google Custom Search API
   */
  async searchBookCovers(query: string, bookType: 'epub' | 'pdf' = 'epub'): Promise<CoverSearchResult> {
    try {
      // For demo purposes, we'll use a mock service
      // In production, you'd use Google Custom Search API
      const mockResults = await this.getMockCoverResults(query, bookType);
      
      return {
        images: mockResults,
        totalResults: mockResults.length,
        searchQuery: query
      };
    } catch (error) {
      console.error('Failed to search book covers:', error);
      return {
        images: [],
        totalResults: 0,
        searchQuery: query
      };
    }
  }

  /**
   * Get mock cover results for demonstration
   */
  private async getMockCoverResults(query: string, bookType: 'epub' | 'pdf'): Promise<CoverImage[]> {
    // Mock data - in production, this would come from Google Custom Search API
    const mockCovers = [
      {
        id: 'cover-1',
        url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=300&fit=crop',
        title: `${query} - Cover 1`,
        source: 'Unsplash',
        width: 400,
        height: 600
      },
      {
        id: 'cover-2',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop',
        title: `${query} - Cover 2`,
        source: 'Unsplash',
        width: 400,
        height: 600
      },
      {
        id: 'cover-3',
        url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=300&fit=crop',
        title: `${query} - Cover 3`,
        source: 'Unsplash',
        width: 400,
        height: 600
      },
      {
        id: 'cover-4',
        url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop',
        title: `${query} - Cover 4`,
        source: 'Unsplash',
        width: 400,
        height: 600
      },
      {
        id: 'cover-5',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=200&h=300&fit=crop',
        title: `${query} - Cover 5`,
        source: 'Unsplash',
        width: 400,
        height: 600
      },
      {
        id: 'cover-6',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop',
        title: `${query} - Cover 6`,
        source: 'Unsplash',
        width: 400,
        height: 600
      }
    ];

    return mockCovers;
  }

  /**
   * Set book cover from search result
   */
  async setBookCover(bookId: string, coverImage: CoverImage): Promise<void> {
    try {
      const bookCover: BookCover = {
        id: `cover-${Date.now()}`,
        bookId,
        coverUrl: coverImage.url,
        thumbnailUrl: coverImage.thumbnailUrl,
        source: 'google_images',
        uploadedAt: new Date(),
        isDefault: false
      };

      // Store cover in IndexedDB
      await this.indexedDB.storeBookCover(bookCover);
      
      // Update book record with new cover
      const book = await this.indexedDB.getBook(bookId);
      if (book) {
        book.cover = coverImage.thumbnailUrl;
        await this.indexedDB.storeBook(book);
      }
    } catch (error) {
      console.error('Failed to set book cover:', error);
      throw error;
    }
  }

  /**
   * Upload custom cover image
   */
  async uploadCustomCover(bookId: string, file: File): Promise<void> {
    try {
      // Convert file to base64 for storage
      const base64 = await this.fileToBase64(file);
      
      const bookCover: BookCover = {
        id: `cover-${Date.now()}`,
        bookId,
        coverUrl: base64,
        thumbnailUrl: base64, // For custom uploads, use same URL
        source: 'upload',
        uploadedAt: new Date(),
        isDefault: false
      };

      // Store cover in IndexedDB
      await this.indexedDB.storeBookCover(bookCover);
      
      // Update book record with new cover
      const book = await this.indexedDB.getBook(bookId);
      if (book) {
        book.cover = base64;
        await this.indexedDB.storeBook(book);
      }
    } catch (error) {
      console.error('Failed to upload custom cover:', error);
      throw error;
    }
  }

  /**
   * Get book cover
   */
  async getBookCover(bookId: string): Promise<BookCover | null> {
    try {
      return await this.indexedDB.getBookCover(bookId);
    } catch (error) {
      console.error('Failed to get book cover:', error);
      return null;
    }
  }

  /**
   * Get default cover for book type
   */
  getDefaultCover(bookType: 'epub' | 'pdf'): string {
    return this.defaultCovers.get(bookType) || this.defaultCovers.get('general') || '';
  }

  /**
   * Reset to default cover
   */
  async resetToDefaultCover(bookId: string, bookType: 'epub' | 'pdf'): Promise<void> {
    try {
      const defaultCoverUrl = this.getDefaultCover(bookType);
      
      const bookCover: BookCover = {
        id: `cover-default-${Date.now()}`,
        bookId,
        coverUrl: defaultCoverUrl,
        thumbnailUrl: defaultCoverUrl,
        source: 'default',
        uploadedAt: new Date(),
        isDefault: true
      };

      // Store cover in IndexedDB
      await this.indexedDB.storeBookCover(bookCover);
      
      // Update book record with default cover
      const book = await this.indexedDB.getBook(bookId);
      if (book) {
        book.cover = defaultCoverUrl;
        await this.indexedDB.storeBook(book);
      }
    } catch (error) {
      console.error('Failed to reset to default cover:', error);
      throw error;
    }
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate cover search suggestions
   */
  generateSearchSuggestions(bookTitle: string, author: string): string[] {
    const suggestions = [
      bookTitle,
      `${bookTitle} ${author}`,
      `${author} ${bookTitle}`,
      bookTitle.replace(/[^\w\s]/g, ''), // Remove special characters
      author.replace(/[^\w\s]/g, ''), // Remove special characters
    ];

    // Remove duplicates and empty strings
    return [...new Set(suggestions)].filter(s => s.trim().length > 0);
  }
}
