// Offline Manager - Core component for offline-first functionality
// Manages local caching, sync queuing, and offline status

import { CachedBook, OfflineStatus, SyncOperation } from './types';

export class OfflineManager {
  private cache: Map<string, CachedBook> = new Map();
  private maxCacheSize: number;
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor(maxCacheSize: number = 2 * 1024 * 1024 * 1024) { // 2GB default
    this.maxCacheSize = maxCacheSize;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processSyncQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Cache a book for offline access
   * @param book - Book to cache
   * @param priority - Cache priority
   */
  async cacheBook(book: CachedBook, priority: 'high' | 'normal' | 'low'): Promise<void> {
    // Check if we have enough space
    if (this.getCacheSize() + book.fileSize > this.maxCacheSize) {
      await this.cleanupCache(priority);
    }

    const cachedBook: CachedBook = {
      ...book,
      cachedAt: new Date(),
      lastAccessed: new Date(),
      priority
    };

    this.cache.set(book.id, cachedBook);
    await this.saveToStorage(cachedBook);
  }

  /**
   * Get a cached book
   * @param bookId - Book ID
   * @returns Cached book or null
   */
  async getCachedBook(bookId: string): Promise<CachedBook | null> {
    const cached = this.cache.get(bookId);
    if (cached) {
      // Update last accessed time
      cached.lastAccessed = new Date();
      this.cache.set(bookId, cached);
      await this.saveToStorage(cached);
    }
    return cached || null;
  }

  /**
   * Remove a cached book
   * @param bookId - Book ID
   */
  async removeCachedBook(bookId: string): Promise<void> {
    this.cache.delete(bookId);
    await this.removeFromStorage(bookId);
  }

  /**
   * Clean up cache based on priority
   * @param priority - Current operation priority
   */
  async cleanupCache(priority: 'high' | 'normal' | 'low'): Promise<void> {
    const books = Array.from(this.cache.values());

    // Keep favorites and high priority books
    const booksToKeep = books.filter(book => 
      book.isFavorite || book.priority === 'high'
    );

    // Remove low priority books first
    const booksToRemove = books
      .filter(book => !book.isFavorite && book.priority !== 'high')
      .sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime());

    for (const book of booksToRemove) {
      this.cache.delete(book.id);
      await this.removeFromStorage(book.id);

      // Stop when we have 20% free space
      if (this.getCacheSize() <= this.maxCacheSize * 0.8) {
        break;
      }
    }
  }

  /**
   * Get current cache size
   * @returns Cache size in bytes
   */
  getCacheSize(): number {
    return Array.from(this.cache.values())
      .reduce((total, book) => total + book.fileSize, 0);
  }

  /**
   * Get cache status
   * @returns Cache status information
   */
  getCacheStatus(): {
    totalSize: number;
    maxSize: number;
    usagePercentage: number;
    booksCached: number;
    lastCleanup: Date;
  } {
    return {
      totalSize: this.getCacheSize(),
      maxSize: this.maxCacheSize,
      usagePercentage: (this.getCacheSize() / this.maxCacheSize) * 100,
      booksCached: this.cache.size,
      lastCleanup: new Date() // TODO: Track actual last cleanup time
    };
  }

  /**
   * Get offline status
   * @returns Current offline status
   */
  async getOfflineStatus(): Promise<OfflineStatus> {
    return {
      isOnline: this.isOnline,
      booksAvailableOffline: this.cache.size,
      highlightsAvailableOffline: await this.getOfflineHighlightsCount(),
      lastSync: await this.getLastSyncTime(),
      pendingSync: {
        highlights: this.syncQueue.filter(op => 
          op.type.startsWith('highlight-')
        ).length,
        progress: this.syncQueue.filter(op => 
          op.type === 'book-progress'
        ).length,
        estimatedSyncTime: this.estimateSyncTime()
      }
    };
  }

