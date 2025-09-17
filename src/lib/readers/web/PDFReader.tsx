'use client';

// Web PDF Reader Component
// Uses the shared reader library for consistent cross-platform behavior

import React, { useState, useRef, useEffect } from 'react';
import { SharedPDFReader, Highlight, Selection } from '../shared';
import { PDFRenderer } from './PDFRenderer';

interface PDFReaderProps {
  bookData: Uint8Array;
  bookId: string;
  highlights?: Highlight[];
  onHighlightCreate?: (highlight: Highlight) => void;
  onHighlightUpdate?: (highlight: Highlight) => void;
  onHighlightDelete?: (highlightId: string) => void;
}

export function PDFReader({
  bookData,
  bookId,
  highlights = [],
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete
}: PDFReaderProps) {
  const [reader, setReader] = useState<SharedPDFReader | null>(null);
  const [pdfRenderer, setPdfRenderer] = useState<PDFRenderer | null>(null);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize the PDF renderer and shared reader
  useEffect(() => {
    const initializeReader = async () => {
      try {
        setIsLoading(true);
        
        // Initialize PDF renderer
        const renderer = new PDFRenderer();
        await renderer.loadPDF(bookData);
        setPdfRenderer(renderer);
        setTotalPages(renderer.getTotalPages());
        
        // Initialize shared reader
        const pdfReader = new SharedPDFReader(bookData);
        setReader(pdfReader);
        
        // Render the PDF
        if (contentRef.current) {
          await renderer.render(contentRef.current);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize PDF reader:', error);
        setIsLoading(false);
      }
    };

    initializeReader();
  }, [bookData]);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const mockSelection: Selection = {
        toString: () => selection.toString(),
        startOffset: selection.anchorOffset,
        endOffset: selection.focusOffset,
        context: {
          before: selection.anchorNode?.parentElement?.textContent?.substring(0, 50) || '',
          after: selection.focusNode?.parentElement?.textContent?.substring(50) || ''
        }
      };
      
      setCurrentSelection(mockSelection);
      setShowHighlightToolbar(true);
    } else {
      setCurrentSelection(null);
      setShowHighlightToolbar(false);
    }
  };

  // Handle highlight creation
  const handleHighlightCreate = (color: Highlight['color']) => {
    if (!reader || !currentSelection) return;

    try {
      const highlight = reader.createHighlight(currentSelection, color, bookId, {
        pageNumber: currentPage
      });
      onHighlightCreate?.(highlight);
      setCurrentSelection(null);
      setShowHighlightToolbar(false);
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  // Handle highlight click
  const handleHighlightClick = (highlight: Highlight) => {
    if (pdfRenderer) {
      pdfRenderer.navigateToPosition(highlight.position);
    }
  };

  // Handle page navigation
  const handlePageChange = async (page: number) => {
    if (pdfRenderer) {
      await pdfRenderer.goToPage(page);
      setCurrentPage(page);
    }
  };

  // Handle next/previous page
  const handleNextPage = async () => {
    if (pdfRenderer) {
      await pdfRenderer.nextPage();
      setCurrentPage(pdfRenderer.getCurrentPage());
    }
  };

  const handlePreviousPage = async () => {
    if (pdfRenderer) {
      await pdfRenderer.previousPage();
      setCurrentPage(pdfRenderer.getCurrentPage());
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfRenderer) {
        pdfRenderer.destroy();
      }
    };
  }, [pdfRenderer]);

  // Render highlights for current page
  const renderHighlights = () => {
    const pageHighlights = highlights.filter(highlight => 
      highlight.pageNumber === currentPage
    );

    return pageHighlights.map(highlight => (
      <div
        key={highlight.id}
        className={`absolute cursor-pointer transition-opacity hover:opacity-80 ${
          highlight.color === 'yellow' ? 'bg-yellow-200' :
          highlight.color === 'blue' ? 'bg-blue-200' :
          highlight.color === 'pink' ? 'bg-pink-200' :
          'bg-green-200'
        }`}
        onClick={() => handleHighlightClick(highlight)}
        title={highlight.note || highlight.text}
      >
        {highlight.text}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!reader) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">Failed to load PDF reader</div>
      </div>
    );
  }

  const renderResult = reader.render();

  return (
    <div className="relative w-full h-full">
      {/* PDF toolbar */}
      <div className="bg-gray-100 p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => handlePageChange(parseInt(e.target.value))}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
          <span className="text-sm">of {totalPages}</span>
        </div>
      </div>

      {/* Main content area */}
      <div
        ref={contentRef}
        className="pdf-content p-8 max-w-4xl mx-auto bg-white min-h-[600px]"
        onMouseUp={handleTextSelection}
      />

      {/* Highlight overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {renderHighlights()}
      </div>

      {/* Highlight toolbar */}
      {showHighlightToolbar && currentSelection && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-white rounded-lg shadow-lg border p-2 flex gap-2">
            <button
              onClick={() => handleHighlightCreate('yellow')}
              className="w-8 h-8 bg-yellow-200 rounded hover:bg-yellow-300 transition-colors"
              title="Yellow highlight"
            />
            <button
              onClick={() => handleHighlightCreate('blue')}
              className="w-8 h-8 bg-blue-200 rounded hover:bg-blue-300 transition-colors"
              title="Blue highlight"
            />
            <button
              onClick={() => handleHighlightCreate('pink')}
              className="w-8 h-8 bg-pink-200 rounded hover:bg-pink-300 transition-colors"
              title="Pink highlight"
            />
            <button
              onClick={() => handleHighlightCreate('green')}
              className="w-8 h-8 bg-green-200 rounded hover:bg-green-300 transition-colors"
              title="Green highlight"
            />
            <button
              onClick={() => {
                setCurrentSelection(null);
                setShowHighlightToolbar(false);
              }}
              className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 transition-colors flex items-center justify-center"
              title="Cancel"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Selection info (for debugging) */}
      {currentSelection && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
          Selected: &quot;{currentSelection.toString()}&quot; (Page {currentPage})
        </div>
      )}
    </div>
  );
}
