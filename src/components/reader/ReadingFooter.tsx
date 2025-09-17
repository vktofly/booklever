'use client';

// Reading Footer Component
// Modern footer for the EPUB reader with progress and navigation

import React from 'react';

interface ReadingFooterProps {
  currentPage: number;
  totalPages: number;
  progress: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onProgressChange: (progress: number) => void;
}

export function ReadingFooter({
  currentPage,
  totalPages,
  progress,
  onPreviousPage,
  onNextPage,
  onProgressChange
}: ReadingFooterProps) {
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    onProgressChange(Math.max(0, Math.min(100, newProgress)));
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Previous page button */}
        <button
          onClick={onPreviousPage}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Previous page"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center - Progress bar */}
        <div className="flex-1 mx-4">
          <div className="relative">
            <div
              className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Progress indicator dot */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer"
              style={{ left: `calc(${progress}% - 8px)` }}
              onClick={handleProgressClick}
            />
          </div>
        </div>

        {/* Right side - Page info and next button */}
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            &lt; {currentPage}-{currentPage + 1} / {totalPages} &gt;
          </div>
          <button
            onClick={onNextPage}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Next page"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
