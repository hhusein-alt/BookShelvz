const supabase = require('../utils/supabaseClient');
const { AppError } = require('../middleware/error');

// Assuming a 'shelves' table exists in your Supabase database
const SHELVES_TABLE = 'shelves';
const BOOKS_TABLE = 'books'; // Assuming a books table for relationships

// Helper to handle Supabase query results
const handleSupabaseResponse = ({ data, error }, errorMessage) => {
  if (error) {
    console.error(errorMessage, error);
    throw new AppError(errorMessage || 'Database operation failed', 500);
  }
  return data;
};

// Function to create a new shelf
const createShelf = async (shelfData) => {
  const { data, error } = await supabase
    .from(SHELVES_TABLE)
    .insert([shelfData])
    .select()
    .single();

  return handleSupabaseResponse({ data, error }, 'Error creating shelf:');
};

// Function to find shelves by user ID
const findShelvesByUser = async (userId) => {
  // This assumes a 'user_id' column in the shelves table
  // and fetches related book data. You might need to adjust based on your schema
  const { data, error } = await supabase
    .from(SHELVES_TABLE)
    .select(`
      *,
      ${BOOKS_TABLE}(id, title, author, cover)
    `)
    .eq('user_id', userId);

  return handleSupabaseResponse({ data, error }, 'Error finding shelves by user:');
};

// Function to find a shelf by name and user ID
const findShelfByNameAndUser = async (name, userId) => {
  const { data, error } = await supabase
    .from(SHELVES_TABLE)
    .select(`
      *,
      ${BOOKS_TABLE}(id, title, author, cover)
    `)
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  return handleSupabaseResponse({ data, error }, 'Error finding shelf by name and user:');
};

// Function to find a shelf by ID
const findShelfById = async (shelfId) => {
  const { data, error } = await supabase
    .from(SHELVES_TABLE)
    .select(`
      *,
      ${BOOKS_TABLE}(id, title, author, cover)
    `)
    .eq('id', shelfId)
    .single();

  return handleSupabaseResponse({ data, error }, 'Error finding shelf by ID:');
};

// Function to update a shelf
const updateShelf = async (shelfId, shelfData) => {
  const { data, error } = await supabase
    .from(SHELVES_TABLE)
    .update(shelfData)
    .eq('id', shelfId)
    .select()
    .single();

  return handleSupabaseResponse({ data, error }, 'Error updating shelf:');
};

// Function to delete a shelf
const deleteShelf = async (shelfId) => {
  const { data, error } = await supabase
    .from(SHELVES_TABLE)
    .delete()
    .eq('id', shelfId)
    .select()
    .single();

  return handleSupabaseResponse({ data, error }, 'Error deleting shelf:');
};

// Function to add a book to a shelf (assuming 'books' is an array column of book IDs)
const addBookToShelf = async (shelfId, bookId) => {
  // This approach is simplified and might need adjustment based on your schema (e.g., join table)
  const shelf = await findShelfById(shelfId);
  if (!shelf) {
    throw new AppError('Shelf not found', 404);
  }

  const currentBooks = shelf.books || [];
  if (!currentBooks.includes(bookId)) {
    const updatedBooks = [...currentBooks, bookId];
    return updateShelf(shelfId, { books: updatedBooks });
  }

  return shelf; // Book already exists, return the shelf
};

// Function to remove a book from a shelf (assuming 'books' is an array column of book IDs)
const removeBookFromShelf = async (shelfId, bookId) => {
    // This approach is simplified and might need adjustment based on your schema (e.g., join table)
    const shelf = await findShelfById(shelfId);
    if (!shelf) {
      throw new AppError('Shelf not found', 404);
    }

    const currentBooks = shelf.books || [];
    const updatedBooks = currentBooks.filter(id => id !== bookId);

    if (updatedBooks.length === currentBooks.length) {
        // Book not found in shelf, return the shelf without changes
        return shelf;
    }

    return updateShelf(shelfId, { books: updatedBooks });
};

module.exports = {
  createShelf,
  findShelvesByUser,
  findShelfByNameAndUser,
  findShelfById,
  updateShelf,
  deleteShelf,
  addBookToShelf,
  removeBookFromShelf
}; 