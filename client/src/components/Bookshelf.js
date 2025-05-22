import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import BookCard from './BookCard';

const Bookshelf = () => {
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, [activeTab]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      let query = supabase.from('books').select('*');
      
      if (activeTab === 'purchased') {
        query = supabase
          .from('purchases')
          .select('books(*)')
          .eq('user_id', supabase.auth.user()?.id);
      } else if (activeTab === 'reading') {
        query = supabase
          .from('reading_progress')
          .select('books(*)')
          .eq('user_id', supabase.auth.user()?.id)
          .gt('progress', 0)
          .lt('progress', 100);
      } else if (activeTab === 'completed') {
        query = supabase
          .from('reading_progress')
          .select('books(*)')
          .eq('user_id', supabase.auth.user()?.id)
          .eq('progress', 100);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShelf = async (bookId) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .insert([
          { 
            user_id: supabase.auth.user()?.id,
            book_id: bookId
          }
        ]);
      
      if (error) throw error;
      fetchBooks();
    } catch (error) {
      console.error('Error adding book to shelf:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded ${
            activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Все книги
        </button>
        <button
          onClick={() => setActiveTab('purchased')}
          className={`px-4 py-2 rounded ${
            activeTab === 'purchased' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Купленные
        </button>
        <button
          onClick={() => setActiveTab('reading')}
          className={`px-4 py-2 rounded ${
            activeTab === 'reading' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Читаю сейчас
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded ${
            activeTab === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Прочитанные
        </button>
      </div>

      {loading ? (
        <div className="text-center">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onAddToShelf={handleAddToShelf}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookshelf; 