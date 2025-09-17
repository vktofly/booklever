'use client';

// Library Page
// Main dashboard for managing books and highlights

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/SimpleAuthContext';
import { Navigation } from '@/components/common/Navigation';
import { BookUploadService, UploadProgress } from '@/lib/services/bookUpload';
// import { GoogleDriveService } from '@/lib/providers/googleDrive';
import { Book } from '@/types';

export default function LibraryPage() {
  const { isAuthenticated, isLoading, user, driveInfo, signOut, session } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [uploadService, setUploadService] = useState<BookUploadService | null>(null);
  const [driveService, setDriveService] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      const uploadSvc = new BookUploadService();
      await uploadSvc.initialize();
      setUploadService(uploadSvc);

      // Google Drive service will be initialized client-side only
      // if (session?.accessToken) {
      //   const driveSvc = new GoogleDriveService(session.accessToken);
      //   setDriveService(driveSvc);
      // }

      // Load existing books
      const existingBooks = await uploadSvc.getAllBooks();
      console.log('Loaded books from IndexedDB:', existingBooks);
      setBooks(existingBooks);
    };
    initializeServices();
  }, [session]);

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
      const result = await uploadService.uploadBook(
        file,
        (progress) => setUploadProgress(progress)
        // driveService, // Temporarily disabled
        // 'books-folder-id' // This would come from Drive setup
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome back, {user?.name}!
              </h2>
              <p className="text-gray-600">
                Your personal ebook library is ready. Upload your first book to get started.
              </p>
            </div>
            
            {/* Upload button */}
            <div className="flex items-center space-x-4">
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
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  isUploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                } transition-colors`}
              >
                {isUploading ? 'Uploading...' : 'Upload Book'}
              </label>
            </div>
          </div>
          
          {/* Upload progress */}
          {uploadProgress && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">{uploadProgress.message}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress.progress}%</p>
            </div>
          )}
        </div>

        {/* Drive info */}
        {driveInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Google Drive Storage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((driveInfo.usedSpace / 1024 / 1024 / 1024) * 100) / 100} GB
                </p>
                <p className="text-sm text-gray-600">Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((driveInfo.availableSpace / 1024 / 1024 / 1024) * 100) / 100} GB
                </p>
                <p className="text-sm text-gray-600">Available</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {Math.round((driveInfo.totalSpace / 1024 / 1024 / 1024) * 100) / 100} GB
                </p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${(driveInfo.usedSpace / driveInfo.totalSpace) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Books grid */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Books ({books.length})</h3>
          
          {books.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No books yet</h4>
              <p className="text-gray-600 mb-4">Upload your first EPUB or PDF book to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors relative group"
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteBook(book, e)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Delete book"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Book content - clickable */}
                  <div
                    onClick={() => handleBookClick(book)}
                    className="cursor-pointer"
                  >
                    <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                      {book.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">{book.author}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="uppercase">{book.fileType}</span>
                      <span>{Math.round(book.fileSize / 1024 / 1024)}MB</span>
                    </div>
                    {book.progress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full"
                            style={{ width: `${book.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{book.progress}% read</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Library stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{books.length}</p>
                <p className="text-sm text-gray-600">Books in Library</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Highlights Created</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Reviews Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Upload Book</p>
                <p className="text-sm text-gray-600">Add EPUB or PDF files to your library</p>
              </div>
            </button>

            <button
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              disabled
            >
              <div className="p-2 bg-gray-100 rounded-lg mr-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-500">View Highlights</p>
                <p className="text-sm text-gray-400">Browse and manage your highlights</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
