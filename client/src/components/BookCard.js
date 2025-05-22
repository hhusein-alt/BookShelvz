import React from 'react';
import { useNavigate } from 'react-router-dom';

const BookCard = ({ book, onAddToShelf }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img 
        src={book.cover_url} 
        alt={book.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{book.title}</h3>
        <p className="text-gray-600">{book.author}</p>
        <p className="text-sm text-gray-500 mt-2">{book.genre}</p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-lg font-bold">${book.price}</span>
          <button
            onClick={() => onAddToShelf(book.id)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Добавить на полку
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard; 