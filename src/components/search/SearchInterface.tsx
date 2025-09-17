'use client';

// Search Interface Component
// Provides a comprehensive search interface with filters and suggestions

import React, { useState, useEffect, useRef } from 'react';
import { SearchResult, SearchFilters, SearchOptions } from '@/lib/services/searchService';

interface SearchInterfaceProps {
  onSearch: (query: string, filters?: SearchFilters, options?: SearchOptions) => Promise<SearchResult[]>;
  onGetSuggestions: (query: string) => Promise<string[]>;
  onResultClick: (result: SearchResult) => void;
  isSearching?: boolean;
  initialQuery?: string;
}

export function SearchInterface({ 
  onSearch, 
  onGetSuggestions, 
  onResultClick, 
  isSearching = false,
  initialQuery = ''
}: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle search input changes
  const handleInputChange = async (value: string) => {
    setQuery(value);
    
    if (value.trim()) {
      // Get suggestions
      const newSuggestions = await onGetSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle search execution
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setShowSuggestions(false);
    const searchResults = await onSearch(query, filters);
    setResults(searchResults);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on mount and handle initial query
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle initial query and auto-search
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      // Auto-search if there's an initial query
      handleSearch();
    }
  }, [initialQuery]);

  const getResultIcon = (result: SearchResult) => {
    if (result.type === 'highlight') {
      const colorEmoji = {
        yellow: '💛',
        blue: '💙',
        pink: '💗',
        green: '💚'
      };
      return colorEmoji[result.highlight?.color || 'yellow'];
    }
    return '📖';
  };

  const getResultType = (result: SearchResult) => {
    return result.type === 'highlight' ? 'Highlight' : 'Book';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search across all books and highlights..."
            className="w-full px-4 py-3 pl-12 pr-20 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Filters"
            >
              ⚙️
            </button>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">💡</span>
                  <span>{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Search Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Highlight Colors */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Highlight Colors
              </label>
              <div className="flex gap-2">
                {['yellow', 'blue', 'pink', 'green'].map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      const colors = filters.highlightColors || [];
                      const newColors = colors.includes(color)
                        ? colors.filter(c => c !== color)
                        : [...colors, color];
                      setFilters({ ...filters, highlightColors: newColors.length > 0 ? newColors : undefined });
                    }}
                    className={`w-6 h-6 rounded-full border-2 ${
                      filters.highlightColors?.includes(color)
                        ? 'border-gray-800'
                        : 'border-gray-300'
                    } ${
                      color === 'yellow' ? 'bg-yellow-300' :
                      color === 'blue' ? 'bg-blue-300' :
                      color === 'pink' ? 'bg-pink-300' :
                      'bg-green-300'
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* File Types */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                File Types
              </label>
              <div className="flex gap-2">
                {['epub', 'pdf'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const types = filters.fileTypes || [];
                      const newTypes = types.includes(type as 'epub' | 'pdf')
                        ? types.filter(t => t !== type)
                        : [...types, type as 'epub' | 'pdf'];
                      setFilters({ ...filters, fileTypes: newTypes.length > 0 ? newTypes : undefined });
                    }}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      filters.fileTypes?.includes(type as 'epub' | 'pdf')
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Search Results ({results.length})
            </h3>
            <button
              onClick={() => setResults([])}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Results
            </button>
          </div>

          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {getResultIcon(result)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {getResultType(result)}
                      </span>
                      <span className="text-sm text-gray-500">
                        from {result.bookTitle}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-2">
                      {result.title}
                    </h4>
                    
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {result.context || result.content}
                    </p>
                    
                    {result.highlight && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          {new Date(result.highlight.createdAt).toLocaleDateString()}
                        </span>
                        {result.highlight.note && (
                          <>
                            <span>•</span>
                            <span>Has note</span>
                          </>
                        )}
                        {result.highlight.tags && result.highlight.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{result.highlight.tags.length} tags</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    {Math.round(result.relevanceScore)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {query && results.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try different keywords or check your spelling
          </p>
        </div>
      )}
    </div>
  );
}
