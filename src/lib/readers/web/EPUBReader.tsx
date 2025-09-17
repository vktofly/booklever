import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { EPUBRenderer, ReadingSettings, ReadingTheme, TypographySettings } from './EPUBRenderer';
import { Highlight, Selection } from '../shared';
import { ReadingHeader } from '@/components/reader/ReadingHeader';
import { ReadingFooter } from '@/components/reader/ReadingFooter';
import { ReadingSidebar } from '@/components/reader/ReadingSidebar';

// Memoized Highlight Toolbar Component
const HighlightToolbar = memo(({ onHighlightCreate, onClose }: {
  onHighlightCreate: (color: Highlight['color']) => void;
  onClose: () => void;
}) => (
  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border rounded-lg shadow-lg p-2 flex gap-2 z-10">
    <button
      onClick={() => onHighlightCreate('yellow')}
      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
      title="Yellow highlight"
    >
      💛
    </button>
    <button
      onClick={() => onHighlightCreate('blue')}
      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      title="Blue highlight"
    >
      💙
    </button>
    <button
      onClick={() => onHighlightCreate('pink')}
      className="px-3 py-1 bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
      title="Pink highlight"
    >
      💗
    </button>
    <button
      onClick={() => onHighlightCreate('green')}
      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      title="Green highlight"
    >
      💚
    </button>
    <button
      onClick={onClose}
      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
    >
      ✕
    </button>
  </div>
));

HighlightToolbar.displayName = 'HighlightToolbar';

interface EPUBReaderProps {
  bookData: Uint8Array;
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
  highlights?: Highlight[];
  onHighlightCreate?: (highlight: Highlight) => void;
  onHighlightUpdate?: (highlight: Highlight) => void;
  onHighlightDelete?: (highlightId: string) => void;
}

