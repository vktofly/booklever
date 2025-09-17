'use client';

// Reading Header Component
// Modern header for the EPUB reader with navigation and controls

import React from 'react';

interface ReadingHeaderProps {
  bookTitle: string;
  author: string;
  currentChapter: string;
  onBack: () => void;
  onSearch: () => void;
  onTextSize: () => void;
  onMenu: () => void;
  onBookmark: () => void;
  onHelp: () => void;
  onMore: () => void;
  onProfile: () => void;
  onFullscreen: () => void;
}

export function ReadingHeader({
  bookTitle,
  author,
  currentChapter,
  onBack,
  onSearch,
  onTextSize,
  onMenu,
  onBookmark,
  onHelp,
  onMore,
  onProfile,
  onFullscreen
}: ReadingHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Book info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to library"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                {bookTitle}
              </div>
              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                {author}
              </div>
            </div>
          </div>
        </div>

        {/* Center - Current chapter */}
        <div className="flex-1 text-center">
          <div className="text-sm font-medium text-gray-900 truncate max-w-[300px] mx-auto">
            {currentChapter}
          </div>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onFullscreen}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Fullscreen"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          
          <button
            onClick={onSearch}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Search"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <button
            onClick={onTextSize}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Text size"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          
          <button
            onClick={onMenu}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Menu"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <button
            onClick={onBookmark}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Bookmark"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          
          <button
            onClick={onHelp}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Help"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button
            onClick={onMore}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="More options"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          <button
            onClick={onProfile}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Profile"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">U</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
