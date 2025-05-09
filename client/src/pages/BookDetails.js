import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import {
  BookOpenIcon,
  StarIcon,
  ClockIcon,
  TagIcon,
  ShoppingCartIcon,
  BookmarkIcon,
} from '@heroicons/react/outline';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState({ rating: 0, text: '' });
  const [user, setUser] = useState(null);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    checkUser();
    fetchBookDetails();
  }, [id]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
      if (user) {
        checkPurchaseStatus();
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const fetchBookDetails = async () => {
    try {
      // Fetch book details with categories
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select(`
          *,
          book_categories (
            categories (
              name,
              icon
            )
          )
        `)
        .eq('id', id)
        .single();

      if (bookError) throw bookError;

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          user_profiles (
            avatar_url
          )
        `)
        .eq('book_id', id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      setBook(bookData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching book details:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('book_id', id)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setPurchased(!!data);
    } catch (error) {
      console.error('Error checking purchase status:', error);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          book_id: id,
          purchase_date: new Date().toISOString(),
          status: 'pending'
        });

      if (purchaseError) throw purchaseError;

      // Create order record
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          book_id: id,
          payment_status: 'pending',
          payment_method: 'whatsapp',
          payment_details: {
            contact: '+1234567890', // Replace with actual contact
            instructions: 'Please contact us on WhatsApp to complete your purchase.'
          }
        });

      if (orderError) throw orderError;

      setPurchased(true);
      alert('Purchase initiated! Please check your email for payment instructions.');
    } catch (error) {
      console.error('Error processing purchase:', error);
      alert('Error processing purchase. Please try again.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .upsert({
          user_id: user.id,
          book_id: id,
          rating: userReview.rating,
          review_text: userReview.text
        });

      if (error) throw error;
      setUserReview({ rating: 0, text: '' });
      fetchBookDetails(); // Refresh reviews
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Book not found</h1>
          <p className="mt-2 text-gray-600">
            The book you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Book Header */}
          <div className="md:flex">
            <div className="md:flex-shrink-0">
              <img
                className="h-48 w-full object-cover md:w-48"
                src={book.cover_url}
                alt={book.title}
              />
            </div>
            <div className="p-8">
              <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
                {book.author}
              </div>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {book.title}
              </h1>
              <p className="mt-2 text-gray-600">{book.description}</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center">
                  <StarIcon className="h-5 w-5 text-yellow-400" />
                  <span className="ml-1 text-gray-600">
                    {book.rating?.toFixed(1) || 'No ratings'}
                  </span>
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <span className="ml-1 text-gray-600">
                    {book.pages} pages
                  </span>
                </div>
                <div className="flex items-center">
                  <TagIcon className="h-5 w-5 text-gray-400" />
                  <span className="ml-1 text-gray-600">
                    {book.genre}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handlePurchase}
                  disabled={purchased}
                  className={`px-4 py-2 rounded-md ${
                    purchased
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {purchased ? (
                    <span className="flex items-center">
                      <BookOpenIcon className="h-5 w-5 mr-2" />
                      Read Now
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <ShoppingCartIcon className="h-5 w-5 mr-2" />
                      Purchase
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="px-8 py-4 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {book.book_categories?.map(({ categories }) => (
                <span
                  key={categories.name}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {categories.icon && (
                    <span className="mr-1">{categories.icon}</span>
                  )}
                  {categories.name}
                </span>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="px-8 py-6">
            <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
            
            {/* Review Form */}
            {user && purchased && (
              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rating
                  </label>
                  <div className="mt-1 flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setUserReview({ ...userReview, rating })}
                        className="focus:outline-none"
                      >
                        <StarIcon
                          className={`h-6 w-6 ${
                            rating <= userReview.rating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Review
                  </label>
                  <textarea
                    value={userReview.text}
                    onChange={(e) =>
                      setUserReview({ ...userReview, text: e.target.value })
                    }
                    rows="4"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Share your thoughts about this book..."
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Submit Review
                </button>
              </form>
            )}

            {/* Reviews List */}
            <div className="mt-6 space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="flex space-x-4">
                  <div className="flex-shrink-0">
                    {review.user_profiles?.avatar_url ? (
                      <img
                        src={review.user_profiles.avatar_url}
                        alt="User"
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <StarIcon
                            key={rating}
                            className={`h-4 w-4 ${
                              rating <= review.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-700">{review.review_text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails; 