// Shared Reader Library Types
// These types are used across web and mobile platforms for consistent rendering and positioning

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
  styles?: string;
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

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  color: 'yellow' | 'blue' | 'pink' | 'green';
  note?: string;
  tags: string[];
  pageNumber?: number;
  chapter?: string;
  position: Position;
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
  platform: 'web' | 'mobile';
  importance?: number;
  reviewHistory: ReviewRecord[];
}

export interface ReviewRecord {
  id: string;
  date: Date;
  success: boolean;
  nextReview: Date;
  interval: number;
  easeFactor: number;
}

export interface Conflict {
  type: 'same-text-same-position' | 'overlapping-text' | 'same-position-different-text' | 'no-conflict';
  local: Highlight;
  remote: Highlight;
  resolution?: 'merged' | 'use-local' | 'use-remote' | 'create-separate';
}

export interface SyncOperation {
  id: string;
  type: 'highlight-create' | 'highlight-update' | 'highlight-delete' | 'book-progress';
  data: unknown;
  priority: 'immediate' | 'batch' | 'background';
  retryCount: number;
  maxRetries: number;
  timestamp: Date;
  platform: 'web' | 'mobile';
}

export interface CachedBook {
  id: string;
  title: string;
  author: string;
  fileType: 'epub' | 'pdf';
  fileSize: number;
  cachedAt: Date;
  lastAccessed: Date;
  priority: 'high' | 'normal' | 'low';
  isFavorite: boolean;
  willKeep: boolean;
}

export interface OfflineStatus {
  isOnline: boolean;
  booksAvailableOffline: number;
  highlightsAvailableOffline: number;
  lastSync?: Date;
  pendingSync: {
    highlights: number;
    progress: number;
    estimatedSyncTime: number;
  };
}

// Reader-specific interfaces
export interface EPUBRenderer {
  render(): RenderResult;
  getChapterId(selection: Selection): string;
  calculateCFI(selection: Selection): string | null;
  navigateToPosition(position: Position): void;
}

export interface PDFRenderer {
  render(): RenderResult;
  getPageNumber(selection: Selection): number;
  calculateCoordinates(selection: Selection): {
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  navigateToPosition(position: Position): void;
}

export interface HighlightManager {
  createHighlight(data: {
    text: string;
    position: Position;
    color: string;
    platform: 'web' | 'mobile';
    bookId: string;
    note?: string;
    tags?: string[];
    pageNumber?: number;
    chapter?: string;
  }): Highlight;
  
  updateHighlight(id: string, updates: Partial<Highlight>): Highlight;
  
  deleteHighlight(id: string): void;
  
  getHighlightsForBook(bookId: string): Highlight[];
}

export interface PositionCalculator {
  calculatePosition(selection: Selection, bookType: 'epub' | 'pdf'): Position;
  validatePosition(position: Position, bookType: 'epub' | 'pdf'): boolean;
  getConfidence(position: Position): number;
}

export interface ConflictResolver {
  resolveConflicts(localHighlights: Highlight[], remoteHighlights: Highlight[]): Highlight[];
  detectConflicts(local: Highlight[], remote: Highlight[]): Conflict[];
  resolveConflict(conflict: Conflict): Highlight;
}

export interface OfflineManager {
  cacheBook(book: CachedBook, priority: 'high' | 'normal' | 'low'): Promise<void>;
  getCachedBook(bookId: string): Promise<CachedBook | null>;
  cleanupCache(priority: 'high' | 'normal' | 'low'): Promise<void>;
  getOfflineStatus(): Promise<OfflineStatus>;
}
