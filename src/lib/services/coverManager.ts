// Cover Manager Service
// Comprehensive service for managing book covers including extraction, storage, and fallbacks

import { Book } from '@/types';
import { CoverExtractor, CoverExtractionResult } from './coverExtractor';
import { CoverStorageService } from './coverStorage';
import { IndexedDBService } from '@/lib/storage/indexedDB';
import { GoogleDriveService } from './googleDriveService';

export interface CoverManagerResult {
  coverUrl: string;
  thumbnailUrl: string;
  isDefault: boolean;
  source: 'extracted' | 'default' | 'cached';
}

export class CoverManager {
  private coverExtractor: CoverExtractor;
  private coverStorage: CoverStorageService;
  private indexedDB: IndexedDBService;
  private driveService: GoogleDriveService | null = null;

  constructor() {
    this.coverExtractor = new CoverExtractor();
    this.coverStorage = new CoverStorageService();
    this.indexedDB = new IndexedDBService();
  }

  /**
   * Set Google Drive service for cloud cover management
   */
  setDriveService(driveService: GoogleDriveService): void {
    this.driveService = driveService;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.coverStorage.initialize();
    await this.indexedDB.initialize();
  }

  /**
   * Search for book covers (mock implementation using Unsplash)
   */
  async searchBookCovers(query: string): Promise<string[]> {
    try {
      // Mock search using Unsplash API for book covers
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=portrait`,
        {
          headers: {
            'Authorization': 'Client-ID YOUR_UNSPLASH_ACCESS_KEY' // This would need to be configured
          }
        }
      );
      
      if (!response.ok) {
        // Fallback to mock data if API fails
        return this.getMockCoverUrls(query);
      }
      
      const data = await response.json();
      return data.results.map((photo: { urls: { regular: string } }) => photo.urls.regular);
    } catch (error) {
      console.warn('Cover search failed, using mock data:', error);
      return this.getMockCoverUrls(query);
    }
  }

  /**
   * Get mock cover URLs for testing
   */
  private getMockCoverUrls(query: string): string[] {
    const mockCovers = [
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop'
    ];
    
    // Return different sets based on query to simulate search results
    const index = Math.abs(query.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % mockCovers.length;
    return mockCovers.slice(index).concat(mockCovers.slice(0, index));
  }

  /**
   * Get or create cover for a book
   */
  async getBookCover(book: Book): Promise<CoverManagerResult> {
    try {
      // First, check if we have a stored cover
      const storedCover = await this.coverStorage.getCover(book.id);
      if (storedCover) {
        return {
          coverUrl: storedCover.coverUrl,
          thumbnailUrl: storedCover.thumbnailUrl,
          isDefault: storedCover.isDefault,
          source: 'cached'
        };
      }

      // If no stored cover, try to extract from book file
      const bookData = await this.indexedDB.getBook(book.id);
      if (bookData && bookData.fileData) {
        let coverResult: CoverExtractionResult | null = null;

        if (book.fileType === 'epub') {
          coverResult = await this.coverExtractor.extractEPUBCover(bookData.fileData);
        } else if (book.fileType === 'pdf') {
          coverResult = await this.coverExtractor.extractPDFCover(bookData.fileData);
        }

        if (coverResult) {
          // Store the extracted cover
          await this.coverStorage.storeCover(book.id, coverResult, false);
          
          return {
            coverUrl: coverResult.coverUrl,
            thumbnailUrl: coverResult.thumbnailUrl,
            isDefault: false,
            source: 'extracted'
          };
        }
      }

      // If extraction failed, generate default cover
      const defaultCover = await this.coverExtractor.generateDefaultCover(book);
      await this.coverStorage.storeCover(book.id, defaultCover, true);
      
      return {
        coverUrl: defaultCover.coverUrl,
        thumbnailUrl: defaultCover.thumbnailUrl,
        isDefault: true,
        source: 'default'
      };

    } catch (error) {
      console.error('Failed to get book cover:', error);
      
      // Fallback to default cover
      const defaultCover = await this.coverExtractor.generateDefaultCover(book);
      await this.coverStorage.storeCover(book.id, defaultCover, true);
      
      return {
        coverUrl: defaultCover.coverUrl,
        thumbnailUrl: defaultCover.thumbnailUrl,
        isDefault: true,
        source: 'default'
      };
    }
  }

  /**
   * Extract and store cover for a book during upload
   */
  async extractAndStoreCover(book: Book, fileData: Uint8Array): Promise<CoverManagerResult> {
    try {
      let coverResult: CoverExtractionResult | null = null;

      // Extract cover based on file type
      if (book.fileType === 'epub') {
        coverResult = await this.coverExtractor.extractEPUBCover(fileData);
      } else if (book.fileType === 'pdf') {
        coverResult = await this.coverExtractor.extractPDFCover(fileData);
      }

      if (coverResult) {
        // Store the extracted cover
        await this.coverStorage.storeCover(book.id, coverResult, false);
        
        return {
          coverUrl: coverResult.coverUrl,
          thumbnailUrl: coverResult.thumbnailUrl,
          isDefault: false,
          source: 'extracted'
        };
      }

      // If extraction failed, generate default cover
      const defaultCover = await this.coverExtractor.generateDefaultCover(book);
      await this.coverStorage.storeCover(book.id, defaultCover, true);
      
      return {
        coverUrl: defaultCover.coverUrl,
        thumbnailUrl: defaultCover.thumbnailUrl,
        isDefault: true,
        source: 'default'
      };

    } catch (error) {
      console.error('Failed to extract cover during upload:', error);
      
      // Fallback to default cover
      const defaultCover = await this.coverExtractor.generateDefaultCover(book);
      await this.coverStorage.storeCover(book.id, defaultCover, true);
      
      return {
        coverUrl: defaultCover.coverUrl,
        thumbnailUrl: defaultCover.thumbnailUrl,
        isDefault: true,
        source: 'default'
      };
    }
  }

  /**
   * Update cover for a book
   */
  async updateBookCover(bookId: string, newCoverResult: CoverExtractionResult): Promise<CoverManagerResult> {
    try {
      await this.coverStorage.updateCover(bookId, newCoverResult, false);
      
      return {
        coverUrl: newCoverResult.coverUrl,
        thumbnailUrl: newCoverResult.thumbnailUrl,
        isDefault: false,
        source: 'extracted'
      };
    } catch (error) {
      console.error('Failed to update book cover:', error);
      throw error;
    }
  }

  /**
   * Set default cover for a book
   */
  async setDefaultCover(book: Book): Promise<CoverManagerResult> {
    try {
      const defaultCover = await this.coverExtractor.generateDefaultCover(book);
      await this.coverStorage.updateCover(book.id, defaultCover, true);
      
      return {
        coverUrl: defaultCover.coverUrl,
        thumbnailUrl: defaultCover.thumbnailUrl,
        isDefault: true,
        source: 'default'
      };
    } catch (error) {
      console.error('Failed to set default cover:', error);
      throw error;
    }
  }

  /**
   * Delete cover for a book
   */
  async deleteBookCover(bookId: string): Promise<void> {
    try {
      const storedCover = await this.coverStorage.getCover(bookId);
      if (storedCover) {
        await this.coverStorage.deleteCover(storedCover.id);
      }
    } catch (error) {
      console.error('Failed to delete book cover:', error);
      throw error;
    }
  }

  /**
   * Get cover thumbnail URL for display
   */
  async getCoverThumbnail(book: Book): Promise<string> {
    const coverResult = await this.getBookCover(book);
    return coverResult.thumbnailUrl;
  }

  /**
   * Get full cover URL for detailed view
   */
  async getCoverImage(book: Book): Promise<string> {
    const coverResult = await this.getBookCover(book);
    return coverResult.coverUrl;
  }

  /**
   * Set a custom cover for a book
   */
  async setCustomCover(bookId: string, coverUrl: string, source: 'google_images' | 'upload' | 'default'): Promise<CoverManagerResult> {
    const coverResult: CoverExtractionResult = {
      coverUrl,
      thumbnailUrl: coverUrl, // For now, use the same URL
      width: 300,
      height: 400,
      format: 'jpeg',
      size: 0 // Unknown size for external URLs
    };

    const isDefault = source === 'default';
    await this.coverStorage.storeCover(bookId, coverResult, isDefault);

    // If this is a Drive book, upload the cover to Drive and update metadata
    if (bookId.startsWith('drive-') && this.driveService) {
      await this.uploadCoverToDrive(bookId, coverUrl);
    }
    
    return {
      coverUrl: coverResult.coverUrl,
      thumbnailUrl: coverResult.thumbnailUrl,
      isDefault,
      source: isDefault ? 'default' : 'extracted'
    };
  }

  /**
   * Upload cover to Google Drive and update metadata
   */
  private async uploadCoverToDrive(bookId: string, coverUrl: string): Promise<void> {
    if (!this.driveService) {
      console.warn('Google Drive service not available for cover upload');
      return;
    }

    try {
      // Get the book to find its folder
      const book = await this.indexedDB.getBook(bookId);
      if (!book) {
        console.error('Book not found for cover upload:', bookId);
        return;
      }

      // Convert cover URL to blob if it's a data URL
      let coverBlob: Blob;
      if (coverUrl.startsWith('data:')) {
        const response = await fetch(coverUrl);
        coverBlob = await response.blob();
      } else {
        // For external URLs, fetch the image
        const response = await fetch(coverUrl);
        coverBlob = await response.blob();
      }

      // Convert blob to Uint8Array
      const arrayBuffer = await coverBlob.arrayBuffer();
      const coverData = new Uint8Array(arrayBuffer);

      // Upload cover to Drive
      const driveFileId = await this.driveService.uploadFile(
        'cover.jpg',
        coverData,
        'image/jpeg',
        book.metadata?.bookFolderId
      );

      if (driveFileId) {
        try {
          // Download the uploaded cover and convert to data URL
          const coverData = await this.driveService.downloadFile(driveFileId);
          const blob = new Blob([coverData], { type: 'image/jpeg' });
          const thumbnailUrl = URL.createObjectURL(blob);
          
          // Update book metadata with new cover
          const updatedMetadata = {
            ...book.metadata,
            cover: thumbnailUrl
          };

          // Update the book in IndexedDB
          await this.indexedDB.updateBook(bookId, { metadata: updatedMetadata });

          console.log('Cover uploaded to Drive and metadata updated:', thumbnailUrl);
        } catch (error) {
          console.error('Failed to download and convert cover:', error);
          // Fallback to thumbnail URL
          const thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w400-h600`;
          const updatedMetadata = {
            ...book.metadata,
            cover: thumbnailUrl
          };
          await this.indexedDB.updateBook(bookId, { metadata: updatedMetadata });
        }
      }
    } catch (error) {
      console.error('Failed to upload cover to Drive:', error);
    }
  }

  /**
   * Check if book has a custom cover (not default)
   */
  async hasCustomCover(bookId: string): Promise<boolean> {
    const storedCover = await this.coverStorage.getCover(bookId);
    return storedCover ? !storedCover.isDefault : false;
  }

  /**
   * Get cover information for a book
   */
  async getCoverInfo(bookId: string): Promise<{
    hasCover: boolean;
    isDefault: boolean;
    source: 'extracted' | 'default' | 'cached' | 'none';
    extractedAt?: Date;
  }> {
    const storedCover = await this.coverStorage.getCover(bookId);
    
    if (!storedCover) {
      return {
        hasCover: false,
        isDefault: false,
        source: 'none'
      };
    }

    return {
      hasCover: true,
      isDefault: storedCover.isDefault,
      source: 'cached',
      extractedAt: storedCover.extractedAt
    };
  }

  /**
   * Clean up old covers
   */
  async cleanupOldCovers(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.coverStorage.cleanupOldCovers(maxAge);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalCovers: number;
    totalSize: number;
    averageSize: number;
  }> {
    return await this.coverStorage.getStorageStats();
  }
}
