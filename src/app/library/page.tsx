'use client';

// Library Page
// Main dashboard for managing books and highlights

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/GoogleAuthContext';
import { Navigation } from '@/components/common/Navigation';
import { BookUploadService, UploadProgress } from '@/lib/services/bookUpload';
import { GoogleDriveService } from '@/lib/services/googleDriveService';
import { SearchService } from '@/lib/services/searchService';
import { IndexedDBService } from '@/lib/storage/indexedDB';
import { CoverManager } from '@/components/books/CoverManager';
import { CoverManager as CoverManagerService } from '@/lib/services/coverManager';
import { Book } from '@/types';

export default function LibraryPage() {
  const { isAuthenticated, isLoading, user, driveInfo, signOut, accessToken } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [uploadService, setUploadService] = useState<BookUploadService | null>(null);
  const [driveService, setDriveService] = useState<GoogleDriveService | null>(null);
  const [searchService, setSearchService] = useState<SearchService | null>(null);
  const [coverManagerService, setCoverManagerService] = useState<CoverManagerService | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coverManagerOpen, setCoverManagerOpen] = useState(false);
  const [selectedBookForCover, setSelectedBookForCover] = useState<Book | null>(null);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        const uploadSvc = new BookUploadService();
        
        // Set current user for account-specific storage
        if (user?.id) {
          console.log('Library: Setting current user for account-specific storage:', user.id);
          uploadSvc.setCurrentUser(user.id);
        } else {
          console.log('Library: No user ID available, using anonymous storage');
          uploadSvc.setCurrentUser(null);
        }
        
        await uploadSvc.initialize();
        setUploadService(uploadSvc);

        // Initialize Google Drive service
        if (accessToken) {
          const driveSvc = new GoogleDriveService(accessToken);
          setDriveService(driveSvc);
        }

        // Initialize search service
        const indexedDB = new IndexedDBService();
        
        // Set current user for account-specific storage
        if (user?.id) {
          indexedDB.setCurrentUser(user.id);
        } else {
          indexedDB.setCurrentUser(null);
        }
        
        await indexedDB.initialize();
        const searchSvc = new SearchService(indexedDB);
        setSearchService(searchSvc);

        // Initialize cover manager service
        const coverMgr = new CoverManagerService();
        await coverMgr.initialize();
        setCoverManagerService(coverMgr);

        // Load books (local + remote metadata)
        const allBooks = await uploadSvc.getAllBooksWithDrive(driveService || undefined);
        console.log('Loaded books (local + remote):', allBooks);
        setBooks(allBooks);
      } catch (error) {
        console.error('Failed to initialize services:', error);
        
        // If IndexedDB error, try to force upgrade
        if (error instanceof Error && error.message.includes('IndexedDB')) {
          console.log('Attempting to force database upgrade...');
          try {
            const indexedDB = new IndexedDBService();
            await indexedDB.forceUpgrade();
            console.log('Database upgrade successful, retrying initialization...');
            // Retry initialization
            setTimeout(() => {
              initializeServices().catch(console.error);
            }, 1000);
          } catch (upgradeError) {
            console.error('Database upgrade failed:', upgradeError);
          }
        }
      }
    };
    initializeServices();
  }, [accessToken]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSignOut = () => {
    signOut();
    router.push('/logout');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadService) return;

    setIsUploading(true);
    setUploadProgress(null);

    try {
      // Initialize Google Drive folders if not already done
      let booksFolderId: string | undefined;
      if (driveService) {
        try {
          const folders = await driveService.createRequiredFolders();
          booksFolderId = folders.booksFolderId;
          console.log('Google Drive folders created:', folders);
        } catch (error) {
          console.warn('Failed to create Google Drive folders:', error);
        }
      }

      const result = await uploadService.uploadBook(
        file,
        (progress) => setUploadProgress(progress),
        driveService || undefined,
        booksFolderId
      );

      if (result.success) {
        console.log('Upload successful, book created:', result.book);
        // Refresh books list
        const updatedBooks = await uploadService.getAllBooks();
        console.log('Updated books list:', updatedBooks);
        setBooks(updatedBooks);
      } else {
        console.error('Upload failed:', result.error);
        // Handle error - could show a toast notification
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const loadBooks = async () => {
    if (uploadService) {
      const existingBooks = await uploadService.getAllBooks();
      console.log('Loaded books from IndexedDB:', existingBooks);
      setBooks(existingBooks);
    }
  };

  const handleBookClick = (book: Book) => {
    // Navigate to reader page with book
    router.push(`/reader/${book.id}`);
  };

  // Handle quick search
  const handleQuickSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Filter books based on search query
  const filteredBooks = books.filter(book => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.id.toLowerCase().includes(query)
    );
  });

  const handleDeleteBook = async (book: Book, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the book click
    
    if (!uploadService) {
      console.error('Upload service not available');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        console.log('Deleting book:', book.id);
        await uploadService.deleteBook(book.id);
        console.log('Book deleted successfully');
        
        // Refresh the books list
        await loadBooks();
        
        // Show success message (you could add a toast notification here)
        console.log('Book deleted and list refreshed');
      } catch (error) {
        console.error('Failed to delete book:', error);
        alert('Failed to delete book. Please try again.');
      }
    }
  };

  // Cover management functions
  const handleOpenCoverManager = (book: Book, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the book click
    setSelectedBookForCover(book);
    setCoverManagerOpen(true);
  };

  const handleCloseCoverManager = () => {
    setCoverManagerOpen(false);
    setSelectedBookForCover(null);
  };

  const handleCoverUpdated = async (coverUrl: string) => {
    if (selectedBookForCover) {
      // Update the book in the local state
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === selectedBookForCover.id 
            ? { ...book, cover: coverUrl }
            : book
        )
      );
    }
  };

  // Function to refresh book covers
  const refreshBookCovers = useCallback(async () => {
    if (!coverManagerService) return;
    
    const updatedBooks = await Promise.all(
      books.map(async (book) => {
        try {
          const coverResult = await coverManagerService.getBookCover(book);
          return {
            ...book,
            cover: coverResult.thumbnailUrl
          };
        } catch (error) {
          console.warn(`Failed to get cover for book ${book.id}:`, error);
          return book;
        }
      })
    );
    
    setBooks(updatedBooks);
  }, [books, coverManagerService]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navigation />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-4">
                  Welcome back, {user?.name}! 👋
                </h1>
                <p className="text-xl text-blue-100 mb-6 max-w-2xl">
                  Your personal ebook library awaits. Discover, read, and retain knowledge with intelligent highlighting and smart reviews.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-2xl mr-2">📚</span>
                    <span className="font-semibold">{books.length} Books</span>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-2xl mr-2">🎯</span>
                    <span className="font-semibold">Smart Highlights</span>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-2xl mr-2">☁️</span>
                    <span className="font-semibold">Cloud Sync</span>
                  </div>
                </div>
              </div>
              
              {/* Upload Section */}
              <div className="mt-8 lg:mt-0 lg:ml-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h3 className="text-white font-semibold mb-4 text-lg">Add New Book</h3>
                  <input
                    type="file"
                    accept=".epub,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white transition-all duration-200 ${
                      isUploading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-white/20 hover:bg-white/30 cursor-pointer hover:scale-105 shadow-lg'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isUploading ? 'Uploading...' : 'Upload Book'}
                  </label>
                  
                  {/* Upload progress */}
                  {uploadProgress && (
                    <div className="mt-4">
                      <p className="text-sm text-blue-100 mb-2">{uploadProgress.message}</p>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-white h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-200 mt-1">{uploadProgress.progress}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Search Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
                placeholder="Search your library... (title, author, or content)"
                className="w-full px-4 py-4 pl-12 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition-all duration-200"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleQuickSearch}
                disabled={!searchQuery.trim()}
                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Search
              </button>
              <button
                onClick={() => router.push('/search')}
                className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200"
              >
                Advanced
              </button>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-blue-600">{filteredBooks.length}</span> of <span className="font-semibold">{books.length}</span> books
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Modern Drive Storage Info */}
        {driveInfo && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Google Drive Storage
              </h3>
              <div className="text-sm text-gray-500">
                {Math.round(((driveInfo.usedSpace / driveInfo.totalSpace) * 100) * 10) / 10}% used
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 mb-1">
                  {Math.round((driveInfo.usedSpace / 1024 / 1024 / 1024) * 100) / 100}
                </p>
                <p className="text-sm font-medium text-blue-700">GB Used</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <p className="text-3xl font-bold text-green-600 mb-1">
                  {Math.round((driveInfo.availableSpace / 1024 / 1024 / 1024) * 100) / 100}
                </p>
                <p className="text-sm font-medium text-green-700">GB Available</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <p className="text-3xl font-bold text-gray-600 mb-1">
                  {Math.round((driveInfo.totalSpace / 1024 / 1024 / 1024) * 100) / 100}
                </p>
                <p className="text-sm font-medium text-gray-700">GB Total</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ 
                    width: `${(driveInfo.usedSpace / driveInfo.totalSpace) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Books Grid */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Your Library
            </h3>
            <div className="text-sm text-gray-600">
              {filteredBooks.length}{searchQuery ? ` of ${books.length}` : ''} books
            </div>
          </div>
          
          {filteredBooks.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">
                {searchQuery ? 'No books found' : 'Your library is empty'}
              </h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? `No books match "${searchQuery}". Try different keywords or clear the search.`
                  : 'Upload your first EPUB or PDF book to start building your personal knowledge library.'
                }
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
                >
                  Clear Search
                </button>
              ) : (
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg cursor-pointer"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Your First Book
                </label>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
                >
                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                    <button
                      onClick={(e) => handleOpenCoverManager(book, e)}
                      className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"
                      title="Change cover"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteBook(book, e)}
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
                      title="Delete book"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Book content - clickable */}
                  <div
                    onClick={() => handleBookClick(book)}
                    className="cursor-pointer p-4"
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden shadow-inner">
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center">
                          <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <p className="text-xs text-gray-500 font-medium">{book.fileType.toUpperCase()}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-xs text-gray-600 font-medium">{book.author}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                            {book.fileType.toUpperCase()}
                          </span>
                          {book.isFromDrive && (
                            <span className={`px-2 py-1 rounded-full font-medium text-xs ${
                              book.isDownloaded 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {book.isDownloaded ? 'Downloaded' : 'Cloud'}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 font-medium">
                          {Math.round(book.fileSize / 1024 / 1024)}MB
                        </span>
                      </div>
                      
                      {book.progress > 0 && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span className="font-medium">{book.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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
              ))}
            </div>
          )}
        </div>

        {/* Modern Library Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-gray-900">{books.length}</p>
                <p className="text-sm font-medium text-gray-600">Books in Library</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-gray-900">0</p>
                <p className="text-sm font-medium text-gray-600">Highlights Created</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-3xl font-bold text-gray-900">0</p>
                <p className="text-sm font-medium text-gray-600">Reviews Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push('/')}
              className="group flex items-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-lg"
            >
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-lg">Upload Book</p>
                <p className="text-sm text-gray-600">Add EPUB or PDF files to your library</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/search')}
              className="group flex items-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl hover:from-purple-100 hover:to-pink-100 transition-all duration-300 hover:shadow-lg"
            >
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-lg">Advanced Search</p>
                <p className="text-sm text-gray-600">Search across all your books and highlights</p>
              </div>
            </button>

            <button
              onClick={refreshBookCovers}
              className="group flex items-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 hover:shadow-lg"
            >
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-lg">Refresh Covers</p>
                <p className="text-sm text-gray-600">Extract covers from uploaded books</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Cover Manager Modal */}
      {selectedBookForCover && (
        <CoverManager
          book={selectedBookForCover}
          isOpen={coverManagerOpen}
          onClose={handleCloseCoverManager}
          onCoverUpdated={handleCoverUpdated}
        />
      )}
    </div>
  );
}
