// Shared Reader Library - Main export file
// Exports all shared components for cross-platform use

export { SharedEPUBReader } from './EPUBReader';
export { SharedPDFReader } from './PDFReader';
export { PositionCalculator } from './PositionCalculator';
export { ConflictResolver } from './ConflictResolver';
export { HighlightManager } from './HighlightManager';
export { OfflineManager } from './OfflineManager';

// Export all types
export type {
  RenderResult,
  Selection,
  Position,
  Highlight,
  ReviewRecord,
  Conflict,
  SyncOperation,
  CachedBook,
  OfflineStatus,
  EPUBRenderer,
  PDFRenderer,
  HighlightManager as IHighlightManager,
  PositionCalculator as IPositionCalculator,
  ConflictResolver as IConflictResolver,
  OfflineManager as IOfflineManager
} from './types';

// Re-export main types from the main types file
export type {
  Book,
  UserPreferences,
  CloudProvider,
  StorageUsage,
  ProviderSuggestion,
  SyncResult,
  ApiResponse,
  PaginatedResponse,
  HighlightColor,
  BookFormat,
  Platform,
  Theme,
  ExportFormat
} from '../../types';
