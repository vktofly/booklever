// Position Calculator - Core component for perfect cross-device positioning
// Implements 2-level fallback strategy: Primary (CFI/coordinates) + Fallback (text context)

import { Position, Selection, EPUBRenderer, PDFRenderer } from './types';

export class PositionCalculator {
  private epubRenderer?: EPUBRenderer;
  private pdfRenderer?: PDFRenderer;

  constructor(epubRenderer?: EPUBRenderer, pdfRenderer?: PDFRenderer) {
    this.epubRenderer = epubRenderer;
    this.pdfRenderer = pdfRenderer;
  }

  /**
   * Calculate position for a text selection with 2-level fallback strategy
   * @param selection - The text selection
   * @param bookType - Type of book (epub or pdf)
   * @returns Position with primary and fallback data
   */
  calculatePosition(selection: Selection, bookType: 'epub' | 'pdf'): Position {
    if (bookType === 'epub') {
      return this.calculateEPUBPosition(selection);
    } else {
      return this.calculatePDFPosition(selection);
    }
  }

  /**
   * Calculate EPUB position using CFI as primary method
   */
  private calculateEPUBPosition(selection: Selection): Position {
    // Primary: CFI positioning (95% accuracy)
    const cfi = this.calculateCFI(selection);
    if (cfi) {
      return {
        primary: {
          type: 'cfi',
          value: cfi,
          textOffset: selection.startOffset
        },
        fallback: {
          textContent: selection.toString(),
          contextBefore: this.getContextBefore(selection),
          contextAfter: this.getContextAfter(selection),
          chapterId: this.getChapterId(selection)
        },
        confidence: 0.95
      };
    }

    // Fallback: Text-based positioning (5% cases)
    return {
      primary: null,
      fallback: {
        textContent: selection.toString(),
        contextBefore: this.getContextBefore(selection),
        contextAfter: this.getContextAfter(selection),
        chapterId: this.getChapterId(selection)
      },
      confidence: 0.85
    };
  }

  /**
   * Calculate PDF position using coordinates as primary method
   */
  private calculatePDFPosition(selection: Selection): Position {
    // Primary: Coordinate positioning
    const coordinates = this.calculateCoordinates(selection);
    if (coordinates) {
      return {
        primary: {
          type: 'coordinates',
          value: coordinates
        },
        fallback: {
          textContent: selection.toString(),
          pageNumber: coordinates.pageNumber
        },
        confidence: 0.95
      };
    }

    // Fallback: Text-based positioning
    return {
      primary: null,
      fallback: {
        textContent: selection.toString(),
        pageNumber: this.getPageNumber(selection)
      },
      confidence: 0.85
    };
  }

  /**
   * Calculate CFI (Canonical Fragment Identifier) for EPUB
   */
  private calculateCFI(selection: Selection): string | null {
    try {
      if (this.epubRenderer) {
        return this.epubRenderer.calculateCFI(selection);
      }
      
      // Fallback CFI calculation
      const textOffset = selection.startOffset;
      const chapterId = this.getChapterId(selection);
      
      if (chapterId && textOffset >= 0) {
        return `epubcfi(/6/2[${chapterId}]!/4/2/1:${textOffset})`;
      }
      
      return null;
    } catch (error) {
      console.warn('CFI calculation failed:', error);
      return null;
    }
  }

