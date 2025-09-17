'use client';

// Reading Sidebar Component
// Modern sidebar for navigation and display options like Google Play Books

import React, { useState } from 'react';

interface Chapter {
  id: string;
  title: string;
  startPage: number;
  level?: number;
}

interface Bookmark {
  id: string;
  title: string;
  position: string;
  page: number;
  createdAt: Date;
}

interface ReadingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'contents' | 'bookmarks' | 'display';
  onTabChange: (tab: 'contents' | 'bookmarks' | 'display') => void;
  chapters: Chapter[];
  bookmarks: Bookmark[];
  currentChapter?: string;
  onChapterClick: (chapterId: string) => void;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onBookmarkAdd: () => void;
  onBookmarkDelete: (bookmarkId: string) => void;
  // Display options
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  font: string;
  onFontChange: (font: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (height: number) => void;
  justification: 'left' | 'justify';
  onJustificationChange: (justification: 'left' | 'justify') => void;
  pageLayout: 'single' | 'double' | 'three-column';
  onPageLayoutChange: (layout: 'single' | 'double' | 'three-column') => void;
}

export function ReadingSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  chapters,
  bookmarks,
  currentChapter,
  onChapterClick,
  onBookmarkClick,
  onBookmarkAdd,
  onBookmarkDelete,
  theme,
  onThemeChange,
  font,
  onFontChange,
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  justification,
  onJustificationChange,
  pageLayout,
  onPageLayoutChange
}: ReadingSidebarProps) {
  const fonts = ['Original', 'Georgia', 'Times New Roman', 'Helvetica', 'Arial', 'Verdana'];
  const fontSizes = [75, 87, 100, 112, 125, 137, 150];
  const lineHeights = [75, 87, 100, 112, 125, 137, 150];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => onTabChange('contents')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'contents'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Contents
          </button>
          <button
            onClick={() => onTabChange('bookmarks')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bookmarks
          </button>
          <button
            onClick={() => onTabChange('display')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'display'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Display
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contents' && (
          <div className="p-4">
            <div className="space-y-1">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => onChapterClick(chapter.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    currentChapter === chapter.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ paddingLeft: chapter.level ? `${(chapter.level - 1) * 20 + 12}px` : '12px' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{chapter.title}</span>
                    <span className="text-xs text-gray-500 ml-2">Page {chapter.startPage}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bookmarks</h3>
              <button
                onClick={onBookmarkAdd}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                title="Add bookmark"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            
            {bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="text-gray-500 text-sm">No bookmarks yet</p>
                <p className="text-gray-400 text-xs mt-1">Add bookmarks as you read</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <button
                      onClick={() => onBookmarkClick(bookmark)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {bookmark.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        Page {bookmark.page} • {bookmark.createdAt.toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => onBookmarkDelete(bookmark.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete bookmark"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'display' && (
          <div className="p-4 space-y-6">
            {/* Dark Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Dark theme</label>
              <div className="flex items-center">
                <button
                  onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="ml-3 text-sm text-gray-600">
                  {theme === 'dark' ? 'On' : 'Off'}
                </span>
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Font</label>
              <select
                value={font}
                onChange={(e) => onFontChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {fonts.map((fontOption) => (
                  <option key={fontOption} value={fontOption}>
                    {fontOption}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Font size</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onFontSizeChange(Math.max(75, fontSize - 12))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                  {fontSize}%
                </span>
                <button
                  onClick={() => onFontSizeChange(Math.min(150, fontSize + 12))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Line height</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onLineHeightChange(Math.max(75, lineHeight - 12))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                  {lineHeight}%
                </span>
                <button
                  onClick={() => onLineHeightChange(Math.min(150, lineHeight + 12))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Justify</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => onJustificationChange('left')}
                  className={`p-2 rounded-md transition-colors ${
                    justification === 'left'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Left align"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => onJustificationChange('justify')}
                  className={`p-2 rounded-md transition-colors ${
                    justification === 'justify'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Justify text"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Page Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Page layout</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => onPageLayoutChange('single')}
                  className={`p-2 rounded-md transition-colors ${
                    pageLayout === 'single'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Single page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => onPageLayoutChange('double')}
                  className={`p-2 rounded-md transition-colors ${
                    pageLayout === 'double'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Double page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
                <button
                  onClick={() => onPageLayoutChange('three-column')}
                  className={`p-2 rounded-md transition-colors ${
                    pageLayout === 'three-column'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Three column"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
