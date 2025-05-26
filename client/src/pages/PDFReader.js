import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, queries } from '../lib/supabase';
import { DocumentTextIcon, BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon } from '@heroicons/react/outline';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { ResponsiveLayout, ResponsiveButton } from '../components/ResponsiveLayout';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Memoized page component for better performance
const PDFPage = memo(({ page, scale, onRender }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const renderPage = async () => {
      try {
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        onRender?.();
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    };

    renderPage();
  }, [page, scale, onRender]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ touchAction: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
});

const PDFReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [scale, setScale] = useState(1.5);
  const [currentPageObj, setCurrentPageObj] = useState(null);
  const pdfDocRef = useRef(null);
  const renderTimeoutRef = useRef(null);

  // Fetch book details and initialize PDF
  useEffect(() => {
    const initializeReader = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const bookData = await queries.getBooks({ id: bookId });
        if (!bookData) throw new Error('Book not found');
        
        setBook(bookData);
        
        if (bookData.pdf_url) {
          const loadingTask = pdfjsLib.getDocument({
            url: bookData.pdf_url,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.12.313/cmaps/',
            cMapPacked: true,
            disableStream: true,
            disableAutoFetch: true
          });

          const pdfDoc = await loadingTask.promise;
          pdfDocRef.current = pdfDoc;
          setTotalPages(pdfDoc.numPages);
          
          const initialPage = bookData.reading_progress?.[0]?.progress
            ? Math.ceil((bookData.reading_progress[0].progress / 100) * pdfDoc.numPages)
            : 1;
          
          setCurrentPage(initialPage);
          await loadPage(initialPage);
        }
      } catch (error) {
        console.error('Error initializing reader:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeReader();
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [bookId, navigate]);

  // Load bookmarks
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const bookmarks = await queries.getBookmarks(user.id, bookId);
        setBookmarks(bookmarks);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };

    loadBookmarks();
  }, [bookId]);

  const loadPage = useCallback(async (pageNumber) => {
    if (!pdfDocRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(pageNumber);
      setCurrentPageObj(page);
    } catch (error) {
      console.error('Error loading page:', error);
    }
  }, []);

  const handlePageChange = useCallback(async (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      await loadPage(newPage);
      
      // Debounce progress update
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      renderTimeoutRef.current = setTimeout(() => {
        updateReadingProgress(newPage);
      }, 1000);
    }
  }, [totalPages, loadPage]);

  const updateReadingProgress = async (page) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const progress = Math.min(100, Math.max(0, (page / totalPages) * 100));
      await queries.updateReadingProgress(user.id, bookId, progress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleZoom = (delta) => {
    setScale(prevScale => Math.max(0.5, Math.min(3, prevScale + delta)));
  };

  const handleAddBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const note = prompt('Add a note to this bookmark (optional):');
      await queries.addBookmark(user.id, bookId, currentPage, note);
      const bookmarks = await queries.getBookmarks(user.id, bookId);
      setBookmarks(bookmarks);
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    try {
      await queries.removeBookmark(bookmarkId);
      const { data: { user } } = await supabase.auth.getUser();
      const bookmarks = await queries.getBookmarks(user.id, bookId);
      setBookmarks(bookmarks);
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ResponsiveLayout>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <ResponsiveButton
              onClick={() => navigate('/myshelf')}
              variant="secondary"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </ResponsiveButton>
            <h1 className="text-xl font-semibold">{book?.title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ResponsiveButton
              onClick={() => handleZoom(-0.2)}
              variant="secondary"
            >
              <ZoomOutIcon className="h-5 w-5" />
            </ResponsiveButton>
            <ResponsiveButton
              onClick={() => handleZoom(0.2)}
              variant="secondary"
            >
              <ZoomInIcon className="h-5 w-5" />
            </ResponsiveButton>
            <ResponsiveButton
              onClick={() => setShowBookmarks(!showBookmarks)}
              variant="secondary"
            >
              <BookmarkIcon className="h-6 w-6" />
            </ResponsiveButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* PDF Viewer */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg p-4">
            {currentPageObj && (
              <PDFPage
                page={currentPageObj}
                scale={scale}
                onRender={() => updateReadingProgress(currentPage)}
              />
            )}
          </div>

          {/* Navigation Controls */}
          <div className="mt-4 flex justify-between items-center">
            <ResponsiveButton
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              variant="secondary"
            >
              Previous
            </ResponsiveButton>
            <span className="text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <ResponsiveButton
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              variant="secondary"
            >
              Next
            </ResponsiveButton>
          </div>
        </div>

        {/* Bookmarks Panel */}
        {showBookmarks && (
          <div className="w-80 ml-8 bg-white rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Bookmarks</h2>
              <ResponsiveButton
                onClick={handleAddBookmark}
                variant="secondary"
              >
                Add Bookmark
              </ResponsiveButton>
            </div>
            <div className="space-y-2">
              {bookmarks.map(bookmark => (
                <div
                  key={bookmark.id}
                  className="flex justify-between items-start p-2 bg-gray-50 rounded"
                >
                  <div>
                    <button
                      onClick={() => handlePageChange(bookmark.page_number)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      Page {bookmark.page_number}
                    </button>
                    {bookmark.note && (
                      <p className="text-sm text-gray-600 mt-1">
                        {bookmark.note}
                      </p>
                    )}
                  </div>
                  <ResponsiveButton
                    onClick={() => handleRemoveBookmark(bookmark.id)}
                    variant="secondary"
                  >
                    Remove
                  </ResponsiveButton>
                </div>
              ))}
              {bookmarks.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No bookmarks yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default PDFReader; 