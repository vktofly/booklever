// Search Service
// Provides full-text search across books and highlights

import { Highlight } from '@/lib/readers/shared';
import { Book } from '@/types';
import { IndexedDBService } from '@/lib/storage/indexedDB';

export interface SearchResult {
  id: string;
  type: 'book' | 'highlight';
  title: string;
  content: string;
  bookId: string;
  bookTitle: string;
  relevanceScore: number;
  context?: string;
  highlight?: Highlight;
  book?: Book;
}

export interface SearchFilters {
  bookIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  highlightColors?: string[];
  tags?: string[];
  fileTypes?: ('epub' | 'pdf')[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  includeContext?: boolean;
  contextLength?: number;
}

export class SearchService {
  private indexedDB: IndexedDBService;
  private searchHistory: string[] = [];
  private maxHistorySize: number = 50;

  constructor(indexedDB: IndexedDBService) {
    this.indexedDB = indexedDB;
    this.loadSearchHistory();
  }

  /**
   * Search across all books and highlights
   */
  async search(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      console.log('SearchService: Searching for:', query);
      
      // Add to search history
      this.addToSearchHistory(query);

      // Get all books and highlights
      const books = await this.indexedDB.getAllBooks();
      const allHighlights = await this.indexedDB.getAllHighlights();

      // Filter highlights by book IDs if specified
      const filteredHighlights = filters?.bookIds 
        ? allHighlights.filter(h => filters.bookIds!.includes(h.bookId))
        : allHighlights;

      // Search in highlights
      const highlightResults = await this.searchHighlights(
        query,
        filteredHighlights,
        books,
        options
      );

      // Search in book metadata
      const bookResults = await this.searchBooks(
        query,
        books,
        filters,
        options
      );

      // Combine and sort by relevance
      const allResults = [...highlightResults, ...bookResults];
      const sortedResults = this.sortByRelevance(allResults, query);

      // Apply additional filters
      const filteredResults = this.applyFilters(sortedResults, filters);

      // Apply pagination
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const paginatedResults = filteredResults.slice(offset, offset + limit);

      console.log('SearchService: Found', paginatedResults.length, 'results');
      return paginatedResults;

    } catch (error) {
      console.error('SearchService: Search failed:', error);
      return [];
    }
  }

