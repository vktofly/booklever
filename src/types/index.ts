// BookLever - Core Type Definitions
// Based on our comprehensive requirements and shared reader library architecture

export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  fileType: 'epub' | 'pdf';
  fileSize: number;
  uploadDate: Date;
  lastRead?: Date;
  progress: number; // 0-100
  totalPages?: number;
  currentPage?: number;
  driveFileId?: string;
  providerId?: string;
  providerPath?: string;
  // Enhanced metadata
  rating?: number; // 1-5 stars
  priority?: 'low' | 'normal' | 'high';
  status?: 'unread' | 'reading' | 'completed' | 'paused';
  collections?: string[]; // Collection IDs
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
  isFromDrive?: boolean;
  isDownloaded?: boolean;
  metadata?: {
    isbn?: string;
    publisher?: string;
    publicationDate?: Date;
    language?: string;
    description?: string;
    genre?: string;
    series?: string;
    volume?: number;
  };
}

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  color: 'yellow' | 'blue' | 'pink' | 'green';
  note?: string;
  tags: string[];
  pageNumber?: number;
  chapter?: string;
  position: PositionMapping;
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date; // Critical for conflict resolution
  platform: 'web' | 'mobile'; // Track which platform created the highlight
  importance?: number; // 1-5 scale
  reviewHistory: ReviewRecord[];
}

export interface PositionMapping {
  // Primary positioning (95% accuracy)
  primary?: {
    type: 'cfi' | 'coordinates';
    value: string | {
      pageNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    textOffset?: number;
  };
  
  // Fallback positioning (5% cases)
  fallback: {
    textContent: string;
    contextBefore?: string;
    contextAfter?: string;
    chapterId?: string;
    pageNumber?: number;
  };
  
  confidence: number; // 0-1 scale
}

export interface ReviewRecord {
  id: string;
  date: Date;
  success: boolean;
  nextReview: Date;
  interval: number; // days
  easeFactor: number; // for spaced repetition
}

// Unified highlight file structure for Google Drive
export interface HighlightFile {
  bookId: string;
  version: number; // Increment on each sync
  lastSync: Date;
  highlights: Highlight[];
  metadata: {
    totalHighlights: number;
    lastModified: Date;
    platforms: string[]; // Track which platforms have synced
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  marginWidth: number;
  defaultHighlightColor: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  reviewReminders: boolean;
  reviewTime: string; // HH:MM format
  exportFormat: 'markdown' | 'json' | 'csv' | 'txt';
  privacy: {
    shareHighlights: boolean;
    analytics: boolean;
    crashReporting: boolean;
  };
}

// Multi-Cloud Storage Types
export interface CloudProvider {
  id: string;
  name: string;
  connected: boolean;
  freeStorage: number;
  usedStorage: number;
  isPrimary: boolean;
  status: 'active' | 'disconnected' | 'error';
  lastSync?: Date;
  apiRateLimit: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    burstLimit?: number;
  };
}

export interface StorageUsage {
  totalUsed: number;
  totalAvailable: number;
  primaryStorage: {
    providerId: string;
    used: number;
    available: number;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  secondaryStorage: Array<{
    providerId: string;
    used: number;
    available: number;
    percentage: number;
    status: 'connected' | 'disconnected';
  }>;
  expansionAvailable: number;
}

export interface ProviderSuggestion {
  providerId: string;
  reason: 'approaching_primary_limit' | 'storage_full' | 'performance_optimization';
  priority: 'low' | 'medium' | 'high';
  estimatedBenefit: string;
  action: 'connect_provider' | 'migrate_books' | 'cleanup_cache';
  currentUsage?: string;
}

// Sync and Conflict Resolution Types
export interface SyncOperation {
  id: string;
  type: 'highlight-create' | 'highlight-update' | 'highlight-delete' | 'book-progress' | 'preferences-update';
  data: any;
  priority: 'immediate' | 'batch' | 'background';
  retryCount: number;
  maxRetries: number;
  timestamp: Date;
  platform: 'web' | 'mobile';
}

export interface SyncResult {
  success: boolean;
  bookId?: string;
  mergedHighlights?: Highlight[];
  conflictsResolved: number;
  itemsSynced: number;
  newItems: number;
  updatedItems: number;
  deletedItems: number;
  syncTime: Date;
  version: number;
}

export interface Conflict {
  type: 'same-text-same-position' | 'overlapping-text' | 'same-position-different-text' | 'no-conflict';
  local: Highlight;
  remote: Highlight;
  resolution?: 'merged' | 'use-local' | 'use-remote' | 'create-separate';
}

// Offline-First Types
export interface OfflineStatus {
  isOnline: boolean;
  booksAvailableOffline: number;
  highlightsAvailableOffline: number;
  lastSync?: Date;
  pendingSync: {
    highlights: number;
    progress: number;
    estimatedSyncTime: number; // seconds
  };
}

export interface CachedBook extends Book {
  cachedAt: Date;
  lastAccessed: Date;
  priority: 'high' | 'normal' | 'low';
  isFavorite: boolean;
  willKeep: boolean;
}

// Shared Reader Library Types
export interface RenderResult {
  content: string;
  metadata: {
    totalPages: number;
    chapters: Array<{
      id: string;
      title: string;
      startPage: number;
    }>;
  };
}

export interface Selection {
  toString(): string;
  startOffset: number;
  endOffset: number;
  context?: {
    before: string;
    after: string;
  };
}

export interface Position {
  primary?: {
    type: 'cfi' | 'coordinates';
    value: string | {
      pageNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    textOffset?: number;
  };
  fallback: {
    textContent: string;
    contextBefore?: string;
    contextAfter?: string;
    chapterId?: string;
    pageNumber?: number;
  };
  confidence: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Collections and Tags
export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color for UI
  icon?: string; // Icon name or emoji
  bookCount: number;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean; // System collections like "Recently Added"
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  bookCount: number;
  createdAt: Date;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  collections?: string[];
  tags?: string[];
  fileTypes?: Book['fileType'][];
  status?: Book['status'][];
  rating?: number; // Minimum rating
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileSizeRange?: {
    min: number; // bytes
    max: number; // bytes
  };
  isFavorite?: boolean;
  isFromDrive?: boolean;
  isDownloaded?: boolean;
  priority?: Book['priority'][];
  author?: string;
  publisher?: string;
  genre?: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'author' | 'uploadDate' | 'lastRead' | 'progress' | 'rating' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  includeContent?: boolean; // Search within book content
  fuzzySearch?: boolean;
}

export interface SearchResult {
  type: 'book' | 'highlight';
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  relevance: number; // 0-1
  highlight?: Highlight;
  matchedText?: string;
  context?: string;
}

// Book Management Types
export interface BookEditData {
  title?: string;
  author?: string;
  rating?: number;
  priority?: Book['priority'];
  status?: Book['status'];
  collections?: string[];
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
  metadata?: Partial<Book['metadata']>;
}

export interface BulkBookOperation {
  bookIds: string[];
  operation: 'delete' | 'addToCollection' | 'removeFromCollection' | 'addTags' | 'removeTags' | 'setStatus' | 'setPriority' | 'setRating';
  data?: any;
}

// Export types for external use
export type HighlightColor = Highlight['color'];
export type BookFormat = Book['fileType'];
export type Platform = Highlight['platform'];
export type Theme = UserPreferences['theme'];
export type ExportFormat = UserPreferences['exportFormat'];
export type BookStatus = Book['status'];
export type BookPriority = Book['priority'];