  /**
   * Add operation to sync queue
   * @param operation - Sync operation to queue
   */
  addToSyncQueue(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    
    // If online, try to process immediately
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    // Sort by priority
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { immediate: 0, batch: 1, background: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process operations
    const operationsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of operationsToProcess) {
      try {
        await this.executeSyncOperation(operation);
      } catch (error) {
        console.error('Sync operation failed:', error);
        
        // Retry if not exceeded max retries
        if (operation.retryCount < operation.maxRetries) {
          operation.retryCount++;
          this.syncQueue.push(operation);
        }
      }
    }
  }

  /**
   * Execute a sync operation
   * @param operation - Operation to execute
   */
  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    // This would integrate with the actual sync service
    // For now, we'll just simulate the operation
    console.log('Executing sync operation:', operation);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get count of offline highlights
   * @returns Number of highlights available offline
   */
  private async getOfflineHighlightsCount(): Promise<number> {
    // This would integrate with the highlight storage
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get last sync time
   * @returns Last sync timestamp
   */
  private async getLastSyncTime(): Promise<Date | undefined> {
    // This would integrate with the sync service
    // For now, return undefined
    return undefined;
  }

  /**
   * Estimate sync time
   * @returns Estimated sync time in seconds
   */
  private estimateSyncTime(): number {
    // Estimate based on queue size and operation types
    const immediateOps = this.syncQueue.filter(op => op.priority === 'immediate').length;
    const batchOps = this.syncQueue.filter(op => op.priority === 'batch').length;
    const backgroundOps = this.syncQueue.filter(op => op.priority === 'background').length;

    return (immediateOps * 1) + (batchOps * 2) + (backgroundOps * 5);
  }

  /**
   * Save book to storage (platform-specific implementation)
   * @param book - Book to save
   */
  private async saveToStorage(book: CachedBook): Promise<void> {
    // This would integrate with IndexedDB or SQLite
    // For now, we'll just store in memory
    console.log('Saving book to storage:', book.id);
  }

  /**
   * Remove book from storage (platform-specific implementation)
   * @param bookId - Book ID to remove
   */
  private async removeFromStorage(bookId: string): Promise<void> {
    // This would integrate with IndexedDB or SQLite
    // For now, we'll just log
    console.log('Removing book from storage:', bookId);
  }

  /**
   * Ensure offline capability for essential books
   */
  async ensureOfflineCapability(): Promise<void> {
    // Cache essential books for offline reading
    const essentialBooks = await this.getEssentialBooks();

    for (const book of essentialBooks) {
      if (!this.cache.has(book.id)) {
        await this.cacheBook(book, 'high');
      }
    }
  }

  /**
   * Get essential books (user favorites, recently read, etc.)
   * @returns Array of essential books
   */
  private async getEssentialBooks(): Promise<CachedBook[]> {
    // This would integrate with the book service
    // For now, return empty array
    return [];
  }

  /**
   * Check if a book is cached
   * @param bookId - Book ID
   * @returns True if book is cached
   */
  isBookCached(bookId: string): boolean {
    return this.cache.has(bookId);
  }

  /**
   * Get all cached books
   * @returns Array of cached books
   */
  getAllCachedBooks(): CachedBook[] {
    return Array.from(this.cache.values());
  }

  /**
   * Clear all cached books
   */
  async clearCache(): Promise<void> {
    const bookIds = Array.from(this.cache.keys());
    
    for (const bookId of bookIds) {
      await this.removeCachedBook(bookId);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStatistics(): {
    totalBooks: number;
    totalSize: number;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    oldestBook?: Date;
    newestBook?: Date;
  } {
    const books = Array.from(this.cache.values());
    
    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    books.forEach(book => {
      // Count by priority
      byPriority[book.priority] = (byPriority[book.priority] || 0) + 1;
      
      // Count by type
      byType[book.fileType] = (byType[book.fileType] || 0) + 1;
      
      // Track oldest and newest
      if (!oldestDate || book.cachedAt < oldestDate) {
        oldestDate = book.cachedAt;
      }
      if (!newestDate || book.cachedAt > newestDate) {
        newestDate = book.cachedAt;
      }
    });

    return {
      totalBooks: books.length,
      totalSize: this.getCacheSize(),
      byPriority,
      byType,
      oldestBook: oldestDate,
      newestBook: newestDate
    };
  }
}
