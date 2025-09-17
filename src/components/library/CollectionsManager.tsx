'use client';

// Collections Manager Component
// Manages book collections and organization

import { useState, useEffect } from 'react';
import { Collection, Book } from '@/types';

interface CollectionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  books: Book[];
  onCreateCollection: (collection: Omit<Collection, 'id' | 'bookCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onAddBookToCollection: (bookId: string, collectionId: string) => Promise<void>;
  onRemoveBookFromCollection: (bookId: string, collectionId: string) => Promise<void>;
}

export function CollectionsManager({
  isOpen,
  onClose,
  collections,
  books,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onAddBookToCollection,
  onRemoveBookFromCollection
}: CollectionsManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📚'
  });

  const handleCreateCollection = async () => {
    if (!newCollection.name.trim()) return;

    try {
      await onCreateCollection(newCollection);
      setNewCollection({ name: '', description: '', color: '#3B82F6', icon: '📚' });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection) return;

    try {
      await onUpdateCollection(editingCollection.id, editingCollection);
      setEditingCollection(null);
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };

  const handleDeleteCollection = async (collection: Collection) => {
    if (confirm(`Are you sure you want to delete "${collection.name}"? This will remove all books from this collection.`)) {
      try {
        await onDeleteCollection(collection.id);
      } catch (error) {
        console.error('Failed to delete collection:', error);
      }
    }
  };

  const getBooksInCollection = (collectionId: string) => {
    return books.filter(book => book.collections?.includes(collectionId));
  };

  const getBooksNotInCollection = (collectionId: string) => {
    return books.filter(book => !book.collections?.includes(collectionId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Manage Collections</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Collection
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Collections List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-3">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCollection?.id === collection.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{collection.icon}</span>
                      <h3 className="font-semibold text-gray-900">{collection.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCollection(collection);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit collection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete collection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{collection.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      {collection.bookCount} books
                    </span>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: collection.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Details */}
          <div className="flex-1 p-6">
            {selectedCollection ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedCollection.name}
                  </h3>
                  <p className="text-gray-600">{selectedCollection.description}</p>
                </div>

                {/* Books in Collection */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Books in Collection ({getBooksInCollection(selectedCollection.id).length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getBooksInCollection(selectedCollection.id).map((book) => (
                      <div
                        key={book.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium text-gray-900">{book.title}</h5>
                          <p className="text-sm text-gray-600">{book.author}</p>
                        </div>
                        <button
                          onClick={() => onRemoveBookFromCollection(book.id, selectedCollection.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Books to Collection */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Add Books to Collection
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getBooksNotInCollection(selectedCollection.id).map((book) => (
                      <div
                        key={book.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <h5 className="font-medium text-gray-900">{book.title}</h5>
                          <p className="text-sm text-gray-600">{book.author}</p>
                        </div>
                        <button
                          onClick={() => onAddBookToCollection(book.id, selectedCollection.id)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a collection to manage its books
              </div>
            )}
          </div>
        </div>

        {/* Create Collection Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Collection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newCollection.name}
                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Collection name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCollection.description}
                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Collection description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={newCollection.color}
                      onChange={(e) => setNewCollection({ ...newCollection, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={newCollection.icon}
                      onChange={(e) => setNewCollection({ ...newCollection, icon: e.target.value })}
                      className="w-12 h-10 px-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="📚"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCollection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Collection Modal */}
        {editingCollection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Collection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingCollection.name}
                    onChange={(e) => setEditingCollection({ ...editingCollection, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingCollection.description || ''}
                    onChange={(e) => setEditingCollection({ ...editingCollection, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={editingCollection.color}
                      onChange={(e) => setEditingCollection({ ...editingCollection, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={editingCollection.icon || '📚'}
                      onChange={(e) => setEditingCollection({ ...editingCollection, icon: e.target.value })}
                      className="w-12 h-10 px-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditingCollection(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCollection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
