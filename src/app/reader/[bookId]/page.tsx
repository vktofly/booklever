'use client';

// Reader Page
// Displays the book reader with highlighting functionality

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/SimpleAuthContext';
import { EPUBReader } from '@/lib/readers/web/EPUBReader';
import { Highlight } from '@/lib/readers/shared';
import { BookUploadService } from '@/lib/services/bookUpload';
import { Navigation } from '@/components/common/Navigation';
import dynamic from 'next/dynamic';

// Dynamically import PDFReader to avoid loading PDF.js when not needed
const PDFReader = dynamic(() => import('@/lib/readers/web/PDFReader').then(mod => ({ default: mod.PDFReader })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 text-gray-500">Loading PDF reader...</div>
});

export default function ReaderPage() {
  const { bookId } = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookData, setBookData] = useState<Uint8Array | null>(null);
  const [book, setBook] = useState<any>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [uploadService, setUploadService] = useState<BookUploadService | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        await service.initialize();
        setUploadService(service);
        
        // Load book data
        console.log('Loading book with ID:', bookId);
        const storedBook = await service.getBook(bookId as string);
        console.log('Retrieved book:', storedBook);
        
        if (storedBook) {
          setBook(storedBook);
          setBookData(storedBook.fileData);
          console.log('Book loaded successfully, fileData size:', storedBook.fileData?.length);
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
  }, [bookId, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleHighlightCreate = (highlight: Highlight) => {
    setHighlights(prev => [...prev, highlight]);
    console.log('New highlight created:', highlight);
  };

  const handleHighlightUpdate = (highlight: Highlight) => {
    setHighlights(prev => prev.map(h => h.id === highlight.id ? highlight : h));
    console.log('Highlight updated:', highlight);
  };

  const handleHighlightDelete = (highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
    console.log('Highlight deleted:', highlightId);
  };

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

    if (book.fileType === 'epub') {
      console.log('Reader: Rendering EPUB with modern renderer');
      return (
        <EPUBReader
          bookData={bookData}
          bookId={book.id}
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
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Book header */}
        {book && (
          <div className="mb-6">
            <button
              onClick={() => router.push('/library')}
              className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Library
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
            <p className="text-gray-600">by {book.author}</p>
          </div>
        )}

        {/* Reader */}
        <div className="bg-white rounded-lg shadow min-h-[600px]">
          {renderReader()}
        </div>

        {/* Highlights panel */}
        {highlights.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Highlights ({highlights.length})
            </h3>
            <div className="space-y-3">
              {highlights.map(highlight => (
                <div key={highlight.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{highlight.text}</p>
                      {highlight.note && (
                        <p className="text-xs text-gray-600 mt-1">{highlight.note}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <div 
                        className={`w-4 h-4 rounded ${
                          highlight.color === 'yellow' ? 'bg-yellow-300' :
                          highlight.color === 'blue' ? 'bg-blue-300' :
                          highlight.color === 'pink' ? 'bg-pink-300' :
                          'bg-green-300'
                        }`}
                      />
                      <button
                        onClick={() => handleHighlightDelete(highlight.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
