'use client';

// Search Page
// Dedicated page for searching across all books and highlights

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/GoogleAuthContext';
import { Navigation } from '@/components/common/Navigation';
import { SearchInterface } from '@/components/search/SearchInterface';
import { SearchService, SearchResult, SearchFilters, SearchOptions } from '@/lib/services/searchService';
import { IndexedDBService } from '@/lib/storage/indexedDB';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchService, setSearchService] = useState<SearchService | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState({
    totalBooks: 0,
    totalHighlights: 0,
    totalSearchableContent: 0
  });
  const [initialQuery, setInitialQuery] = useState('');

  // Initialize search service and handle URL parameters
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        const indexedDB = new IndexedDBService();
        await indexedDB.initialize();
        
        const service = new SearchService(indexedDB);
        setSearchService(service);
        
        // Get search statistics
        const stats = await service.getSearchStats();
        setSearchStats(stats);

        // Handle URL parameters
        const queryParam = searchParams.get('q');
        if (queryParam) {
          setInitialQuery(decodeURIComponent(queryParam));
        }
      } catch (error) {
        console.error('Failed to initialize search service:', error);
      }
    };

    initializeSearch();
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle search
  const handleSearch = async (
    query: string, 
    filters?: SearchFilters, 
    options?: SearchOptions
  ): Promise<SearchResult[]> => {
    if (!searchService) return [];
    
    setIsSearching(true);
    try {
      const results = await searchService.search(query, filters, options);
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Handle getting suggestions
  const handleGetSuggestions = async (query: string): Promise<string[]> => {
    if (!searchService) return [];
    
    try {
      return await searchService.getSearchSuggestions(query);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'book') {
      // Navigate to book reader
      router.push(`/reader/${result.bookId}`);
    } else if (result.type === 'highlight') {
      // Navigate to book reader and scroll to highlight
      router.push(`/reader/${result.bookId}?highlight=${result.highlight?.id}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Search Library</h1>
              <p className="text-gray-600 mt-2">
                Search across all your books and highlights
              </p>
            </div>
            
            <button
              onClick={() => router.push('/library')}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Back to Library
            </button>
          </div>

          {/* Search Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📚</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{searchStats.totalBooks}</div>
                  <div className="text-sm text-gray-600">Books</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-2xl">✨</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{searchStats.totalHighlights}</div>
                  <div className="text-sm text-gray-600">Highlights</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(searchStats.totalSearchableContent / 1000)}K
                  </div>
                  <div className="text-sm text-gray-600">Searchable Characters</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Interface */}
        {searchService && (
          <SearchInterface
            onSearch={handleSearch}
            onGetSuggestions={handleGetSuggestions}
            onResultClick={handleResultClick}
            isSearching={isSearching}
            initialQuery={initialQuery}
          />
        )}

        {/* Search Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Search Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Search Features:</h4>
              <ul className="space-y-1">
                <li>• Search across book titles, authors, and highlights</li>
                <li>• Use filters to narrow down results</li>
                <li>• Click on results to jump to the content</li>
                <li>• Search history helps you find previous queries</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tips for Better Results:</h4>
              <ul className="space-y-1">
                <li>• Use specific keywords for precise results</li>
                <li>• Try different variations of your search terms</li>
                <li>• Use filters to focus on specific content types</li>
                <li>• Check the relevance score to find the best matches</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
