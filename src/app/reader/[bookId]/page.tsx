'use client';

// Reader Page
// Displays the book reader with highlighting functionality

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/GoogleAuthContext';
import { EPUBReader } from '@/lib/readers/web/EPUBReader';
import { Highlight } from '@/lib/readers/shared';
import { BookUploadService } from '@/lib/services/bookUpload';
import { IndexedDBService } from '@/lib/storage/indexedDB';
import { GoogleDriveService } from '@/lib/services/googleDriveService';
import { HighlightSyncService } from '@/lib/services/highlightSyncService';
import { Navigation } from '@/components/common/Navigation';
import { HighlightManager } from '@/components/reader/HighlightManager';
import { SyncStatus } from '@/components/sync/SyncStatus';
import dynamic from 'next/dynamic';

// Dynamically import PDFReader to avoid loading PDF.js when not needed
const PDFReader = dynamic(() => import('@/lib/readers/web/PDFReader').then(mod => ({ default: mod.PDFReader })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 text-gray-500">Loading PDF reader...</div>
});

export default function ReaderPage() {
  const { bookId } = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken, user } = useAuth();
  const [bookData, setBookData] = useState<Uint8Array | null>(null);
  const [book, setBook] = useState<any>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [uploadService, setUploadService] = useState<BookUploadService | null>(null);
  const [indexedDB, setIndexedDB] = useState<IndexedDBService | null>(null);
  const [driveService, setDriveService] = useState<GoogleDriveService | null>(null);
  const [syncService, setSyncService] = useState<HighlightSyncService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHighlights, setShowHighlights] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSyncTime: null as Date | null,
    syncError: null as string | null,
    pendingChanges: 0
  });

  // Initialize upload service and load book data
  useEffect(() => {
    const initializeAndLoadBook = async () => {
      if (!bookId) {
        console.log('Missing bookId:', bookId);
        return;
      }

      try {
        setIsLoading(true);
        
        // Initialize upload service
        console.log('Initializing upload service...');
        const service = new BookUploadService();
        
        // Set current user for account-specific storage
        if (user?.id) {
          console.log('Setting current user for account-specific storage:', user.id);
          service.setCurrentUser(user.id);
        } else {
          console.log('No user ID available, using anonymous storage');
          service.setCurrentUser(null);
        }
        
        await service.initialize();
        setUploadService(service);
        
        // Initialize IndexedDB service
        console.log('Initializing IndexedDB service...');
        const db = new IndexedDBService();
        
        // Set current user for account-specific storage
        if (user?.id) {
          db.setCurrentUser(user.id);
        } else {
          db.setCurrentUser(null);
        }
        
        await db.initialize();
        setIndexedDB(db);
        
        // Initialize Google Drive service if authenticated
        if (accessToken) {
          console.log('Initializing Google Drive service...');
          const drive = new GoogleDriveService(accessToken);
          setDriveService(drive);
          
          // Initialize sync service
          console.log('Initializing sync service...');
          const sync = new HighlightSyncService(db, drive);
          await sync.initialize();
          setSyncService(sync);
        }
        
        // Load book data
        console.log('Loading book with ID:', bookId);
        let storedBook = await service.getBook(bookId as string);
        console.log('Retrieved book:', storedBook);
        
        if (storedBook) {
          setBook(storedBook);
          setBookData(storedBook.fileData);
          console.log('Book loaded successfully, fileData size:', storedBook.fileData?.length);
          
          // Load existing highlights from IndexedDB
          console.log('Loading highlights for book:', bookId);
          const existingHighlights = await db.getHighlightsForBook(bookId as string);
          console.log('Retrieved highlights:', existingHighlights);
          setHighlights(existingHighlights);
        } else if (bookId.toString().startsWith('drive-') && driveService) {
          // Book is from Google Drive but not downloaded yet
          console.log('Book is from Google Drive, downloading...');
          try {
            const downloadProgress = (progress: number) => {
              console.log('Download progress:', progress + '%');
            };
            
            storedBook = await service.downloadBookFromDrive(
              bookId as string, 
              driveService, 
              downloadProgress
            );
            
            if (storedBook) {
              setBook(storedBook);
              setBookData(storedBook.fileData);
              console.log('Book downloaded and loaded successfully');
              
              // Load existing highlights from IndexedDB
              const existingHighlights = await db.getHighlightsForBook(bookId as string);
              setHighlights(existingHighlights);
            } else {
              throw new Error('Failed to download book from Drive');
            }
          } catch (downloadError) {
            console.error('Failed to download book from Drive:', downloadError);
            router.push('/library');
          }
        } else {
          console.log('Book not found, redirecting to library');
          // Book not found, redirect to library
          router.push('/library');
        }
      } catch (error) {
        console.error('Failed to initialize service or load book:', error);
        router.push('/library');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndLoadBook();
  }, [accessToken, bookId, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle user changes - clear data when switching accounts
  useEffect(() => {
    const handleUserChange = async () => {
      if (uploadService && user?.id) {
        console.log('User changed, clearing previous user data');
        try {
          await uploadService.clearUserData();
          console.log('Previous user data cleared successfully');
        } catch (error) {
          console.error('Failed to clear previous user data:', error);
        }
      }
    };

    handleUserChange();
  }, [user?.id, uploadService]);

  const handleHighlightCreate = async (highlight: Highlight) => {
    try {
      if (indexedDB) {
        await indexedDB.storeHighlight(highlight);
        setHighlights(prev => [...prev, highlight]);
        console.log('New highlight created and stored:', highlight);
        
        // Auto-sync if sync service is available
        if (syncService && bookId) {
          await syncService.autoSync(bookId as string);
          setSyncStatus(syncService.getSyncStatus());
        }
      }
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  const handleHighlightUpdate = async (highlight: Highlight) => {
    try {
      if (indexedDB) {
        await indexedDB.updateHighlight(highlight.id, highlight);
        setHighlights(prev => prev.map(h => h.id === highlight.id ? highlight : h));
        console.log('Highlight updated and stored:', highlight);
        
        // Auto-sync if sync service is available
        if (syncService && bookId) {
          await syncService.autoSync(bookId as string);
          setSyncStatus(syncService.getSyncStatus());
        }
      }
    } catch (error) {
      console.error('Failed to update highlight:', error);
    }
  };

  const handleHighlightDelete = async (highlightId: string) => {
    try {
      if (indexedDB) {
        await indexedDB.deleteHighlight(highlightId);
        setHighlights(prev => prev.filter(h => h.id !== highlightId));
        console.log('Highlight deleted:', highlightId);
        
        // Auto-sync if sync service is available
        if (syncService && bookId) {
          await syncService.autoSync(bookId as string);
          setSyncStatus(syncService.getSyncStatus());
        }
      }
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  // Sync functions
  const handleSync = async () => {
    if (syncService && bookId) {
      try {
        await syncService.syncToDrive(bookId as string);
        setSyncStatus(syncService.getSyncStatus());
      } catch (error) {
        console.error('Sync failed:', error);
        setSyncStatus(syncService.getSyncStatus());
      }
    }
  };

  const handleForceSync = async () => {
    if (syncService && bookId) {
      try {
        await syncService.forceSync(bookId as string);
        setSyncStatus(syncService.getSyncStatus());
      } catch (error) {
        console.error('Force sync failed:', error);
        setSyncStatus(syncService.getSyncStatus());
      }
    }
  };

  // Update sync status periodically
  useEffect(() => {
    if (syncService) {
      const interval = setInterval(() => {
        setSyncStatus(syncService.getSyncStatus());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [syncService]);

  const renderReader = () => {
    if (!bookData || !book) {
      console.log('Reader: Missing bookData or book:', { bookData: !!bookData, book: !!book });
      return (
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">Loading book...</p>
          </div>
        </div>
      );
    }

    console.log('Reader: Rendering book type:', book.fileType, 'with data size:', bookData.length);

    try {
      if (book.fileType === 'epub') {
        console.log('Reader: Rendering EPUB with modern renderer');
        return (
          <EPUBReader
            bookData={bookData}
            bookId={book.id}
            bookTitle={book.title}
            bookAuthor={book.author}
            highlights={highlights}
            onHighlightCreate={handleHighlightCreate}
            onHighlightUpdate={handleHighlightUpdate}
            onHighlightDelete={handleHighlightDelete}
          />
        );
      } else {
        return (
          <PDFReader
            bookData={bookData}
            bookId={book.id}
            highlights={highlights}
            onHighlightCreate={handleHighlightCreate}
            onHighlightUpdate={handleHighlightUpdate}
            onHighlightDelete={handleHighlightDelete}
          />
        );
      }
    } catch (error) {
      console.error('Reader: Error rendering book:', error);
      return (
        <div className="flex items-center justify-center h-96 text-red-500">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Error Loading Book</h3>
            <p className="text-sm">There was an error loading the book. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Book Header */}
        {book && (
          <div className="mb-8">
            <button
              onClick={() => router.push('/library')}
              className="mb-6 inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Library
            </button>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
                  <p className="text-lg text-gray-600 mb-4">by {book.author}</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center bg-blue-50 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-blue-700">{book.fileType.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center bg-gray-50 rounded-full px-3 py-1">
                      <span className="text-sm font-medium text-gray-700">{Math.round(book.fileSize / 1024 / 1024)}MB</span>
                    </div>
                    {book.progress > 0 && (
                      <div className="flex items-center bg-green-50 rounded-full px-3 py-1">
                        <span className="text-sm font-medium text-green-700">{book.progress}% read</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowHighlights(!showHighlights)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                      showHighlights 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Highlights ({highlights.length})
                  </button>
                  
                  {book.progress > 0 && (
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-blue-700">Reading Progress</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${book.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Reader and Highlights Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reader */}
          <div className={`${showHighlights ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 min-h-[600px] overflow-hidden`}>
            {renderReader()}
          </div>

          {/* Modern Highlights Panel */}
          {showHighlights && (
            <div className="lg:col-span-1 space-y-6">
              {/* Sync Status */}
              {syncService && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <SyncStatus
                    syncStatus={syncStatus}
                    onSync={handleSync}
                    onForceSync={handleForceSync}
                    bookId={bookId as string}
                  />
                </div>
              )}
              
              {/* Highlight Manager */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Your Highlights
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{highlights.length} highlights created</p>
                </div>
                <HighlightManager
                  highlights={highlights}
                  onHighlightUpdate={handleHighlightUpdate}
                  onHighlightDelete={handleHighlightDelete}
                  onHighlightClick={(highlight) => {
                    // TODO: Navigate to highlight position in reader
                    console.log('Navigate to highlight:', highlight);
                  }}
                />
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
