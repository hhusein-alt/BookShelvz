import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../App';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const { genreTheme, genreThemes } = useTheme();
  const currentTheme = genreTheme ? genreThemes[genreTheme] : genreThemes['self-development'];

  useEffect(() => {
    fetchFeaturedBooks();
  }, []);

  const fetchFeaturedBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .limit(4);

      if (error) throw error;
      setFeaturedBooks(data);
    } catch (error) {
      console.error('Error fetching featured books:', error);
    }
  };

  return (
    <div className={`${currentTheme.primary} min-h-screen`}>
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className={`text-4xl font-bold ${currentTheme.text} mb-4`}>
          Welcome to BookShelf
        </h1>
        <p className={`text-xl ${currentTheme.text} mb-8`}>
          Your digital library for discovering and collecting amazing books
        </p>
        <Link
          to="/catalog"
          className={`${currentTheme.accent} bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors`}
        >
          Browse Catalog
        </Link>
      </div>

      {/* Featured Books Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className={`text-3xl font-bold ${currentTheme.text} mb-8`}>
          Featured Books
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredBooks.map((book) => (
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
                <Link
                  to={`/catalog/${book.id}`}
                  className={`${currentTheme.accent} mt-4 inline-block`}
                >
                  Learn More
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className={`${currentTheme.secondary} py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className={`text-xl font-semibold ${currentTheme.text} mb-4`}>
                Easy Purchase
              </h3>
              <p className={`${currentTheme.text} opacity-75`}>
                Buy books through WhatsApp or Instagram with simple payment process
              </p>
            </div>
            <div className="text-center">
              <h3 className={`text-xl font-semibold ${currentTheme.text} mb-4`}>
                Digital Library
              </h3>
              <p className={`${currentTheme.text} opacity-75`}>
                Access your books anytime, anywhere with our digital shelf
              </p>
            </div>
            <div className="text-center">
              <h3 className={`text-xl font-semibold ${currentTheme.text} mb-4`}>
                Reading Stats
              </h3>
              <p className={`${currentTheme.text} opacity-75`}>
                Track your reading habits and discover your favorite genres
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 