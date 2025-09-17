'use client';

// Advanced Search Component
// Provides comprehensive search and filtering capabilities

import { useState, useEffect } from 'react';
import { SearchFilters, SearchOptions, Collection, Tag, Book } from '@/types';

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  tags: Tag[];
  onSearch: (filters: SearchFilters, options?: SearchOptions) => Promise<Book[]>;
  onResults: (books: Book[]) => void;
}

export function AdvancedSearch({
  isOpen,
  onClose,
  collections,
  tags,
  onSearch,
  onResults
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [options, setOptions] = useState<SearchOptions>({
    sortBy: 'title',
    sortOrder: 'asc',
    limit: 50
  });
  const [isSearching, setIsSearching] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await onSearch(filters, options);
      onResults(results);
      onClose();
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setOptions({
      sortBy: 'title',
      sortOrder: 'asc',
      limit: 50
    });
  };

  const handleCollectionToggle = (collectionId: string) => {
    const currentCollections = filters.collections || [];
    const newCollections = currentCollections.includes(collectionId)
      ? currentCollections.filter(id => id !== collectionId)
      : [...currentCollections, collectionId];
    
    setFilters({ ...filters, collections: newCollections });
  };

  const handleTagToggle = (tagName: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(tag => tag !== tagName)
      : [...currentTags, tagName];
    
    setFilters({ ...filters, tags: newTags });
  };

  const handleAddNewTag = () => {
    if (newTag.trim() && !filters.tags?.includes(newTag.trim())) {
      setFilters({
        ...filters,
        tags: [...(filters.tags || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleStatusToggle = (status: Book['status']) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter(s => s !== status)
      : [...currentStatus, status];
    
    setFilters({ ...filters, status: newStatus });
  };

  const handleFileTypeToggle = (fileType: Book['fileType']) => {
    const currentTypes = filters.fileTypes || [];
    const newTypes = currentTypes.includes(fileType)
      ? currentTypes.filter(t => t !== fileType)
      : [...currentTypes, fileType];
    
    setFilters({ ...filters, fileTypes: newTypes });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Advanced Search</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Search Query */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={filters.query || ''}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by title, author, tags, or content..."
              />
            </div>

            {/* Collections */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Collections</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.collections?.includes(collection.id) || false}
                      onChange={() => handleCollectionToggle(collection.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{collection.icon}</span>
                      <span className="font-medium text-gray-900">{collection.name}</span>
                      <span className="text-sm text-gray-500">({collection.bookCount})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="space-y-4">
                {/* Existing Tags */}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center space-x-2 px-3 py-1 border border-gray-200 rounded-full hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.tags?.includes(tag.name) || false}
                        onChange={() => handleTagToggle(tag.name)}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{tag.name}</span>
                      <span className="text-xs text-gray-500">({tag.bookCount})</span>
                    </label>
                  ))}
                </div>

                {/* Add New Tag */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add custom tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddNewTag();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddNewTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* File Types */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">File Types</h3>
              <div className="flex space-x-4">
                {['epub', 'pdf'].map((fileType) => (
                  <label
                    key={fileType}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.fileTypes?.includes(fileType as Book['fileType']) || false}
                      onChange={() => handleFileTypeToggle(fileType as Book['fileType'])}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900 uppercase">{fileType}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reading Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Reading Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['unread', 'reading', 'completed', 'paused'].map((status) => (
                  <label
                    key={status}
                    className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(status as Book['status']) || false}
                      onChange={() => handleStatusToggle(status as Book['status'])}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Rating
              </label>
              <select
                value={filters.rating || 0}
                onChange={(e) => setFilters({ ...filters, rating: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Any Rating</option>
                <option value={1}>⭐ 1+ Stars</option>
                <option value={2}>⭐⭐ 2+ Stars</option>
                <option value={3}>⭐⭐⭐ 3+ Stars</option>
                <option value={4}>⭐⭐⭐⭐ 4+ Stars</option>
                <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
              </select>
            </div>

            {/* Special Filters */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Filters</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filters.isFavorite || false}
                    onChange={(e) => setFilters({ ...filters, isFavorite: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Favorites Only</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filters.isFromDrive || false}
                    onChange={(e) => setFilters({ ...filters, isFromDrive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Google Drive Books Only</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filters.isDownloaded || false}
                    onChange={(e) => setFilters({ ...filters, isDownloaded: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Downloaded Books Only</span>
                </label>
              </div>
            </div>

            {/* Sorting Options */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Sorting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={options.sortBy || 'title'}
                    onChange={(e) => setOptions({ ...options, sortBy: e.target.value as SearchOptions['sortBy'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="uploadDate">Date Added</option>
                    <option value="lastRead">Last Read</option>
                    <option value="progress">Reading Progress</option>
                    <option value="rating">Rating</option>
                    <option value="fileSize">File Size</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <select
                    value={options.sortOrder || 'asc'}
                    onChange={(e) => setOptions({ ...options, sortOrder: e.target.value as SearchOptions['sortOrder'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Results Limit
              </label>
              <select
                value={options.limit || 50}
                onChange={(e) => setOptions({ ...options, limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={25}>25 results</option>
                <option value={50}>50 results</option>
                <option value={100}>100 results</option>
                <option value={200}>200 results</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear All Filters
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
