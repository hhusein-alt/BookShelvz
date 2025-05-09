import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { useTheme } from '../context/ThemeContext';
import { CheckIcon, XIcon, UploadIcon, PlusIcon } from '@heroicons/react/outline';

const AdminPanel = () => {
  const [orders, setOrders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingBook, setUploadingBook] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    genre: '',
    description: '',
    price: '',
    cover_url: '',
    categories: []
  });
  const { genreTheme, genreThemes } = useTheme();
  const currentTheme = genreTheme ? genreThemes[genreTheme] : genreThemes['self-development'];

  useEffect(() => {
    fetchOrders();
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

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          books (*),
          users (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleApproveOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'approved' })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handlePDFUpload = async (orderId) => {
    if (!selectedFile) return;

    try {
      setUploadingBook(orderId);
      
      // Upload PDF to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(fileName);

      // Update order with PDF URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({ pdf_url: publicUrl })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Add book to user's shelf
      const order = orders.find(o => o.id === orderId);
      const { error: shelfError } = await supabase
        .from('user_shelves')
        .insert([{
          user_id: order.user_id,
          book_id: order.book_id,
          pdf_url: publicUrl
        }]);

      if (shelfError) throw shelfError;

      setSelectedFile(null);
      fetchOrders();
    } catch (error) {
      console.error('Error uploading PDF:', error);
    } finally {
      setUploadingBook(null);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      // First, insert the book
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .insert([{
          title: newBook.title,
          author: newBook.author,
          genre: newBook.genre,
          description: newBook.description,
          price: parseFloat(newBook.price),
          cover_url: newBook.cover_url
        }])
        .select()
        .single();

      if (bookError) throw bookError;

      // Then, insert the book categories
      if (newBook.categories.length > 0) {
        const bookCategories = newBook.categories.map(categoryId => ({
          book_id: bookData.id,
          category_id: categoryId
        }));

        const { error: categoryError } = await supabase
          .from('book_categories')
          .insert(bookCategories);

        if (categoryError) throw categoryError;
      }

      // Reset form
      setNewBook({
        title: '',
        author: '',
        genre: '',
        description: '',
        price: '',
        cover_url: '',
        categories: []
      });

      alert('Book added successfully!');
    } catch (error) {
      console.error('Error adding book:', error);
      alert('Error adding book. Please try again.');
    }
  };

  const handleCategoryChange = (categoryId) => {
    setNewBook(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  return (
    <div className={`${currentTheme.primary} min-h-screen py-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className={`text-3xl font-bold ${currentTheme.text} mb-8`}>
          Admin Panel
        </h1>

        {/* Add New Book Form */}
        <div className={`${currentTheme.secondary} rounded-lg shadow-md overflow-hidden mb-8`}>
          <div className="p-6">
            <h2 className={`text-2xl font-semibold ${currentTheme.text} mb-4`}>
              Add New Book
            </h2>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className={`w-full p-2 rounded border ${currentTheme.border}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Author
                  </label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className={`w-full p-2 rounded border ${currentTheme.border}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Genre
                  </label>
                  <input
                    type="text"
                    value={newBook.genre}
                    onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
                    className={`w-full p-2 rounded border ${currentTheme.border}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBook.price}
                    onChange={(e) => setNewBook({ ...newBook, price: e.target.value })}
                    className={`w-full p-2 rounded border ${currentTheme.border}`}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Cover URL
                  </label>
                  <input
                    type="url"
                    value={newBook.cover_url}
                    onChange={(e) => setNewBook({ ...newBook, cover_url: e.target.value })}
                    className={`w-full p-2 rounded border ${currentTheme.border}`}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Description
                  </label>
                  <textarea
                    value={newBook.description}
                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                    className={`w-full p-2 rounded border ${currentTheme.border}`}
                    rows="4"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${currentTheme.text} mb-1`}>
                    Categories
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {categories.map(category => (
                      <label
                        key={category.id}
                        className={`flex items-center space-x-2 p-2 rounded border ${
                          newBook.categories.includes(category.id)
                            ? `${currentTheme.accent} border-${currentTheme.accent}`
                            : currentTheme.border
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newBook.categories.includes(category.id)}
                          onChange={() => handleCategoryChange(category.id)}
                          className="form-checkbox"
                        />
                        <span className={`${currentTheme.text}`}>{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`bg-${currentTheme.accent} text-white px-4 py-2 rounded hover:bg-${currentTheme.accentHover}`}
                >
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Orders List */}
        <div className={`${currentTheme.secondary} rounded-lg shadow-md overflow-hidden`}>
          <div className="p-6">
            <h2 className={`text-2xl font-semibold ${currentTheme.text} mb-4`}>
              Pending Orders
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.text} uppercase tracking-wider`}>
                      Book
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.text} uppercase tracking-wider`}>
                      User
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.text} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${currentTheme.text} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`${currentTheme.text}`}>
                          {order.books.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`${currentTheme.text}`}>
                          {order.users.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {order.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveOrder(order.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XIcon className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                        {order.status === 'approved' && !order.pdf_url && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                              id={`pdf-upload-${order.id}`}
                            />
                            <label
                              htmlFor={`pdf-upload-${order.id}`}
                              className="cursor-pointer text-blue-600 hover:text-blue-900"
                            >
                              <UploadIcon className="h-5 w-5" />
                            </label>
                            {selectedFile && uploadingBook === order.id ? (
                              <span className="text-gray-500">Uploading...</span>
                            ) : selectedFile && (
                              <button
                                onClick={() => handlePDFUpload(order.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Upload
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 