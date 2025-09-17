'use client';

// Book Edit Modal Component
// Allows editing book metadata, collections, tags, and other properties

import { useState, useEffect } from 'react';
import { Book, Collection, Tag, BookEditData } from '@/types';

interface BookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  collections: Collection[];
  tags: Tag[];
  onSave: (bookId: string, updates: BookEditData) => Promise<void>;
}

export function BookEditModal({
  isOpen,
  onClose,
  book,
  collections,
  tags,
  onSave
}: BookEditModalProps) {
  const [formData, setFormData] = useState<BookEditData>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        author: book.author,
        rating: book.rating,
        priority: book.priority || 'normal',
        status: book.status || 'unread',
        collections: book.collections || [],
        tags: book.tags || [],
        notes: book.notes || '',
        isFavorite: book.isFavorite || false,
        metadata: {
          isbn: book.metadata?.isbn || '',
          publisher: book.metadata?.publisher || '',
          publicationDate: book.metadata?.publicationDate ? new Date(book.metadata.publicationDate).toISOString().split('T')[0] : '',
          language: book.metadata?.language || '',
          description: book.metadata?.description || '',
          genre: book.metadata?.genre || '',
          series: book.metadata?.series || '',
          volume: book.metadata?.volume || undefined
        }
      });
    }
  }, [book]);

  const handleSave = async () => {
    if (!book) return;

    setIsLoading(true);
    try {
      // Convert date string back to Date object
      const updates = {
        ...formData,
        metadata: formData.metadata ? {
          ...formData.metadata,
          publicationDate: formData.metadata.publicationDate ? new Date(formData.metadata.publicationDate) : undefined
        } : undefined
      };

      await onSave(book.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to save book:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionToggle = (collectionId: string) => {
    const currentCollections = formData.collections || [];
    const newCollections = currentCollections.includes(collectionId)
      ? currentCollections.filter(id => id !== collectionId)
      : [...currentCollections, collectionId];
    
    setFormData({ ...formData, collections: newCollections });
  };

  const handleTagToggle = (tagName: string) => {
    const currentTags = formData.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(tag => tag !== tagName)
      : [...currentTags, tagName];
    
    setFormData({ ...formData, tags: newTags });
  };

  const handleAddNewTag = (tagName: string) => {
    if (tagName.trim() && !formData.tags?.includes(tagName.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagName.trim()]
      });
    }
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Book</h2>
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
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={formData.author || ''}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Reading Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reading Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status || 'unread'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Book['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="unread">Unread</option>
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority || 'normal'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Book['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating
                  </label>
                  <select
                    value={formData.rating || 0}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>No Rating</option>
                    <option value={1}>⭐ (1)</option>
                    <option value={2}>⭐⭐ (2)</option>
                    <option value={3}>⭐⭐⭐ (3)</option>
                    <option value={4}>⭐⭐⭐⭐ (4)</option>
                    <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Collections */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Collections</h3>
              <div className="space-y-2">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.collections?.includes(collection.id) || false}
                      onChange={() => handleCollectionToggle(collection.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{collection.icon}</span>
                      <span className="font-medium text-gray-900">{collection.name}</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: collection.color }}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
              <div className="space-y-4">
                {/* Existing Tags */}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center space-x-2 px-3 py-1 border border-gray-200 rounded-full hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.tags?.includes(tag.name) || false}
                        onChange={() => handleTagToggle(tag.name)}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{tag.name}</span>
                    </label>
                  ))}
                </div>

                {/* Add New Tag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add New Tag
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Enter tag name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNewTag(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        handleAddNewTag(input.value);
                        input.value = '';
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Selected Tags */}
                {formData.tags && formData.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Selected Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Add your notes about this book..."
              />
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={formData.metadata?.isbn || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, isbn: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={formData.metadata?.publisher || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, publisher: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    value={formData.metadata?.publicationDate || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, publicationDate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={formData.metadata?.language || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, language: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={formData.metadata?.genre || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, genre: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Series
                  </label>
                  <input
                    type="text"
                    value={formData.metadata?.series || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, series: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.metadata?.description || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, description: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Book description..."
                />
              </div>
            </div>

            {/* Favorites */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isFavorite || false}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Mark as Favorite</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