export function EPUBReader({
  bookData,
  bookId,
  bookTitle = "Unknown Book",
  bookAuthor = "Unknown Author",
  highlights = [],
  onHighlightCreate,
  onHighlightUpdate,
  onHighlightDelete
}: EPUBReaderProps) {
  const [epubRenderer, setEpubRenderer] = useState<EPUBRenderer | null>(null);
  const epubRendererRef = useRef<EPUBRenderer | null>(null);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Array<{ id: string; title: string; startPage: number; level?: number }>>([]);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [readingSettings, setReadingSettings] = useState<ReadingSettings | null>(null);
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [readingTime, setReadingTime] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; title: string; position: string; page: number; createdAt: Date }>>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(237);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'contents' | 'bookmarks' | 'display'>('contents');
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [justification, setJustification] = useState<'left' | 'justify'>('justify');
  const [pageLayout, setPageLayout] = useState<'single' | 'double' | 'three-column'>('single');
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    lastUpdate: Date.now()
  });

  // Initialize the Readium renderer with better error handling
  useEffect(() => {
    let isMounted = true;
    
    const initializeRenderer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('EPUBReader: Initializing with bookData size:', bookData.length);
        
        console.log('EPUBReader: Creating EPUBRenderer instance...');
        const renderer = new EPUBRenderer();
        console.log('EPUBReader: EPUBRenderer created, loading EPUB...');
        await renderer.loadEPUB(bookData);
        
        if (!isMounted) {
          renderer.destroy();
          return;
        }
        
        console.log('EPUBReader: EPUB loaded into renderer, setting state...');
        setEpubRenderer(renderer);
        epubRendererRef.current = renderer;
        console.log('EPUBReader: EPUB renderer initialized and set in state');
        
        // Log renderer state for debugging
        console.log('EPUBReader: Renderer chapters:', renderer.getTableOfContents());
        console.log('EPUBReader: Renderer metadata:', renderer.getReadingSettings());
        
        setIsLoading(false);
      } catch (error) {
        console.error('EPUBReader: Failed to initialize renderer:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load EPUB file');
          setIsLoading(false);
        }
      }
    };

    initializeRenderer();
    
    return () => {
      isMounted = false;
      // Clean up renderer if it exists
      if (epubRendererRef.current) {
        epubRendererRef.current.destroy();
        epubRendererRef.current = null;
      }
    };
  }, [bookData]);

  // Render the EPUB when renderer and container are ready with performance monitoring
  useEffect(() => {
    const renderEPUB = async () => {
      if (!epubRenderer || !contentRef.current) {
        return;
      }

      try {
        const startTime = performance.now();
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
        
        let result;
        try {
          result = await epubRenderer.render(contentRef.current);
        } catch (renderError) {
          console.error('EPUBReader: Error during render:', renderError);
          throw renderError;
        }
        const renderTime = performance.now() - startTime;
        
        console.log('EPUBReader: EPUB rendered successfully, result:', result);
        console.log('EPUBReader: Result metadata:', result.metadata);
        console.log('EPUBReader: Result content length:', result.content.length);
        console.log('EPUBReader: Render time:', renderTime.toFixed(2), 'ms');
        console.log('EPUBReader: Content preview:', result.content.substring(0, 500));
        
        setChapters(result.metadata.chapters);
        setCurrentChapter(result.metadata.chapters[0]?.id || '');
        console.log('EPUBReader: Chapters set, current chapter:', result.metadata.chapters[0]?.id);
        console.log('EPUBReader: Total chapters:', result.metadata.chapters.length);
        
        // Initialize reading settings and analytics
        const settings = epubRenderer.getReadingSettings();
        setReadingSettings(settings);
        
        // Update performance metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          renderTime,
          lastUpdate: Date.now()
        }));
        
        setIsRendered(true);
        console.log('EPUBReader: EPUB is now fully rendered');
      } catch (error) {
        console.error('EPUBReader: Failed to render EPUB:', error);
        setError(error instanceof Error ? error.message : 'Failed to render EPUB content');
      }
    };

    renderEPUB();
  }, [epubRenderer]);

  // Optimized text selection handler
  const handleTextSelection = useCallback(() => {
    if (!epubRenderer) return;

    const selection = epubRenderer.getCurrentSelection();
    if (selection) {
      setCurrentSelection(prev => prev !== selection ? selection : prev);
      setShowHighlightToolbar(true);
    } else {
      setShowHighlightToolbar(false);
      setCurrentSelection(null);
    }
  }, [epubRenderer]);

  // Handle highlight creation
  const handleHighlightCreate = async (color: Highlight['color'] = 'yellow') => {
    if (!currentSelection || !onHighlightCreate || !epubRenderer) return;

    try {
      // Create highlight using the shared highlight manager
      const highlight = epubRenderer.createHighlight({
        text: currentSelection.toString(),
        position: {
          primary: {
            type: 'cfi',
            value: `epubcfi(/6/2[${currentChapter}]!/4/2/1:${currentSelection.startOffset})`,
            textOffset: currentSelection.startOffset
          },
          fallback: {
            textContent: currentSelection.toString(),
            contextBefore: currentSelection.context?.before || '',
            contextAfter: currentSelection.context?.after || '',
            chapterId: currentChapter,
            pageNumber: 1
          },
          confidence: 0.95
        },
        color,
        platform: 'web',
        bookId,
        note: '',
        tags: [],
        pageNumber: 1,
        chapter: currentChapter
      });

      onHighlightCreate(highlight);
      setShowHighlightToolbar(false);
      setCurrentSelection(null);
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  // Optimized navigation handlers
  const handleNextPage = useCallback(async () => {
    if (!epubRenderer || !isRendered) return;
    
    try {
      await epubRenderer.nextPage();
    } catch (error) {
      console.error('EPUBReader: Failed to go to next page:', error);
    }
  }, [epubRenderer, isRendered]);

  const handlePreviousPage = useCallback(async () => {
    if (!epubRenderer || !isRendered) return;
    
    try {
      await epubRenderer.previousPage();
    } catch (error) {
      console.error('EPUBReader: Failed to go to previous page:', error);
    }
  }, [epubRenderer, isRendered]);

  const handleChapterChange = useCallback(async (chapterId: string) => {
    if (!epubRenderer || !isRendered) return;
    
    try {
      await epubRenderer.navigateToChapter(chapterId);
      setCurrentChapter(chapterId);
    } catch (error) {
      console.error('EPUBReader: Failed to navigate to chapter:', error);
    }
  }, [epubRenderer, isRendered]);

  // Optimized reading analytics with memoization
  const updateAnalytics = useCallback(() => {
    if (!epubRenderer || !isRendered) return;
    
    const progress = epubRenderer.getReadingProgress();
    const time = epubRenderer.getReadingTime();
    const bookmarkList = epubRenderer.getBookmarks();
    
    setReadingProgress(prev => prev !== progress ? progress : prev);
    setReadingTime(prev => prev !== time ? time : prev);
    setBookmarks(prev => {
      const newBookmarks = bookmarkList.map((bookmark, index) => ({
        id: `bookmark-${index}`,
        title: `Bookmark ${index + 1}`,
        position: bookmark,
        page: Math.floor(Math.random() * 100) + 1,
        createdAt: new Date()
      }));
      return JSON.stringify(prev) !== JSON.stringify(newBookmarks) ? newBookmarks : prev;
    });
  }, [epubRenderer, isRendered]);

  useEffect(() => {
    if (!epubRenderer || !isRendered) return;

    // Update analytics every 2 seconds instead of every second for better performance
    const interval = setInterval(updateAnalytics, 2000);
    return () => clearInterval(interval);
  }, [updateAnalytics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (epubRenderer) {
        try {
          epubRenderer.destroy();
        } catch (error) {
          console.warn('EPUBReader: Error during cleanup:', error);
          // Don't let cleanup errors crash the app
        }
      }
    };
  }, [epubRenderer]);

  // Optimized reading controls handlers with useCallback
  const handleSettingsChange = useCallback((settings: Partial<ReadingSettings>) => {
    if (epubRenderer && readingSettings) {
      epubRenderer.updateReadingSettings(settings);
      setReadingSettings(prev => prev ? ({ ...prev, ...settings }) : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleThemeChangeOriginal = useCallback((theme: ReadingTheme) => {
    if (epubRenderer && readingSettings) {
      epubRenderer.setTheme(theme.name);
      setReadingSettings(prev => prev ? ({ ...prev, theme }) : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleTypographyChange = useCallback((typography: Partial<TypographySettings>) => {
    if (epubRenderer && readingSettings) {
      const newTypography = { ...readingSettings.typography, ...typography };
      epubRenderer.updateReadingSettings({ typography: newTypography });
      setReadingSettings(prev => prev ? ({ ...prev, typography: newTypography }) : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleBookmarkToggle = useCallback(() => {
    if (epubRenderer) {
      // This would be implemented in the renderer
      console.log('Toggle bookmark');
    }
  }, [epubRenderer]);

  const handleNavigateToBookmark = useCallback((position: string) => {
    if (epubRenderer) {
      epubRenderer.navigateToBookmark(position);
    }
  }, [epubRenderer]);

  const handleAutoScrollToggle = useCallback(() => {
    if (epubRenderer && readingSettings) {
      const newSettings = { ...readingSettings, autoScroll: !readingSettings.autoScroll };
      epubRenderer.updateReadingSettings(newSettings);
      setReadingSettings(newSettings);
    }
  }, [epubRenderer, readingSettings]);

  const handleFocusModeToggle = useCallback(() => {
    if (epubRenderer && readingSettings) {
      const newSettings = { ...readingSettings, focusMode: !readingSettings.focusMode };
      epubRenderer.updateReadingSettings(newSettings);
      setReadingSettings(newSettings);
    }
  }, [epubRenderer, readingSettings]);

  const handleDistractionFreeToggle = useCallback(() => {
    if (epubRenderer && readingSettings) {
      const newSettings = { ...readingSettings, distractionFree: !readingSettings.distractionFree };
      epubRenderer.updateReadingSettings(newSettings);
      setReadingSettings(newSettings);
    }
  }, [epubRenderer, readingSettings]);

  // Google Play Books-style handlers
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleSearch = useCallback(() => {
    // TODO: Implement search functionality
    console.log('Search clicked');
  }, []);

  const handleTextSize = useCallback(() => {
    setSidebarTab('display');
    setShowSidebar(true);
  }, []);

  const handleMenu = useCallback(() => {
    setSidebarTab('contents');
    setShowSidebar(true);
  }, []);

  const handleBookmark = useCallback(() => {
    // TODO: Implement bookmark functionality
    console.log('Bookmark clicked');
  }, []);

  const handleHelp = useCallback(() => {
    // TODO: Implement help functionality
    console.log('Help clicked');
  }, []);

  const handleMore = useCallback(() => {
    // TODO: Implement more options
    console.log('More clicked');
  }, []);

  const handleProfile = useCallback(() => {
    // TODO: Implement profile functionality
    console.log('Profile clicked');
  }, []);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const handleChapterClick = useCallback((chapterId: string) => {
    if (epubRenderer) {
      epubRenderer.navigateToChapter(chapterId);
      setCurrentChapter(chapterId);
      setShowSidebar(false);
    }
  }, [epubRenderer]);

  const handleBookmarkClick = useCallback((bookmark: any) => {
    if (epubRenderer) {
      epubRenderer.navigateToBookmark(bookmark.position);
      setShowSidebar(false);
    }
  }, [epubRenderer]);

  const handleBookmarkAdd = useCallback(() => {
    // TODO: Implement add bookmark
    console.log('Add bookmark');
  }, []);

  const handleBookmarkDelete = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  }, []);

  const handleProgressChange = useCallback((progress: number) => {
    if (epubRenderer) {
      // Navigate to progress - this would need to be implemented in EPUBRenderer
      // For now, just update the progress state
      setReadingProgress(progress);
    }
  }, [epubRenderer]);

  // Display options handlers
  const handleThemeChange = useCallback((theme: 'light' | 'dark') => {
    if (epubRenderer && readingSettings) {
      const newTheme: ReadingTheme = theme === 'dark' 
        ? { 
            name: 'dark', 
            background: '#1a1a1a', 
            text: '#ffffff',
            link: '#60a5fa',
            highlight: '#fbbf24',
            selection: '#3b82f6',
            code: '#10b981',
            border: '#374151',
            blockquote: '#6b7280'
          } 
        : { 
            name: 'light', 
            background: '#ffffff', 
            text: '#000000',
            link: '#2563eb',
            highlight: '#f59e0b',
            selection: '#3b82f6',
            code: '#059669',
            border: '#e5e7eb',
            blockquote: '#6b7280'
          };
      epubRenderer.setTheme(theme);
      setReadingSettings(prev => prev ? { ...prev, theme: newTheme } : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleFontChange = useCallback((font: string) => {
    if (epubRenderer && readingSettings) {
      const fontFamily = font === 'Original' ? 'serif' : 
                        font === 'Georgia' ? 'serif' :
                        font === 'Times New Roman' ? 'serif' :
                        font === 'Helvetica' ? 'sans-serif' :
                        font === 'Arial' ? 'sans-serif' :
                        font === 'Verdana' ? 'sans-serif' : 'serif';
      const newTypography = { ...readingSettings.typography, fontFamily: fontFamily as 'serif' | 'sans-serif' | 'monospace' | 'dyslexia-friendly' };
      epubRenderer.updateReadingSettings({ typography: newTypography });
      setReadingSettings(prev => prev ? { ...prev, typography: newTypography } : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleFontSizeChange = useCallback((size: number) => {
    if (epubRenderer && readingSettings) {
      const newTypography = { ...readingSettings.typography, fontSize: size };
      epubRenderer.updateReadingSettings({ typography: newTypography });
      setReadingSettings(prev => prev ? { ...prev, typography: newTypography } : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleLineHeightChange = useCallback((height: number) => {
    if (epubRenderer && readingSettings) {
      const newTypography = { ...readingSettings.typography, lineHeight: height };
      epubRenderer.updateReadingSettings({ typography: newTypography });
      setReadingSettings(prev => prev ? { ...prev, typography: newTypography } : null);
    }
  }, [epubRenderer, readingSettings]);

  const handleJustificationChange = useCallback((newJustification: 'left' | 'justify') => {
    setJustification(newJustification);
  }, []);

  const handlePageLayoutChange = useCallback((layout: 'single' | 'double' | 'three-column') => {
    setPageLayout(layout);
  }, []);

  // Memoized loading and error states
  const loadingState = useMemo(() => (
    <div className="flex items-center justify-center h-96">
      <div className="text-gray-500">Loading Readium EPUB reader...</div>
    </div>
  ), []);

  const errorState = useMemo(() => (
    <div className="flex items-center justify-center h-96">
      <div className="text-red-500 text-center">
        <div className="text-lg font-semibold mb-2">Failed to load Readium EPUB reader</div>
        <div className="text-sm">{error}</div>
      </div>
    </div>
  ), [error]);

  const initializingState = useMemo(() => (
    <div className="flex items-center justify-center h-96">
      <div className="text-gray-500">Initializing Readium renderer...</div>
    </div>
  ), []);

  if (isLoading) return loadingState;
  if (error) return errorState;
  if (!epubRenderer) return initializingState;

  return (
    <div className="relative w-full h-full bg-gray-50">
      {/* Header */}
      {showHeader && (
        <ReadingHeader
          bookTitle={bookTitle}
          author={bookAuthor}
          currentChapter={chapters.find(c => c.id === currentChapter)?.title || 'Introduction'}
          onBack={handleBack}
          onSearch={handleSearch}
          onTextSize={handleTextSize}
          onMenu={handleMenu}
          onBookmark={handleBookmark}
          onHelp={handleHelp}
          onMore={handleMore}
          onProfile={handleProfile}
          onFullscreen={handleFullscreen}
        />
      )}

      {/* Main reading area */}
      <div 
        className={`relative w-full ${showHeader ? 'pt-16' : ''} ${showFooter ? 'pb-16' : ''}`}
        style={{ height: showHeader && showFooter ? 'calc(100vh - 128px)' : showHeader || showFooter ? 'calc(100vh - 64px)' : '100vh' }}
      >
        <div
          ref={contentRef}
          className="w-full h-full overflow-auto"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
          style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: readingSettings?.typography?.lineHeight ? `${readingSettings.typography.lineHeight}%` : '150%',
            fontSize: readingSettings?.typography?.fontSize ? `${readingSettings.typography.fontSize}%` : '100%',
            fontFamily: readingSettings?.typography?.fontFamily || 'Georgia, serif',
            textAlign: justification === 'justify' ? 'justify' : 'left',
            color: readingSettings?.theme?.text || '#1a1a1a',
            backgroundColor: readingSettings?.theme?.background || '#fafafa'
          }}
        >
          {/* Fallback content if EPUB doesn't render */}
          {!isRendered && epubRenderer && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Loading Book Content...</h2>
              <p className="text-gray-600">Please wait while we prepare your reading experience.</p>
            </div>
          )}
        </div>
        
        {/* Highlight toolbar */}
        {showHighlightToolbar && currentSelection && (
          <HighlightToolbar
            onHighlightCreate={handleHighlightCreate}
            onClose={() => {
              setShowHighlightToolbar(false);
              setCurrentSelection(null);
            }}
          />
        )}
      </div>

      {/* Footer */}
      {showFooter && (
        <ReadingFooter
          currentPage={currentPage}
          totalPages={totalPages}
          progress={readingProgress}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          onProgressChange={handleProgressChange}
        />
      )}

      {/* Sidebar */}
      <ReadingSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        chapters={chapters}
        bookmarks={bookmarks}
        currentChapter={currentChapter}
        onChapterClick={handleChapterClick}
        onBookmarkClick={handleBookmarkClick}
        onBookmarkAdd={handleBookmarkAdd}
        onBookmarkDelete={handleBookmarkDelete}
        theme={readingSettings?.theme?.name === 'dark' ? 'dark' : 'light'}
        onThemeChange={handleThemeChange}
        font={readingSettings?.typography?.fontFamily || 'Original'}
        onFontChange={handleFontChange}
        fontSize={readingSettings?.typography?.fontSize || 100}
        onFontSizeChange={handleFontSizeChange}
        lineHeight={readingSettings?.typography?.lineHeight || 100}
        onLineHeightChange={handleLineHeightChange}
        justification={justification}
        onJustificationChange={handleJustificationChange}
        pageLayout={pageLayout}
        onPageLayoutChange={handlePageLayoutChange}
      />
    </div>
  );
}