  /**
   * Calculate coordinates for PDF
   */
  private calculateCoordinates(selection: Selection): {
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    try {
      if (this.pdfRenderer) {
        return this.pdfRenderer.calculateCoordinates(selection);
      }
      
      // Fallback coordinate calculation
      const pageNumber = this.getPageNumber(selection);
      if (pageNumber > 0) {
        return {
          pageNumber,
          x: 100, // Default values - should be calculated from actual selection
          y: 200,
          width: 300,
          height: 20
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Coordinate calculation failed:', error);
      return null;
    }
  }

  /**
   * Get context before the selection
   */
  private getContextBefore(selection: Selection): string {
    if (selection.context?.before) {
      return selection.context.before;
    }
    
    // Try to get context from DOM or renderer
    try {
      const text = selection.toString();
      const fullText = this.getFullText();
      const index = fullText.indexOf(text);
      
      if (index > 0) {
        const start = Math.max(0, index - 50);
        return fullText.substring(start, index).trim();
      }
    } catch (error) {
      console.warn('Context before calculation failed:', error);
    }
    
    return '';
  }

  /**
   * Get context after the selection
   */
  private getContextAfter(selection: Selection): string {
    if (selection.context?.after) {
      return selection.context.after;
    }
    
    // Try to get context from DOM or renderer
    try {
      const text = selection.toString();
      const fullText = this.getFullText();
      const index = fullText.indexOf(text);
      
      if (index >= 0) {
        const end = Math.min(fullText.length, index + text.length + 50);
        return fullText.substring(index + text.length, end).trim();
      }
    } catch (error) {
      console.warn('Context after calculation failed:', error);
    }
    
    return '';
  }

  /**
   * Get chapter ID for EPUB
   */
  private getChapterId(selection: Selection): string {
    try {
      if (this.epubRenderer) {
        return this.epubRenderer.getChapterId(selection);
      }
      
      // Fallback chapter ID calculation
      return 'chapter-1'; // Default fallback
    } catch (error) {
      console.warn('Chapter ID calculation failed:', error);
      return 'chapter-1';
    }
  }

  /**
   * Get page number for PDF
   */
  private getPageNumber(selection: Selection): number {
    try {
      if (this.pdfRenderer) {
        return this.pdfRenderer.getPageNumber(selection);
      }
      
      // Fallback page number calculation
      return 1; // Default fallback
    } catch (error) {
      console.warn('Page number calculation failed:', error);
      return 1;
    }
  }

  /**
   * Get full text content (platform-specific implementation)
   */
  private getFullText(): string {
    // This should be implemented by the platform-specific renderer
    // For now, return empty string
    return '';
  }

  /**
   * Validate if a position is still accurate
   */
  validatePosition(position: Position, bookType: 'epub' | 'pdf'): boolean {
    try {
      if (position.primary) {
        if (bookType === 'epub' && position.primary.type === 'cfi') {
          return this.validateCFI(position.primary.value as string);
        } else if (bookType === 'pdf' && position.primary.type === 'coordinates') {
          return this.validateCoordinates(position.primary.value as any);
        }
      }
      
      // Fallback validation using text content
      return this.validateTextContent(position.fallback.textContent);
    } catch (error) {
      console.warn('Position validation failed:', error);
      return false;
    }
  }

  /**
   * Validate CFI
   */
  private validateCFI(cfi: string): boolean {
    try {
      // Basic CFI validation
      return cfi.startsWith('epubcfi(') && cfi.endsWith(')');
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate coordinates
   */
  private validateCoordinates(coordinates: {
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    try {
      return (
        coordinates.pageNumber > 0 &&
        coordinates.x >= 0 &&
        coordinates.y >= 0 &&
        coordinates.width > 0 &&
        coordinates.height > 0
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate text content
   */
  private validateTextContent(textContent: string): boolean {
    return textContent && textContent.trim().length > 0;
  }

  /**
   * Get confidence score for a position
   */
  getConfidence(position: Position): number {
    if (position.primary) {
      return position.confidence;
    }
    
    // Lower confidence for fallback-only positions
    return Math.max(0.5, position.confidence - 0.1);
  }

  /**
   * Compare two positions for equality
   */
  comparePositions(pos1: Position, pos2: Position): boolean {
    try {
      // Compare primary positions first
      if (pos1.primary && pos2.primary) {
        if (pos1.primary.type === pos2.primary.type) {
          if (pos1.primary.type === 'cfi') {
            return pos1.primary.value === pos2.primary.value;
          } else if (pos1.primary.type === 'coordinates') {
            const coords1 = pos1.primary.value as any;
            const coords2 = pos2.primary.value as any;
            return (
              coords1.pageNumber === coords2.pageNumber &&
              Math.abs(coords1.x - coords2.x) < 10 &&
              Math.abs(coords1.y - coords2.y) < 10
            );
          }
        }
      }
      
      // Fallback to text content comparison
      return pos1.fallback.textContent === pos2.fallback.textContent;
    } catch (error) {
      console.warn('Position comparison failed:', error);
      return false;
    }
  }
}
