// Constants
const API_BASE_URL = '/api';
const STORAGE_KEYS = {
  USER: 'user',
  SHELF: 'shelf',
  THEME: 'theme',
  LAST_SYNC: 'lastSync'
};

// State management
const state = {
  books: [],
  loading: false,
  error: null,
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 12,
  totalItems: 0,
  isOnline: navigator.onLine
};

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful');
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showNotification('New version available! Refresh to update.', 'info');
          }
        });
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });
}

// Handle online/offline status
window.addEventListener('online', () => {
  state.isOnline = true;
  showNotification('You are back online!', 'success');
  syncOfflineChanges();
});

window.addEventListener('offline', () => {
  state.isOnline = false;
  showNotification('You are offline. Some features may be limited.', 'error');
});

// Utility functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
    type === 'error' ? 'bg-red-500' : 
    type === 'success' ? 'bg-green-500' : 
    'bg-blue-500'
  } text-white z-50`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
};

const showLoading = () => {
  const loader = document.createElement('div');
  loader.id = 'loader';
  loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  loader.innerHTML = `
    <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
  `;
  document.body.appendChild(loader);
};

const hideLoading = () => {
  const loader = document.getElementById('loader');
  if (loader) loader.remove();
};

// Offline queue management
const offlineQueue = {
  items: JSON.parse(localStorage.getItem('offlineQueue') || '[]'),
  
  add: function(action) {
    this.items.push(action);
    localStorage.setItem('offlineQueue', JSON.stringify(this.items));
  },
  
  clear: function() {
    this.items = [];
    localStorage.removeItem('offlineQueue');
  },
  
  process: async function() {
    if (!state.isOnline || this.items.length === 0) return;
    
    showLoading();
    try {
      for (const action of this.items) {
        await processOfflineAction(action);
      }
      this.clear();
      showNotification('Offline changes synced successfully!', 'success');
    } catch (error) {
      showNotification('Failed to sync offline changes', 'error');
    } finally {
      hideLoading();
    }
  }
};

const processOfflineAction = async (action) => {
  const { type, data } = action;
  switch (type) {
    case 'ADD_TO_SHELF':
      await addToShelf(data.bookId);
      break;
    // Add more action types as needed
  }
};

const syncOfflineChanges = async () => {
  if (state.isOnline) {
    await offlineQueue.process();
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }
};

// API functions
const fetchBooks = async (query = '', page = 1) => {
  try {
    state.loading = true;
    showLoading();
    
    const response = await fetch(
      `${API_BASE_URL}/books?q=${encodeURIComponent(query)}&page=${page}&limit=${state.itemsPerPage}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    state.books = data.items;
    state.totalItems = data.total;
    state.currentPage = page;
    state.error = null;
    
    return data;
  } catch (error) {
    state.error = error.message;
    if (!state.isOnline) {
      // Try to load from cache
      const cachedBooks = JSON.parse(localStorage.getItem('cachedBooks') || '[]');
      if (cachedBooks.length > 0) {
        state.books = cachedBooks;
        showNotification('Showing cached books (offline mode)', 'info');
        return { items: cachedBooks, total: cachedBooks.length };
      }
    }
    showNotification(error.message, 'error');
    throw error;
  } finally {
    state.loading = false;
    hideLoading();
  }
};

