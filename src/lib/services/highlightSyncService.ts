// Highlight Sync Service
// Handles synchronization of highlights between local storage and Google Drive

import { Highlight } from '@/lib/readers/shared';
import { IndexedDBService } from '@/lib/storage/indexedDB';
import { GoogleDriveService } from './googleDriveService';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  pendingChanges: number;
}

export interface SyncResult {
  success: boolean;
  syncedHighlights: number;
  conflicts: number;
  errors: string[];
}

export class HighlightSyncService {
  private indexedDB: IndexedDBService;
  private driveService: GoogleDriveService;
  private highlightsFolderId: string | null = null;
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
    pendingChanges: 0
  };

  constructor(indexedDB: IndexedDBService, driveService: GoogleDriveService) {
    this.indexedDB = indexedDB;
    this.driveService = driveService;
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    try {
      // Create or get highlights folder
      const folders = await this.driveService.createRequiredFolders();
      this.highlightsFolderId = folders.highlightsFolderId;
      console.log('HighlightSyncService: Initialized with highlights folder:', this.highlightsFolderId);
    } catch (error) {
      console.error('HighlightSyncService: Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Sync highlights to Google Drive
   */
  async syncToDrive(bookId: string): Promise<SyncResult> {
    if (this.syncStatus.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.syncStatus.isSyncing = true;
    this.syncStatus.syncError = null;

    try {
      console.log('HighlightSyncService: Starting sync to Drive for book:', bookId);

      // Get local highlights
      const localHighlights = await this.indexedDB.getHighlightsForBook(bookId);
      console.log('HighlightSyncService: Found', localHighlights.length, 'local highlights');

      // Get remote highlights
      const remoteHighlights = await this.getRemoteHighlights(bookId);
      console.log('HighlightSyncService: Found', remoteHighlights.length, 'remote highlights');

      // Perform sync
      const result = await this.performSync(localHighlights, remoteHighlights, bookId);

      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.pendingChanges = 0;

      console.log('HighlightSyncService: Sync completed:', result);
      return result;

    } catch (error) {
      this.syncStatus.syncError = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('HighlightSyncService: Sync failed:', error);
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  /**
   * Sync highlights from Google Drive
   */
  async syncFromDrive(bookId: string): Promise<SyncResult> {
    if (this.syncStatus.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.syncStatus.isSyncing = true;
    this.syncStatus.syncError = null;

    try {
      console.log('HighlightSyncService: Starting sync from Drive for book:', bookId);

      // Get remote highlights
      const remoteHighlights = await this.getRemoteHighlights(bookId);
      console.log('HighlightSyncService: Found', remoteHighlights.length, 'remote highlights');

      // Get local highlights
      const localHighlights = await this.indexedDB.getHighlightsForBook(bookId);
      console.log('HighlightSyncService: Found', localHighlights.length, 'local highlights');

      // Perform sync
      const result = await this.performSync(localHighlights, remoteHighlights, bookId);

      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.pendingChanges = 0;

      console.log('HighlightSyncService: Sync completed:', result);
      return result;

    } catch (error) {
      this.syncStatus.syncError = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('HighlightSyncService: Sync failed:', error);
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  /**
   * Get remote highlights from Google Drive
   */
  private async getRemoteHighlights(bookId: string): Promise<Highlight[]> {
    if (!this.highlightsFolderId) {
      throw new Error('Highlights folder not initialized');
    }

    try {
      // List files in highlights folder
      const files = await this.driveService.listFiles(this.highlightsFolderId, 'application/json');
      
      // Find the highlights file for this book
      const highlightsFile = files.find(file => file.name === `highlights-${bookId}.json`);
      
      if (!highlightsFile) {
        return []; // No remote highlights
      }

      // Download and parse highlights
      const highlightsData = await this.driveService.downloadFile(highlightsFile.id);
      const highlightsJson = new TextDecoder().decode(highlightsData);
      const highlights = JSON.parse(highlightsJson) as Highlight[];

      // Convert date strings back to Date objects
      return highlights.map(highlight => ({
        ...highlight,
        createdAt: new Date(highlight.createdAt),
        updatedAt: new Date(highlight.updatedAt),
        lastModified: new Date(highlight.lastModified)
      }));

    } catch (error) {
      console.error('HighlightSyncService: Failed to get remote highlights:', error);
      return [];
    }
  }

  /**
   * Upload highlights to Google Drive
   */
  private async uploadHighlights(highlights: Highlight[], bookId: string): Promise<void> {
    if (!this.highlightsFolderId) {
      throw new Error('Highlights folder not initialized');
    }

    try {
      // Convert highlights to JSON
      const highlightsJson = JSON.stringify(highlights, null, 2);
      const highlightsData = new TextEncoder().encode(highlightsJson);

      // Upload to Google Drive
      await this.driveService.uploadFile(
        `highlights-${bookId}.json`,
        highlightsData,
        'application/json',
        this.highlightsFolderId
      );

      console.log('HighlightSyncService: Uploaded', highlights.length, 'highlights to Drive');

    } catch (error) {
      console.error('HighlightSyncService: Failed to upload highlights:', error);
      throw error;
    }
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(
    localHighlights: Highlight[],
    remoteHighlights: Highlight[],
    bookId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedHighlights: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Create maps for easier comparison
      const localMap = new Map(localHighlights.map(h => [h.id, h]));
      const remoteMap = new Map(remoteHighlights.map(h => [h.id, h]));

      const allHighlightIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
      const mergedHighlights: Highlight[] = [];

      // Process each highlight
      for (const highlightId of allHighlightIds) {
        const local = localMap.get(highlightId);
        const remote = remoteMap.get(highlightId);

        if (local && remote) {
          // Both exist - check for conflicts
          if (local.lastModified.getTime() > remote.lastModified.getTime()) {
            // Local is newer
            mergedHighlights.push(local);
            result.syncedHighlights++;
          } else if (remote.lastModified.getTime() > local.lastModified.getTime()) {
            // Remote is newer
            mergedHighlights.push(remote);
            result.syncedHighlights++;
          } else {
            // Same timestamp - use local
            mergedHighlights.push(local);
          }
        } else if (local) {
          // Only local exists
          mergedHighlights.push(local);
          result.syncedHighlights++;
        } else if (remote) {
          // Only remote exists
          mergedHighlights.push(remote);
          result.syncedHighlights++;
        }
      }

      // Update local storage
      for (const highlight of mergedHighlights) {
        await this.indexedDB.storeHighlight(highlight);
      }

      // Upload merged highlights to Drive
      await this.uploadHighlights(mergedHighlights, bookId);

      console.log('HighlightSyncService: Sync completed successfully');

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('HighlightSyncService: Sync failed:', error);
    }

    return result;
  }

  /**
   * Auto-sync highlights (called when highlights are created/updated/deleted)
   */
  async autoSync(bookId: string): Promise<void> {
    try {
      // Increment pending changes counter
      this.syncStatus.pendingChanges++;

      // Debounce sync - only sync if not already syncing
      if (!this.syncStatus.isSyncing) {
        // Wait a bit to batch multiple changes
        setTimeout(async () => {
          try {
            await this.syncToDrive(bookId);
          } catch (error) {
            console.error('HighlightSyncService: Auto-sync failed:', error);
          }
        }, 2000); // 2 second debounce
      }
    } catch (error) {
      console.error('HighlightSyncService: Auto-sync setup failed:', error);
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync(bookId: string): Promise<SyncResult> {
    return await this.syncToDrive(bookId);
  }

  /**
   * Check if sync is needed
   */
  async needsSync(bookId: string): Promise<boolean> {
    try {
      const localHighlights = await this.indexedDB.getHighlightsForBook(bookId);
      const remoteHighlights = await this.getRemoteHighlights(bookId);

      // Simple check - if counts are different, sync is needed
      if (localHighlights.length !== remoteHighlights.length) {
        return true;
      }

      // Check if any local highlights are newer than last sync
      if (this.syncStatus.lastSyncTime) {
        const hasNewerHighlights = localHighlights.some(highlight => 
          highlight.lastModified > this.syncStatus.lastSyncTime!
        );
        if (hasNewerHighlights) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('HighlightSyncService: Failed to check sync status:', error);
      return true; // Assume sync is needed if we can't check
    }
  }
}
