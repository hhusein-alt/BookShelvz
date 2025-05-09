import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { useTheme } from '../context/ThemeContext';
import { DocumentTextIcon, BookmarkIcon, ClockIcon, LightBulbIcon, BookOpenIcon, PencilIcon } from '@heroicons/react/outline';
import { useNavigate } from 'react-router-dom';

const MyShelf = () => {
  const [userBooks, setUserBooks] = useState([]);
  const [stats, setStats] = useState({
    totalBooks: 0,
    favoriteGenre: '',
    favoriteAuthor: '',
    genres: {},
    totalReadingTime: 0,
    averageReadingTime: 0
  });
  const [user, setUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [note, setNote] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const { genreTheme, genreThemes, updateGenreTheme } = useTheme();
  const currentTheme = genreTheme ? genreThemes[genreTheme] : genreThemes['self-development'];
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reading'); // reading, completed, notes

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserShelf();
    }
  }, [user]);

  useEffect(() => {
    calculateStats();
  }, [userBooks]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    }
  };

  const fetchUserShelf = async () => {
    try {
      const { data, error } = await supabase
        .from('user_shelves')
        .select(`
          *,
          books (*),
          reading_progress (*),
          notes (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserBooks(data);
      fetchRecommendations(data);
    } catch (error) {
      console.error('Error fetching user shelf:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (userBooks) => {
    try {
      // Get user's favorite genres
      const genres = Object.entries(stats.genres)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([genre]) => genre);

      // Fetch recommended books based on favorite genres
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .in('genre', genres)
        .not('id', 'in', userBooks.map(book => book.book_id))
        .limit(4);

      if (error) throw error;
      setRecommendations(data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const updateReadingProgress = async (bookId, progress) => {
    try {
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          progress,
          last_read: new Date().toISOString()
        });

      if (error) throw error;
      fetchUserShelf();
    } catch (error) {
      console.error('Error updating reading progress:', error);
    }
  };

  const addNote = async (bookId) => {
    if (!note.trim()) return;

    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          book_id: bookId,
          content: note,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      setNote('');
      fetchUserShelf();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const calculateStats = () => {
    const genres = {};
    const authors = {};
    let maxGenreCount = 0;
    let maxAuthorCount = 0;
    let favoriteGenre = '';
    let favoriteAuthor = '';
    let totalReadingTime = 0;

    userBooks.forEach(item => {
      const book = item.books;
      
      // Count genres
      genres[book.genre] = (genres[book.genre] || 0) + 1;
      if (genres[book.genre] > maxGenreCount) {
        maxGenreCount = genres[book.genre];
        favoriteGenre = book.genre;
      }

      // Count authors
      authors[book.author] = (authors[book.author] || 0) + 1;
      if (authors[book.author] > maxAuthorCount) {
        maxAuthorCount = authors[book.author];
        favoriteAuthor = book.author;
      }

      // Calculate reading time (assuming average reading speed of 200 words per minute)
      const wordCount = book.description.split(' ').length;
      const estimatedTime = Math.ceil(wordCount / 200); // in minutes
      totalReadingTime += estimatedTime;
    });

    setStats({
      totalBooks: userBooks.length,
      favoriteGenre,
      favoriteAuthor,
      genres,
      totalReadingTime,
      averageReadingTime: userBooks.length ? Math.round(totalReadingTime / userBooks.length) : 0
    });

    // Update theme based on favorite genre
    if (favoriteGenre && genreThemes[favoriteGenre]) {
      updateGenreTheme(favoriteGenre);
    }
  };

  const openPDF = (pdfUrl) => {
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`${currentTheme.primary} min-h-screen py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className={`${currentTheme.secondary} rounded-lg p-6 mb-8`}>
          <h2 className={`text-2xl font-bold ${currentTheme.text} mb-4`}>
            Your Reading Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`${currentTheme.primary} p-4 rounded-lg`}>
              <h3 className={`text-lg font-semibold ${currentTheme.text}`}>
                Total Books
              </h3>
              <p className={`text-3xl font-bold ${currentTheme.accent}`}>
                {stats.totalBooks}
              </p>
            </div>
            <div className={`${currentTheme.primary} p-4 rounded-lg`}>
              <h3 className={`text-lg font-semibold ${currentTheme.text}`}>
                Favorite Genre
              </h3>
              <p className={`text-xl ${currentTheme.accent}`}>
                {stats.favoriteGenre || 'None'}
              </p>
            </div>
            <div className={`${currentTheme.primary} p-4 rounded-lg`}>
              <h3 className={`text-lg font-semibold ${currentTheme.text}`}>
                Favorite Author
              </h3>
              <p className={`text-xl ${currentTheme.accent}`}>
                {stats.favoriteAuthor || 'None'}
              </p>
            </div>
            <div className={`${currentTheme.primary} p-4 rounded-lg`}>
              <h3 className={`text-lg font-semibold ${currentTheme.text}`}>
                Avg. Reading Time
              </h3>
              <p className={`text-xl ${currentTheme.accent}`}>
                {stats.averageReadingTime} min
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'reading'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Currently Reading
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'completed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'notes'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Books Grid */}
        <h2 className={`text-2xl font-bold ${currentTheme.text} mb-4`}>
          Your Books
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userBooks.map(item => {
            const book = item.books;
            const progress = item.reading_progress?.[0]?.progress || 0;
            const notes = item.notes || [];

            if (
              (activeTab === 'reading' && progress < 100) ||
              (activeTab === 'completed' && progress === 100) ||
              (activeTab === 'notes' && notes.length > 0)
            ) {
              return (
                <div
                  key={item.id}
                  className={`${currentTheme.secondary} rounded-lg shadow-md overflow-hidden`}
                >
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className={`text-lg font-semibold ${currentTheme.text}`}>
                      {book.title}
                    </h3>
                    <p className={`${currentTheme.text} opacity-75`}>
                      {book.author}
                    </p>
                    <p className={`${currentTheme.text} text-sm mt-2`}>
                      {book.genre}
                    </p>
                    
                    {/* Reading Progress */}
                    {activeTab !== 'notes' && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Progress</span>
                          <span className="text-sm font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={progress}
                          onChange={(e) => updateReadingProgress(item.book_id, parseInt(e.target.value))}
                          className="w-full mt-2"
                        />
                      </div>
                    )}

                    {/* Notes */}
                    {activeTab === 'notes' && (
                      <div className="space-y-2">
                        {notes.map(note => (
                          <div
                            key={note.id}
                            className="bg-gray-50 p-2 rounded text-sm"
                          >
                            {note.content}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const content = prompt('Add a new note:');
                            if (content) addNote(item.book_id, content);
                          }}
                          className="flex items-center space-x-1 text-blue-500 hover:text-blue-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Add Note</span>
                        </button>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => openPDF(book.pdf_url)}
                        className={`${currentTheme.accent} bg-blue-600 text-white px-4 py-2 rounded-lg w-full hover:bg-blue-700 transition-colors flex items-center justify-center`}
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        Read Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-12">
            <h2 className={`text-2xl font-bold ${currentTheme.text} mb-4`}>
              Recommended for You
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map(book => (
                <div
                  key={book.id}
                  className={`${currentTheme.secondary} rounded-lg shadow-md overflow-hidden`}
                >
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className={`text-lg font-semibold ${currentTheme.text}`}>
                      {book.title}
                    </h3>
                    <p className={`${currentTheme.text} opacity-75`}>
                      {book.author}
                    </p>
                    <p className={`${currentTheme.text} text-sm mt-2`}>
                      {book.genre}
                    </p>
                    <button
                      onClick={() => navigate(`/catalog?book=${book.id}`)}
                      className={`mt-4 ${currentTheme.accent} text-white px-4 py-2 rounded-lg w-full hover:opacity-90 transition-opacity`}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userBooks.length === 0 && (
          <div className={`text-center py-8 ${currentTheme.text}`}>
            Your shelf is empty. Start adding books from the catalog!
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShelf; 