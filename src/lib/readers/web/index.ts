// Web Reader Components - Main export file
// Exports web-specific reader components

export { EPUBReader } from './EPUBReader';
export { PDFReader } from './PDFReader';

// Re-export shared components for convenience
export {
  SharedEPUBReader,
  SharedPDFReader,
  PositionCalculator,
  ConflictResolver,
  HighlightManager,
  OfflineManager
} from '../shared';
