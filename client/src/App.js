import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { UserIcon, BookOpenIcon, HomeIcon, CogIcon } from '@heroicons/react/outline';

// Components
import Home from './pages/Home';
import BookCatalog from './pages/BookCatalog';
import MyShelf from './pages/MyShelf';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import { ThemeProvider } from './context/ThemeContext';
import Test from './pages/Test';

// Initialize Supabase client with auto-confirm
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

// Navigation component
const Navigation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center px-4 text-gray-900 hover:text-gray-600">
              <HomeIcon className="h-6 w-6" />
              <span className="ml-2">Home</span>
            </Link>
            <Link to="/catalog" className="flex items-center px-4 text-gray-900 hover:text-gray-600">
              <BookOpenIcon className="h-6 w-6" />
              <span className="ml-2">Catalog</span>
            </Link>
            {user && (
              <Link to="/myshelf" className="flex items-center px-4 text-gray-900 hover:text-gray-600">
                <BookOpenIcon className="h-6 w-6" />
                <span className="ml-2">My Shelf</span>
              </Link>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center text-gray-900 hover:text-gray-600">
                  <CogIcon className="h-6 w-6" />
                  <span className="ml-2">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-900 hover:text-gray-600"
                >
                  <UserIcon className="h-6 w-6" />
                  <span className="ml-2">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center text-gray-900 hover:text-gray-600">
                <UserIcon className="h-6 w-6" />
                <span className="ml-2">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// App component
const App = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navigation />
          <main className="py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/catalog" element={<BookCatalog />} />
              <Route path="/book/:id" element={<BookDetails />} />
              <Route path="/myshelf" element={<MyShelf />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reader/:bookId" element={<PDFReader />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/test" element={<Test />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App; 