'use client';

// Highlight Manager Component
// Displays and manages highlights for a book

import React, { useState } from 'react';
import { Highlight } from '@/lib/readers/shared';

interface HighlightManagerProps {
  highlights: Highlight[];
  onHighlightUpdate?: (highlight: Highlight) => void;
  onHighlightDelete?: (highlightId: string) => void;
  onHighlightClick?: (highlight: Highlight) => void;
}

export function HighlightManager({
  highlights,
  onHighlightUpdate,
  onHighlightDelete,
  onHighlightClick
}: HighlightManagerProps) {
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState('');

  const handleEditClick = (highlight: Highlight) => {
    setSelectedHighlight(highlight);
    setEditNote(highlight.note || '');
    setIsEditing(true);
  };

  const handleSaveNote = () => {
    if (selectedHighlight && onHighlightUpdate) {
      const updatedHighlight = {
        ...selectedHighlight,
        note: editNote,
        updatedAt: new Date()
      };
      onHighlightUpdate(updatedHighlight);
    }
    setIsEditing(false);
    setSelectedHighlight(null);
    setEditNote('');
  };

  const handleDeleteClick = (highlightId: string) => {
    if (onHighlightDelete && confirm('Are you sure you want to delete this highlight?')) {
      onHighlightDelete(highlightId);
    }
  };

  const getColorClass = (color: Highlight['color']) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-200 border-yellow-300';
      case 'blue':
        return 'bg-blue-200 border-blue-300';
      case 'pink':
        return 'bg-pink-200 border-pink-300';
      case 'green':
        return 'bg-green-200 border-green-300';
      default:
        return 'bg-gray-200 border-gray-300';
    }
  };

  const getColorEmoji = (color: Highlight['color']) => {
    switch (color) {
      case 'yellow':
        return '💛';
      case 'blue':
        return '💙';
      case 'pink':
        return '💗';
      case 'green':
        return '💚';
      default:
        return '💛';
    }
  };

  if (highlights.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-4xl mb-2">📝</div>
        <p>No highlights yet</p>
        <p className="text-sm">Select text in your book to create highlights</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Highlights ({highlights.length})
        </h3>
      </div>

      <div className="space-y-3">
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            className={`p-3 rounded-lg border ${getColorClass(highlight.color)} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onHighlightClick?.(highlight)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getColorEmoji(highlight.color)}</span>
                  <span className="text-sm text-gray-600">
                    {highlight.chapter || `Page ${highlight.pageNumber || 'Unknown'}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(highlight.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-gray-800 mb-2 leading-relaxed">
                  "{highlight.text}"
                </p>
                
                {highlight.note && (
                  <div className="bg-white bg-opacity-50 p-2 rounded text-sm text-gray-700">
                    <strong>Note:</strong> {highlight.note}
                  </div>
                )}
                
                {highlight.tags && highlight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {highlight.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white bg-opacity-50 rounded-full text-xs text-gray-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 ml-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(highlight);
                  }}
                  className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                  title="Edit note"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(highlight.id);
                  }}
                  className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                  title="Delete highlight"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && selectedHighlight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-4">Edit Highlight Note</h4>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Highlighted text:</p>
              <p className="p-2 bg-gray-100 rounded text-sm italic">
                "{selectedHighlight.text}"
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note:
              </label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Add a note to this highlight..."
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedHighlight(null);
                  setEditNote('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
