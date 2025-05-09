import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { DocumentTextIcon, BookmarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/outline';

const PDFReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  useEffect(() => {
    fetchBookDetails();
    fetchBookmarks();
  }, [bookId]);

  const fetchBookDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          reading_progress (
            progress,
            last_read
          )
        `)
        .eq('id', bookId)
        .single();

      if (error) throw error;
      setBook(data);
      
      // Set initial page from reading progress
      if (data.reading_progress?.[0]?.progress) {
        const progress = data.reading_progress[0].progress;
        setCurrentPage(Math.ceil((progress / 100) * totalPages));
      }
    } catch (error) {
      console.error('Error fetching book:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('page_number');

      if (error) throw error;
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const updateReadingProgress = async (page) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const progress = Math.min(100, Math.max(0, (page / totalPages) * 100));

      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          progress: progress,
          last_read: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const addBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const note = prompt('Add a note to this bookmark (optional):');

      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          book_id: bookId,
          page_number: currentPage,
          note: note || null
        });

      if (error) throw error;
      fetchBookmarks();
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  const removeBookmark = async (bookmarkId) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;
      fetchBookmarks();
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      updateReadingProgress(newPage);
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/myshelf')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold">{book?.title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="text-gray-600 hover:text-gray-900"
            >
              <BookmarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex">
          {/* PDF Viewer */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <iframe
                src={`${book?.pdf_url}#page=${currentPage}`}
                className="w-full h-[calc(100vh-200px)]"
                title="PDF Viewer"
              />
            </div>

            {/* Navigation Controls */}
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Bookmarks Panel */}
          {showBookmarks && (
            <div className="w-80 ml-8 bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Bookmarks</h2>
                <button
                  onClick={addBookmark}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Add Bookmark
                </button>
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
                    <button
                      onClick={() => removeBookmark(bookmark.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
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
      </div>
    </div>
  );
};

export default PDFReader; 