const addToShelf = async (bookId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification('Please log in to add books to your shelf', 'error');
      return;
    }

    if (!state.isOnline) {
      offlineQueue.add({
        type: 'ADD_TO_SHELF',
        data: { bookId }
      });
      showNotification('Book will be added when you are online', 'info');
      return;
    }

    showLoading();
    const response = await fetch(`${API_BASE_URL}/shelf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    showNotification(`${data.title} added to your shelf!`, 'success');
    
    // Update local storage
    const shelf = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHELF) || '[]');
    if (!shelf.find(b => b.id === bookId)) {
      shelf.push(data);
      localStorage.setItem(STORAGE_KEYS.SHELF, JSON.stringify(shelf));
    }
  } catch (error) {
    showNotification(error.message, 'error');
  } finally {
    hideLoading();
  }
};

// UI functions
const createBookCard = (book) => {
  return `
    <div class="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-300 hover:scale-105">
      <div class="relative">
        <img 
          src="${book.cover}" 
          alt="${book.title}" 
          class="w-full h-64 object-cover"
          onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'"
        >
        ${book.discount ? `
          <div class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm">
            -${book.discount}%
          </div>
        ` : ''}
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-900 truncate">${book.title}</h3>
        <p class="text-gray-600 truncate">${book.author}</p>
        <p class="text-sm text-gray-500 mt-2 line-clamp-2">${book.description}</p>
        <div class="mt-4 flex justify-between items-center">
          <div>
            ${book.discount ? `
              <span class="text-gray-400 line-through mr-2">$${book.originalPrice}</span>
            ` : ''}
            <span class="text-indigo-600 font-semibold">$${book.price}</span>
          </div>
          <button 
            onclick="addToShelf(${book.id})"
            class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-300"
          >
            Add to Shelf
          </button>
        </div>
      </div>
    </div>
  `;
};

const renderBooks = () => {
  const featuredSection = document.querySelector('#featured .grid');
  if (!featuredSection) return;

  if (state.loading) {
    featuredSection.innerHTML = `
      <div class="col-span-full flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    `;
    return;
  }

  if (state.error) {
    featuredSection.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-red-500">${state.error}</p>
        <button 
          onclick="fetchBooks(state.searchQuery, state.currentPage)"
          class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    `;
    return;
  }

  if (state.books.length === 0) {
    featuredSection.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-gray-500">No books found</p>
      </div>
    `;
    return;
  }

  featuredSection.innerHTML = state.books.map(book => createBookCard(book)).join('');
  renderPagination();
};

const renderPagination = () => {
  const totalPages = Math.ceil(state.totalItems / state.itemsPerPage);
  if (totalPages <= 1) return;

  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'flex justify-center items-center space-x-2 mt-8';
  
  // Previous button
  paginationContainer.innerHTML += `
    <button 
      onclick="changePage(${state.currentPage - 1})"
      class="px-4 py-2 rounded-md ${
        state.currentPage === 1 
          ? 'bg-gray-200 cursor-not-allowed' 
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }"
      ${state.currentPage === 1 ? 'disabled' : ''}
    >
      Previous
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    paginationContainer.innerHTML += `
      <button 
        onclick="changePage(${i})"
        class="px-4 py-2 rounded-md ${
          state.currentPage === i 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300'
        }"
      >
        ${i}
      </button>
    `;
  }

  // Next button
  paginationContainer.innerHTML += `
    <button 
      onclick="changePage(${state.currentPage + 1})"
      class="px-4 py-2 rounded-md ${
        state.currentPage === totalPages 
          ? 'bg-gray-200 cursor-not-allowed' 
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }"
      ${state.currentPage === totalPages ? 'disabled' : ''}
    >
      Next
    </button>
  `;

  const featuredSection = document.querySelector('#featured');
  const existingPagination = document.querySelector('.pagination');
  if (existingPagination) {
    existingPagination.remove();
  }
  paginationContainer.classList.add('pagination');
  featuredSection.appendChild(paginationContainer);
};

const changePage = async (page) => {
  if (page < 1 || page > Math.ceil(state.totalItems / state.itemsPerPage)) return;
  await fetchBooks(state.searchQuery, page);
  renderBooks();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Search functionality
const handleSearch = debounce(async (query) => {
  state.searchQuery = query;
  state.currentPage = 1;
  await fetchBooks(query, 1);
  renderBooks();
}, 300);

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  // Add search functionality
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search books...';
  searchInput.className = 'w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

  const searchContainer = document.createElement('div');
  searchContainer.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8';
  searchContainer.appendChild(searchInput);

  const featuredSection = document.querySelector('#featured');
  featuredSection.parentNode.insertBefore(searchContainer, featuredSection);

  // Load initial data
  try {
    await fetchBooks();
    renderBooks();
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
}); 