  /**
   * Search within highlights
   */
  private async searchHighlights(
    query: string,
    highlights: Highlight[],
    books: any[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(word => word.length > 0);

    for (const highlight of highlights) {
      const book = books.find(b => b.id === highlight.bookId);
      if (!book) continue;

      // Search in highlight text
      const highlightText = highlight.text.toLowerCase();
      const noteText = (highlight.note || '').toLowerCase();
      const combinedText = `${highlightText} ${noteText}`;

      // Calculate relevance score
      let score = 0;
      let matchCount = 0;

      for (const word of words) {
        if (highlightText.includes(word)) {
          score += 10; // High score for text matches
          matchCount++;
        }
        if (noteText.includes(word)) {
          score += 5; // Medium score for note matches
          matchCount++;
        }
      }

      // Boost score for exact phrase matches
      if (highlightText.includes(queryLower)) {
        score += 20;
      }

      // Only include if there's a match
      if (matchCount > 0) {
        const context = options?.includeContext 
          ? this.generateContext(highlight.text, query, options.contextLength || 100)
          : undefined;

        results.push({
          id: `highlight-${highlight.id}`,
          type: 'highlight',
          title: `Highlight from ${book.title}`,
          content: highlight.text,
          bookId: highlight.bookId,
          bookTitle: book.title,
          relevanceScore: score,
          context,
          highlight,
          book
        });
      }
    }

    return results;
  }

  /**
   * Search within book metadata
   */
  private async searchBooks(
    query: string,
    books: any[],
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(word => word.length > 0);

    for (const book of books) {
      // Apply file type filter
      if (filters?.fileTypes && !filters.fileTypes.includes(book.fileType)) {
        continue;
      }

      // Search in book title and author
      const title = book.title.toLowerCase();
      const author = book.author.toLowerCase();
      const combinedText = `${title} ${author}`;

      let score = 0;
      let matchCount = 0;

      for (const word of words) {
        if (title.includes(word)) {
          score += 15; // High score for title matches
          matchCount++;
        }
        if (author.includes(word)) {
          score += 10; // Medium score for author matches
          matchCount++;
        }
      }

      // Boost score for exact phrase matches
      if (title.includes(queryLower) || author.includes(queryLower)) {
        score += 25;
      }

      // Only include if there's a match
      if (matchCount > 0) {
        results.push({
          id: `book-${book.id}`,
          type: 'book',
          title: book.title,
          content: `by ${book.author}`,
          bookId: book.id,
          bookTitle: book.title,
          relevanceScore: score,
          book
        });
      }
    }

    return results;
  }

  /**
   * Generate context around search matches
   */
  private generateContext(text: string, query: string, contextLength: number): string {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const queryIndex = textLower.indexOf(queryLower);

    if (queryIndex === -1) {
      return text.substring(0, contextLength) + (text.length > contextLength ? '...' : '');
    }

    const start = Math.max(0, queryIndex - contextLength / 2);
    const end = Math.min(text.length, queryIndex + query.length + contextLength / 2);
    
    let context = text.substring(start, end);
    
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  }

  /**
   * Sort results by relevance score
   */
  private sortByRelevance(results: SearchResult[], query: string): SearchResult[] {
    return results.sort((a, b) => {
      // First sort by relevance score
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      
      // Then by type (highlights first, then books)
      if (a.type !== b.type) {
        return a.type === 'highlight' ? -1 : 1;
      }
      
      // Finally by title
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Apply additional filters to results
   */
  private applyFilters(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
    if (!filters) return results;

    return results.filter(result => {
      // Date range filter
      if (filters.dateRange && result.highlight) {
        const highlightDate = result.highlight.createdAt;
        if (highlightDate < filters.dateRange.start || highlightDate > filters.dateRange.end) {
          return false;
        }
      }

      // Highlight color filter
      if (filters.highlightColors && result.highlight) {
        if (!filters.highlightColors.includes(result.highlight.color)) {
          return false;
        }
      }

      // Tags filter (if we implement tags later)
      if (filters.tags && result.highlight) {
        const highlightTags = result.highlight.tags || [];
        if (!filters.tags.some(tag => highlightTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get search suggestions based on history and content
   */
  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    if (!partialQuery.trim()) {
      return this.searchHistory.slice(0, 10);
    }

    const suggestions: string[] = [];
    const queryLower = partialQuery.toLowerCase();

    // Add matching history items
    const matchingHistory = this.searchHistory.filter(item => 
      item.toLowerCase().includes(queryLower)
    );
    suggestions.push(...matchingHistory);

    // Add suggestions based on book titles and authors
    try {
      const books = await this.indexedDB.getAllBooks();
      const bookSuggestions = books
        .flatMap(book => [book.title, book.author])
        .filter(item => item.toLowerCase().includes(queryLower))
        .slice(0, 5);
      suggestions.push(...bookSuggestions);
    } catch (error) {
      console.error('SearchService: Failed to get book suggestions:', error);
    }

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 10);
  }

  /**
   * Add query to search history
   */
  private addToSearchHistory(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item !== trimmedQuery);
    
    // Add to beginning
    this.searchHistory.unshift(trimmedQuery);
    
    // Limit size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }

    this.saveSearchHistory();
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  /**
   * Load search history from localStorage
   */
  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('booklever_search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('SearchService: Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  /**
   * Save search history to localStorage
   */
  private saveSearchHistory(): void {
    try {
      localStorage.setItem('booklever_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('SearchService: Failed to save search history:', error);
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    totalBooks: number;
    totalHighlights: number;
    totalSearchableContent: number;
  }> {
    try {
      const books = await this.indexedDB.getAllBooks();
      const highlights = await this.indexedDB.getAllHighlights();
      
      const totalSearchableContent = highlights.reduce((total, highlight) => {
        return total + highlight.text.length + (highlight.note?.length || 0);
      }, 0);

      return {
        totalBooks: books.length,
        totalHighlights: highlights.length,
        totalSearchableContent
      };
    } catch (error) {
      console.error('SearchService: Failed to get search stats:', error);
      return {
        totalBooks: 0,
        totalHighlights: 0,
        totalSearchableContent: 0
      };
    }
  }
}
