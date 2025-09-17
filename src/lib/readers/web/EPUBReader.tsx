import React, { useState, useRef, useEffect } from 'react';
import { EPUBRenderer } from './EPUBRenderer';
import { Highlight, Selection } from '../shared';

interface EPUBReaderProps {
  bookData: Uint8Array;
  bookId: string;
  highlights?: Highlight[];
  onHighlightCreate?: (highlight: Highlight) => void;
  onHighlightUpdate?: (highlight: Highlight) => void;
  onHighlightDelete?: (highlightId: string) => void;
}

export function EPUBReader({
  bookData,
  bookId,
  highlights = [],
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete
}: EPUBReaderProps) {
  const [epubRenderer, setEpubRenderer] = useState<EPUBRenderer | null>(null);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Array<{ id: string; title: string; startPage: number }>>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize the Readium renderer
  useEffect(() => {
    const initializeRenderer = async () => {
      try {
        setIsLoading(true);
        console.log('EPUBReader: Initializing with bookData size:', bookData.length);
        
        console.log('EPUBReader: Creating ReadiumRenderer instance...');
        const renderer = new ReadiumRenderer();
        console.log('EPUBReader: ReadiumRenderer created, loading EPUB...');
        await renderer.loadEPUB(bookData);
        console.log('EPUBReader: EPUB loaded into renderer, setting state...');
        setReadiumRenderer(renderer);
        console.log('EPUBReader: Readium renderer initialized and set in state');
        
        setIsLoading(false);
      } catch (error) {
        console.error('EPUBReader: Failed to initialize renderer:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    };

    initializeRenderer();
  }, [bookData]);

  // Render the EPUB when renderer and container are ready
  useEffect(() => {
    const renderEPUB = async () => {
      if (!epubRenderer || !contentRef.current) {
        return;
      }

      try {
        console.log('EPUBReader: Rendering EPUB to container');
        console.log('EPUBReader: Container element:', contentRef.current);
        console.log('EPUBReader: Container dimensions:', {
          width: contentRef.current.offsetWidth,
          height: contentRef.current.offsetHeight,
          clientWidth: contentRef.current.clientWidth,
          clientHeight: contentRef.current.clientHeight
        });
        
        if (contentRef.current.offsetWidth === 0 || contentRef.current.offsetHeight === 0) {
          console.warn('EPUBReader: Container has zero dimensions, setting minimum size');
          contentRef.current.style.minHeight = '400px';
          contentRef.current.style.minWidth = '300px';
        }
        
        const result = await epubRenderer.render(contentRef.current);
        console.log('EPUBReader: EPUB rendered successfully, result:', result);
        console.log('EPUBReader: Result metadata:', result.metadata);
        console.log('EPUBReader: Result content length:', result.content.length);
        
        setChapters(result.metadata.chapters);
        setCurrentChapter(result.metadata.chapters[0]?.id || '');
        console.log('EPUBReader: Chapters set, current chapter:', result.metadata.chapters[0]?.id);
        console.log('EPUBReader: Total chapters:', result.metadata.chapters.length);
        
        setIsRendered(true);
        console.log('EPUBReader: EPUB is now fully rendered');
      } catch (error) {
        console.error('EPUBReader: Failed to render EPUB:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    };

    renderEPUB();
  }, [epubRenderer]);

  // Handle text selection
  const handleTextSelection = () => {
    if (!epubRenderer) return;

    const selection = epubRenderer.getCurrentSelection();
    if (selection) {
      setCurrentSelection({
        text: selection.toString(),
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        context: selection.context
      });
      setShowHighlightToolbar(true);
    } else {
      setShowHighlightToolbar(false);
      setCurrentSelection(null);
    }
  };

  // Handle highlight creation
  const handleHighlightCreate = async () => {
    if (!currentSelection || !onHighlightCreate) return;

    const highlight: Highlight = {
      id: `highlight-${Date.now()}`,
      bookId,
      chapterId: currentChapter,
      text: currentSelection.text,
      startOffset: currentSelection.startOffset,
      endOffset: currentSelection.endOffset,
      color: 'yellow',
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onHighlightCreate(highlight);
    setShowHighlightToolbar(false);
    setCurrentSelection(null);
  };

  // Navigation handlers
  const handleNextPage = async () => {
    if (!epubRenderer || !isRendered) return;
    
    try {
      await epubRenderer.nextPage();
    } catch (error) {
      console.error('EPUBReader: Failed to go to next page:', error);
    }
  };

  const handlePreviousPage = async () => {
    if (!epubRenderer || !isRendered) return;
    
    try {
      await epubRenderer.previousPage();
    } catch (error) {
      console.error('EPUBReader: Failed to go to previous page:', error);
    }
  };

  const handleChapterChange = async (chapterId: string) => {
    if (!epubRenderer || !isRendered) return;
    
    try {
      await epubRenderer.navigateToChapter(chapterId);
      setCurrentChapter(chapterId);
    } catch (error) {
      console.error('EPUBReader: Failed to navigate to chapter:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (epubRenderer) {
        epubRenderer.destroy();
      }
    };
  }, [epubRenderer]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading Readium EPUB reader...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500 text-center">
          <div className="text-lg font-semibold mb-2">Failed to load Readium EPUB reader</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!epubRenderer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Initializing Readium renderer...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Navigation toolbar */}
      <div className="bg-gray-100 p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousPage}
            disabled={!isRendered}
            className={`px-3 py-1 rounded transition-colors ${
              isRendered
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={!isRendered}
            className={`px-3 py-1 rounded transition-colors ${
              isRendered
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={currentChapter}
            onChange={(e) => handleChapterChange(e.target.value)}
            disabled={!isRendered}
            className={`px-3 py-1 border rounded ${
              isRendered
                ? 'border-gray-300 bg-white'
                : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
          >
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content area */}
      <div className="relative flex-1">
        <div
          ref={contentRef}
          className="epub-content p-8 max-w-4xl mx-auto bg-white min-h-[600px]"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        />

        {/* Highlight toolbar */}
        {showHighlightToolbar && currentSelection && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border rounded-lg shadow-lg p-2 flex gap-2 z-10">
            <button
              onClick={handleHighlightCreate}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Highlight
            </button>
            <button
              onClick={() => setShowHighlightToolbar(false)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
