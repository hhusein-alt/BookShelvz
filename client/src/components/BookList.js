import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

function BookList() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addBook(title, author, description) {
    try {
      const { data, error } = await supabase
        .from('books')
        .insert([{ title, author, description }])
        .select()
        .single();

      if (error) throw error;
      setBooks([...books, data]);
    } catch (error) {
      console.error('Error adding book:', error.message);
      setError(error.message);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Books</h2>
      <ul>
        {books.map((book) => (
          <li key={book.id}>
            <h3>{book.title}</h3>
            <p>Author: {book.author}</p>
            <p>{book.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BookList; 