// Highlight Manager - Core component for managing highlights across platforms
// Provides consistent highlight creation, updating, and management

import { Highlight, Position, ReviewRecord } from './types';

export class HighlightManager {
  private highlights: Map<string, Highlight> = new Map();

  /**
   * Create a new highlight
   * @param data - Highlight creation data
   * @returns Created highlight
   */
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
  }): Highlight {
    const now = new Date();
    const highlight: Highlight = {
      id: this.generateId(),
      bookId: data.bookId,
      text: data.text,
      color: data.color as Highlight['color'],
      note: data.note || '',
      tags: data.tags || [],
      pageNumber: data.pageNumber,
      chapter: data.chapter,
      position: data.position,
      createdAt: now,
      updatedAt: now,
      lastModified: now,
      platform: data.platform,
      importance: 3, // Default importance
      reviewHistory: []
    };

    this.highlights.set(highlight.id, highlight);
    return highlight;
  }

  /**
   * Update an existing highlight
   * @param id - Highlight ID
   * @param updates - Updates to apply
   * @returns Updated highlight
   */
  updateHighlight(id: string, updates: Partial<Highlight>): Highlight {
    const existing = this.highlights.get(id);
    if (!existing) {
      throw new Error(`Highlight with id ${id} not found`);
    }

    const updated: Highlight = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      bookId: existing.bookId, // Preserve book ID
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
      lastModified: new Date()
    };

    this.highlights.set(id, updated);
    return updated;
  }

  /**
   * Delete a highlight
   * @param id - Highlight ID
   */
  deleteHighlight(id: string): void {
    if (!this.highlights.has(id)) {
      throw new Error(`Highlight with id ${id} not found`);
    }
    
    this.highlights.delete(id);
  }

  /**
   * Get all highlights for a specific book
   * @param bookId - Book ID
   * @returns Array of highlights for the book
   */
  getHighlightsForBook(bookId: string): Highlight[] {
    return Array.from(this.highlights.values())
      .filter(highlight => highlight.bookId === bookId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get highlight by ID
   * @param id - Highlight ID
   * @returns Highlight or undefined
   */
  getHighlight(id: string): Highlight | undefined {
    return this.highlights.get(id);
  }

  /**
   * Get all highlights
   * @returns Array of all highlights
   */
  getAllHighlights(): Highlight[] {
    return Array.from(this.highlights.values());
  }

  /**
   * Search highlights by text content
   * @param query - Search query
   * @param bookId - Optional book ID to limit search
   * @returns Array of matching highlights
   */
  searchHighlights(query: string, bookId?: string): Highlight[] {
    const normalizedQuery = query.toLowerCase();
    
    return Array.from(this.highlights.values())
      .filter(highlight => {
        if (bookId && highlight.bookId !== bookId) {
          return false;
        }
        
        return (
          highlight.text.toLowerCase().includes(normalizedQuery) ||
          (highlight.note && highlight.note.toLowerCase().includes(normalizedQuery)) ||
          highlight.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
        );
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Filter highlights by color
   * @param color - Highlight color
   * @param bookId - Optional book ID to limit filter
   * @returns Array of highlights with the specified color
   */
  filterByColor(color: Highlight['color'], bookId?: string): Highlight[] {
    return Array.from(this.highlights.values())
      .filter(highlight => {
        if (bookId && highlight.bookId !== bookId) {
          return false;
        }
        return highlight.color === color;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Filter highlights by tags
   * @param tags - Array of tags to filter by
   * @param bookId - Optional book ID to limit filter
   * @returns Array of highlights with any of the specified tags
   */
  filterByTags(tags: string[], bookId?: string): Highlight[] {
    return Array.from(this.highlights.values())
      .filter(highlight => {
        if (bookId && highlight.bookId !== bookId) {
          return false;
        }
        return tags.some(tag => highlight.tags.includes(tag));
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get highlights for review (spaced repetition)
   * @param bookId - Optional book ID to limit review
   * @returns Array of highlights ready for review
   */
  getHighlightsForReview(bookId?: string): Highlight[] {
    const now = new Date();
    
    return Array.from(this.highlights.values())
      .filter(highlight => {
        if (bookId && highlight.bookId !== bookId) {
          return false;
        }
        
        // Get the last review record
        const lastReview = highlight.reviewHistory[highlight.reviewHistory.length - 1];
        
        if (!lastReview) {
          // Never reviewed - include it
          return true;
        }
        
        // Check if it's time for review
        return new Date(lastReview.nextReview) <= now;
      })
      .sort((a, b) => {
        // Sort by importance and last review date
        const importanceDiff = (b.importance || 3) - (a.importance || 3);
        if (importanceDiff !== 0) return importanceDiff;
        
        const aLastReview = a.reviewHistory[a.reviewHistory.length - 1];
        const bLastReview = b.reviewHistory[b.reviewHistory.length - 1];
        
        if (!aLastReview) return -1;
        if (!bLastReview) return 1;
        
        return new Date(aLastReview.nextReview).getTime() - new Date(bLastReview.nextReview).getTime();
      });
  }

  /**
   * Add a review record to a highlight
   * @param highlightId - Highlight ID
   * @param success - Whether the review was successful
   * @param easeFactor - Ease factor for spaced repetition
   */
  addReviewRecord(highlightId: string, success: boolean, easeFactor: number = 2.5): void {
    const highlight = this.highlights.get(highlightId);
    if (!highlight) {
      throw new Error(`Highlight with id ${highlightId} not found`);
    }

    const now = new Date();
    const lastReview = highlight.reviewHistory[highlight.reviewHistory.length - 1];
    
    let interval: number;
    if (!lastReview) {
      // First review
      interval = success ? 1 : 0; // 1 day if successful, 0 if not
    } else {
      // Calculate next interval based on spaced repetition algorithm
      if (success) {
        interval = Math.round((lastReview.interval || 1) * easeFactor);
      } else {
        interval = 0; // Review again today if unsuccessful
      }
    }

    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const reviewRecord: ReviewRecord = {
      id: this.generateId(),
      date: now,
      success,
      nextReview,
      interval,
      easeFactor
    };

    const updatedHighlight: Highlight = {
      ...highlight,
      reviewHistory: [...highlight.reviewHistory, reviewRecord],
      updatedAt: now,
      lastModified: now
    };

    this.highlights.set(highlightId, updatedHighlight);
  }

  /**
   * Get statistics for highlights
   * @param bookId - Optional book ID to limit statistics
   * @returns Highlight statistics
   */
  getStatistics(bookId?: string): {
    total: number;
    byColor: Record<string, number>;
    byTag: Record<string, number>;
    reviewStats: {
      total: number;
      reviewed: number;
      pending: number;
      averageSuccessRate: number;
    };
  } {
    const highlights = bookId 
      ? this.getHighlightsForBook(bookId)
      : this.getAllHighlights();

    const byColor: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let totalReviews = 0;
    let successfulReviews = 0;
    let reviewedHighlights = 0;

    highlights.forEach(highlight => {
      // Count by color
      byColor[highlight.color] = (byColor[highlight.color] || 0) + 1;

      // Count by tags
      highlight.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });

      // Review statistics
      if (highlight.reviewHistory.length > 0) {
        reviewedHighlights++;
        highlight.reviewHistory.forEach(review => {
          totalReviews++;
          if (review.success) {
            successfulReviews++;
          }
        });
      }
    });

    return {
      total: highlights.length,
      byColor,
      byTag,
      reviewStats: {
        total: highlights.length,
        reviewed: reviewedHighlights,
        pending: highlights.length - reviewedHighlights,
        averageSuccessRate: totalReviews > 0 ? successfulReviews / totalReviews : 0
      }
    };
  }

  /**
   * Clear all highlights (for testing or reset)
   */
  clearAll(): void {
    this.highlights.clear();
  }

  /**
   * Load highlights from external source
   * @param highlights - Array of highlights to load
   */
  loadHighlights(highlights: Highlight[]): void {
    highlights.forEach(highlight => {
      this.highlights.set(highlight.id, highlight);
    });
  }

  /**
   * Export highlights to JSON
   * @param bookId - Optional book ID to limit export
   * @returns JSON string of highlights
   */
  exportToJSON(bookId?: string): string {
    const highlights = bookId 
      ? this.getHighlightsForBook(bookId)
      : this.getAllHighlights();

    return JSON.stringify(highlights, null, 2);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
