// Sample book data (this would typically come from your backend)
const sampleBooks = [
    {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        price: 19.99,
        cover: "https://via.placeholder.com/300x400",
        description: "A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan."
    },
    {
        id: 2,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        price: 15.99,
        cover: "https://via.placeholder.com/300x400",
        description: "The story of racial injustice and the loss of innocence in the American South."
    },
    {
        id: 3,
        title: "1984",
        author: "George Orwell",
        price: 14.99,
        cover: "https://via.placeholder.com/300x400",
        description: "A dystopian social science fiction novel and cautionary tale."
    },
    {
        id: 4,
        title: "Pride and Prejudice",
        author: "Jane Austen",
        price: 12.99,
        cover: "https://via.placeholder.com/300x400",
        description: "A romantic novel of manners set in rural England."
    }
];

// Function to create book cards
function createBookCard(book) {
    return `
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <img src="${book.cover}" alt="${book.title}" class="w-full h-64 object-cover">
            <div class="p-4">
                <h3 class="text-lg font-semibold text-gray-900">${book.title}</h3>
                <p class="text-gray-600">${book.author}</p>
                <p class="text-sm text-gray-500 mt-2">${book.description}</p>
                <div class="mt-4 flex justify-between items-center">
                    <span class="text-indigo-600 font-semibold">$${book.price}</span>
                    <button 
                        onclick="addToShelf(${book.id})"
                        class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                        Add to Shelf
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Function to load books into the featured section
function loadBooks() {
    const featuredSection = document.querySelector('#featured .grid');
    if (featuredSection) {
        featuredSection.innerHTML = sampleBooks.map(book => createBookCard(book)).join('');
    }
}

// Function to handle adding books to shelf
function addToShelf(bookId) {
    const book = sampleBooks.find(b => b.id === bookId);
    if (!book) return;

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('user'); // This is a simple check, you'd want more robust auth
    if (!isLoggedIn) {
        alert('Please log in to add books to your shelf');
        return;
    }

    // Add to shelf (this would typically make an API call)
    const shelf = JSON.parse(localStorage.getItem('shelf') || '[]');
    if (!shelf.find(b => b.id === bookId)) {
        shelf.push(book);
        localStorage.setItem('shelf', JSON.stringify(shelf));
        alert(`${book.title} added to your shelf!`);
    } else {
        alert('This book is already in your shelf');
    }
}

// Function to handle search
function searchBooks(query) {
    const filteredBooks = sampleBooks.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
    );
    
    const featuredSection = document.querySelector('#featured .grid');
    if (featuredSection) {
        featuredSection.innerHTML = filteredBooks.map(book => createBookCard(book)).join('');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();

    // Add search functionality
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search books...';
    searchInput.className = 'w-full max-w-md px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500';
    searchInput.addEventListener('input', (e) => searchBooks(e.target.value));

    const searchContainer = document.createElement('div');
    searchContainer.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8';
    searchContainer.appendChild(searchInput);

    const featuredSection = document.querySelector('#featured');
    featuredSection.parentNode.insertBefore(searchContainer, featuredSection);
}); 