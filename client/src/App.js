import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { UserIcon, BookOpenIcon, HomeIcon, CogIcon } from '@heroicons/react/outline';
import { Toaster, toast } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './context/ThemeContext';
import config from './lib/config';

// Lazy load components
const Home = lazy(() => import('./pages/Home'));
const BookCatalog = lazy(() => import('./pages/BookCatalog'));
const MyShelf = lazy(() => import('./pages/MyShelf'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const PDFReader = lazy(() => import('./pages/PDFReader'));
const Navigation = lazy(() => import('./components/Navigation'));

// Initialize Supabase client with auto-confirm
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const user = await auth.getCurrentUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to={config.routes.login} />;
  }

  return children;
};

// Navigation component
const NavigationComponent = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      toast.error('Error checking authentication status');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully signed out');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Toaster position="top-right" />
            <Suspense fallback={<LoadingSpinner />}>
              <NavigationComponent />
            </Suspense>
            <main className="py-8">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path={config.routes.home} element={<Home />} />
                  <Route path={config.routes.login} element={<Login />} />
                  <Route path={config.routes.catalog} element={<BookCatalog />} />
                  <Route path="/book/:id" element={<BookDetails />} />
                  <Route 
                    path={config.routes.myshelf} 
                    element={
                      <ProtectedRoute>
                        <MyShelf />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path={config.routes.profile} 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/reader/:bookId" 
                    element={
                      <ProtectedRoute>
                        <PDFReader />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path={config.routes.admin} 
                    element={
                      <ProtectedRoute>
                        <AdminPanel />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
              </Suspense>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App; 