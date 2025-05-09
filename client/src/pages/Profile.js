import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import { UserIcon, BookOpenIcon, ClockIcon, CogIcon } from '@heroicons/react/outline';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    completedBooks: 0,
    totalReadingTime: 0,
    averageRating: 0
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    avatar_url: '',
    bio: '',
    reading_preferences: {
      preferredGenres: [],
      readingGoal: 0,
      notifications: true
    }
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

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

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      if (data) {
        setFormData({
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          reading_preferences: data.reading_preferences || {
            preferredGenres: [],
            readingGoal: 0,
            notifications: true
          }
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch total books
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id);

      if (purchasesError) throw purchasesError;

      // Fetch completed books
      const { data: progress, error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('progress', 100);

      if (progressError) throw progressError;

      // Fetch reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('user_id', user.id);

      if (reviewsError) throw reviewsError;

      setStats({
        totalBooks: purchases?.length || 0,
        completedBooks: progress?.length || 0,
        totalReadingTime: purchases?.length * 300 || 0, // Assuming 5 hours per book
        averageRating: reviews?.length
          ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
          : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...formData
        });

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user?.email}
                </h1>
                <p className="text-blue-100">
                  Member since {new Date(user?.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-2">
                <BookOpenIcon className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Books</p>
                  <p className="text-xl font-semibold">{stats.totalBooks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-2">
                <BookOpenIcon className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-xl font-semibold">{stats.completedBooks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-6 w-6 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Reading Time</p>
                  <p className="text-xl font-semibold">
                    {Math.round(stats.totalReadingTime / 60)}h
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-2">
                <CogIcon className="h-6 w-6 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Avg. Rating</p>
                  <p className="text-xl font-semibold">
                    {stats.averageRating.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'preferences'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reading Preferences
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'profile' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) =>
                      setFormData({ ...formData, avatar_url: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    rows="4"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reading Goal (books per month)
                  </label>
                  <input
                    type="number"
                    value={formData.reading_preferences.readingGoal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reading_preferences: {
                          ...formData.reading_preferences,
                          readingGoal: parseInt(e.target.value)
                        }
                      })
                    }
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Notifications
                  </label>
                  <div className="mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.reading_preferences.notifications}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reading_preferences: {
                              ...formData.reading_preferences,
                              notifications: e.target.checked
                            }
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-gray-700">
                        Receive reading reminders and updates
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 