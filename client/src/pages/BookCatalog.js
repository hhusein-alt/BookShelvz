import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../App';
import { FilterIcon } from '@heroicons/react/outline';

const BookCatalog = () => {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    checkUser();
    fetchBooks();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          book_categories (
            category_id,
            categories (
              id,
              name,
              icon
            )
          )
        `)
        .order('title');

      if (error) throw error;
      setBooks(data);
      setFilteredBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const filterBooks = () => {
    let filtered = books;

    if (searchTerm) {
      filtered = filtered.filter(
        book =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedGenre) {
      filtered = filtered.filter(book => book.genre === selectedGenre);
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(book =>
        book.book_categories.some(bc =>
          selectedCategories.includes(bc.category_id)
        )
      );
    }

    setFilteredBooks(filtered);
  };

  useEffect(() => {
    filterBooks();
  }, [searchTerm, selectedGenre, selectedCategories]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddToShelf = async (bookId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            book_id: bookId,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      // Redirect to Linktree for payment
      window.open('https://linktr.ee/BookShelvzz', '_blank');
    } catch (error) {
      console.error('Error adding book to shelf:', error);
    }
  };

  const genres = [...new Set(books.map(book => book.genre))];

  return (
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Book Catalog</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <FilterIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map(category => (
                <label
                  key={category.id}
                  className={`flex items-center space-x-2 p-2 rounded border ${
                    selectedCategories.includes(category.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="form-checkbox"
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map(book => (
          <div
            key={book.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{book.title}</h2>
              <p className="text-gray-600 mb-2">By {book.author}</p>
              <p className="text-gray-500 mb-2">{book.genre}</p>
              
              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {book.book_categories.map(bc => (
                  <span
                    key={bc.category_id}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                  >
                    {bc.categories.name}
                  </span>
                ))}
              </div>

              <p className="text-gray-700 mb-4">{book.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">${book.price}</span>
                <button
                  onClick={() => handleAddToShelf(book.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add to Shelf
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No books found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default BookCatalog; 