// IndexedDB Service
// Handles local storage for books, highlights, and user data

import { Book, Highlight, UserPreferences } from '@/types';

export interface StoredBook extends Book {
  fileData: Uint8Array;
  cachedAt: Date;
  lastAccessed: Date;
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

export interface StorageStats {
  totalBooks: number;
  totalHighlights: number;
  totalSize: number;
  availableSpace: number;
}

export class IndexedDBService {
  private dbName: string = 'BookLeverDB';
  private version: number = 4; // Incremented to add collections and tags support
  private db: IDBDatabase | null = null;
  private maxStorageSize: number = 2 * 1024 * 1024 * 1024; // 2GB
  private currentUserId: string | null = null;

  /**
   * Set the current user ID for account-specific storage
   */
  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
    console.log('IndexedDBService: Current user set to:', userId);
  }

  /**
   * Get user-specific database name
   */
  private getUserSpecificDbName(): string {
    if (this.currentUserId) {
      return `BookLeverDB_${this.currentUserId}`;
    }
    return 'BookLeverDB_anonymous';
  }

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbName = this.getUserSpecificDbName();
      const request = indexedDB.open(dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`IndexedDB upgrade from version ${oldVersion} to ${this.version}`);
        
        // Create books store
        if (!db.objectStoreNames.contains('books')) {
          console.log('Creating books object store');
          const booksStore = db.createObjectStore('books', { keyPath: 'id' });
          booksStore.createIndex('title', 'title', { unique: false });
          booksStore.createIndex('author', 'author', { unique: false });
          booksStore.createIndex('fileType', 'fileType', { unique: false });
          booksStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create highlights store
        if (!db.objectStoreNames.contains('highlights')) {
          console.log('Creating highlights object store');
          const highlightsStore = db.createObjectStore('highlights', { keyPath: 'id' });
          highlightsStore.createIndex('bookId', 'bookId', { unique: false });
          highlightsStore.createIndex('createdAt', 'createdAt', { unique: false });
          highlightsStore.createIndex('color', 'color', { unique: false });
          highlightsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Create book covers store (new in version 2)
        if (!db.objectStoreNames.contains('bookCovers')) {
          console.log('Creating bookCovers object store');
          const coversStore = db.createObjectStore('bookCovers', { keyPath: 'id' });
          coversStore.createIndex('bookId', 'bookId', { unique: false });
          coversStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          coversStore.createIndex('source', 'source', { unique: false });
        }

        // Create user preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          console.log('Creating preferences object store');
          db.createObjectStore('preferences', { keyPath: 'id' });
        }

        // Create collections store (new in version 4)
        if (!db.objectStoreNames.contains('collections')) {
          console.log('Creating collections object store');
          const collectionsStore = db.createObjectStore('collections', { keyPath: 'id' });
          collectionsStore.createIndex('name', 'name', { unique: false });
          collectionsStore.createIndex('createdAt', 'createdAt', { unique: false });
          collectionsStore.createIndex('isDefault', 'isDefault', { unique: false });
        }

        // Create tags store (new in version 4)
        if (!db.objectStoreNames.contains('tags')) {
          console.log('Creating tags object store');
          const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
          tagsStore.createIndex('name', 'name', { unique: true });
          tagsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          console.log('Creating syncQueue object store');
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked - close other tabs');
        reject(new Error('IndexedDB upgrade blocked. Please close other tabs and try again.'));
      };
    });
  }

  /**
   * Store a book
   */
  async storeBook(book: StoredBook): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      const request = store.put(book);

      request.onsuccess = () => {
        console.log('IndexedDB storeBook success for ID:', book.id);
        resolve();
      };
      request.onerror = () => {
        console.error('IndexedDB storeBook error for ID:', book.id);
        reject(new Error('Failed to store book'));
      };
    });
  }

  /**
   * Get a book by ID
   */
  async getBook(bookId: string): Promise<StoredBook | null> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.get(bookId);

      request.onsuccess = () => {
        const result = request.result;
        console.log('IndexedDB getBook result for ID', bookId, ':', result);
        if (result) {
          // Update last accessed time
          result.lastAccessed = new Date();
          this.storeBook(result).catch(console.error);
        }
        resolve(result || null);
      };
      request.onerror = () => {
        console.error('IndexedDB getBook error for ID', bookId);
        reject(new Error('Failed to get book'));
      };
    });
  }

  /**
   * Get all books
   */
  async getAllBooks(): Promise<StoredBook[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('IndexedDB getAllBooks result:', request.result);
        resolve(request.result || []);
      };
      request.onerror = () => {
        console.error('IndexedDB getAllBooks error');
        reject(new Error('Failed to get books'));
      };
    });
  }


  /**
   * Store a highlight
   */
  async storeHighlight(highlight: Highlight): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      const request = store.put(highlight);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store highlight'));
    });
  }

  /**
   * Get highlights for a book
   */
  async getHighlightsForBook(bookId: string): Promise<Highlight[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      const index = store.index('bookId');
      const request = index.getAll(bookId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get highlights'));
    });
  }

  /**
   * Get all highlights
   */
  async getAllHighlights(): Promise<Highlight[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get highlights'));
    });
  }

  /**
   * Update a highlight
   */
  async updateHighlight(highlightId: string, updates: Partial<Highlight>): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      
      // First get the existing highlight
      const getRequest = store.get(highlightId);
      
      getRequest.onsuccess = () => {
        const existingHighlight = getRequest.result;
        if (!existingHighlight) {
          reject(new Error('Highlight not found'));
          return;
        }

        // Merge updates
        const updatedHighlight = {
          ...existingHighlight,
          ...updates,
          updatedAt: new Date(),
          lastModified: new Date()
        };

        // Store updated highlight
        const putRequest = store.put(updatedHighlight);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update highlight'));
      };
      
      getRequest.onerror = () => reject(new Error('Failed to get highlight'));
    });
  }

  /**
   * Delete a highlight
   */
  async deleteHighlight(highlightId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      const request = store.delete(highlightId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete highlight'));
    });
  }

  /**
   * Store user preferences
   */
  async storePreferences(preferences: UserPreferences): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');
      const request = store.put({ id: 'user', ...preferences });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store preferences'));
    });
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences | null> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readonly');
      const store = transaction.objectStore('preferences');
      const request = store.get('user');

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          delete result.id; // Remove the id field
        }
        resolve(result || null);
      };
      request.onerror = () => reject(new Error('Failed to get preferences'));
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const books = await this.getAllBooks();
    const highlights = await this.getAllHighlights();
    
    const totalSize = books.reduce((size, book) => size + book.fileData.length, 0);
    
    return {
      totalBooks: books.length,
      totalHighlights: highlights.length,
      totalSize,
      availableSpace: this.maxStorageSize - totalSize
    };
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const stores = ['books', 'highlights', 'preferences', 'syncQueue'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    }
  }

  /**
   * Clean up old books based on LRU
   */
  async cleanupOldBooks(maxBooks: number = 50): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const books = await this.getAllBooks();
    
    if (books.length <= maxBooks) {
      return;
    }

    // Sort by last accessed time (oldest first)
    books.sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime());
    
    // Delete oldest books
    const booksToDelete = books.slice(0, books.length - maxBooks);
    
    for (const book of booksToDelete) {
      await this.deleteBook(book.id);
    }
  }

  /**
   * Check if storage is available
   */
  static isStorageAvailable(): boolean {
    try {
      return 'indexedDB' in window;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a book by ID
   */
  async deleteBook(bookId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    console.log('IndexedDB deleteBook called for ID:', bookId);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['books', 'highlights'], 'readwrite');
      const booksStore = transaction.objectStore('books');
      const highlightsStore = transaction.objectStore('highlights');
      
      // Delete the book
      const deleteBookRequest = booksStore.delete(bookId);
      
      deleteBookRequest.onsuccess = () => {
        console.log('IndexedDB deleteBook success for ID:', bookId);
        
        // Also delete any highlights associated with this book
        const deleteHighlightsRequest = highlightsStore.index('bookId').openCursor(IDBKeyRange.only(bookId));
        
        deleteHighlightsRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            console.log('IndexedDB deleted highlights for book:', bookId);
            resolve();
          }
        };
        
        deleteHighlightsRequest.onerror = () => {
          console.error('IndexedDB deleteHighlights error for book:', bookId);
          resolve(); // Still resolve even if highlights deletion fails
        };
      };
      
      deleteBookRequest.onerror = () => {
        console.error('IndexedDB deleteBook error for ID:', bookId);
        reject(new Error('Failed to delete book'));
      };
    });
  }

  /**
   * Store book cover
   */
  async storeBookCover(cover: BookCover): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['bookCovers'], 'readwrite');
      const store = transaction.objectStore('bookCovers');
      const request = store.put(cover);

      request.onsuccess = () => {
        console.log('Book cover stored successfully:', cover.id);
        resolve();
      };

      request.onerror = () => {
        console.error('IndexedDB storeBookCover error:', request.error);
        reject(new Error('Failed to store book cover'));
      };
    });
  }

  /**
   * Get book cover by book ID
   */
  async getBookCover(bookId: string): Promise<BookCover | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['bookCovers'], 'readonly');
      const store = transaction.objectStore('bookCovers');
      const index = store.index('bookId');
      const request = index.get(bookId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || null);
      };

      request.onerror = () => {
        console.error('IndexedDB getBookCover error:', request.error);
        reject(new Error('Failed to get book cover'));
      };
    });
  }

  /**
   * Delete book cover
   */
  async deleteBookCover(coverId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['bookCovers'], 'readwrite');
      const store = transaction.objectStore('bookCovers');
      const request = store.delete(coverId);

      request.onsuccess = () => {
        console.log('Book cover deleted successfully:', coverId);
        resolve();
      };

      request.onerror = () => {
        console.error('IndexedDB deleteBookCover error:', request.error);
        reject(new Error('Failed to delete book cover'));
      };
    });
  }

  /**
   * Get estimated storage quota
   */
  static async getStorageQuota(): Promise<{
    quota: number;
    usage: number;
    available: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      };
    }
    
    return {
      quota: 0,
      usage: 0,
      available: 0
    };
  }

  /**
   * Clear all data and reset database
   */
  async clearDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['books', 'highlights', 'bookCovers', 'preferences', 'syncQueue'], 'readwrite');
        
        // Clear all object stores
        const stores = ['books', 'highlights', 'bookCovers', 'preferences', 'syncQueue'];
        let completed = 0;
        let hasError = false;

        stores.forEach(storeName => {
          if (this.db!.objectStoreNames.contains(storeName)) {
            const store = transaction.objectStore(storeName);
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
              completed++;
              if (completed === stores.length && !hasError) {
                console.log('Database cleared successfully');
                resolve();
              }
            };
            
            clearRequest.onerror = () => {
              hasError = true;
              console.error(`Failed to clear ${storeName}:`, clearRequest.error);
              reject(new Error(`Failed to clear ${storeName}`));
            };
          } else {
            completed++;
            if (completed === stores.length && !hasError) {
              resolve();
            }
          }
        });

        transaction.onerror = () => {
          hasError = true;
          reject(new Error('Transaction failed during database clear'));
        };
      } catch (error) {
        reject(new Error(`Failed to clear database: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Force database upgrade by closing and reopening with higher version
   */
  async forceUpgrade(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    // Increment version to force upgrade
    this.version++;
    console.log(`Forcing database upgrade to version ${this.version}`);
    
    await this.initialize();
  }

  /**
   * Clear all data for the current user (useful when switching accounts)
   */
  async clearUserData(): Promise<void> {
    if (!this.db) {
      console.log('IndexedDBService: No database to clear');
      return;
    }

    try {
      console.log('IndexedDBService: Clearing all data for current user');
      
      // Close current database
      this.db.close();
      this.db = null;

      // Delete the user-specific database
      const dbName = this.getUserSpecificDbName();
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log('IndexedDBService: User data cleared successfully');
          resolve();
        };
        
        deleteRequest.onerror = () => {
          console.error('IndexedDBService: Failed to clear user data:', deleteRequest.error);
          reject(deleteRequest.error);
        };
      });
    } catch (error) {
      console.error('IndexedDBService: Error clearing user data:', error);
      throw error;
    }
  }

  /**
   * Get all user databases (for cleanup purposes)
   */
  static async getAllUserDatabases(): Promise<string[]> {
    return new Promise((resolve) => {
      const databases: string[] = [];
      
      // This is a simplified approach - in a real implementation,
      // you might want to maintain a registry of user databases
      if ('databases' in indexedDB) {
        // Modern browsers support this
        (indexedDB as any).databases().then((dbs: any[]) => {
          const bookLeverDbs = dbs
            .filter(db => db.name.startsWith('BookLeverDB_'))
            .map(db => db.name);
          resolve(bookLeverDbs);
        }).catch(() => {
          // Fallback if databases() is not supported
          resolve([]);
        });
      } else {
        // Fallback for older browsers
        resolve([]);
      }
    });
  }
}
