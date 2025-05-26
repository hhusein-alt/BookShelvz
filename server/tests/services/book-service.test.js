const { supabase } = require('../../config/supabase');
const { AppError } = require('../../utils/error');
const { createTestBook, createTestCategory } = require('../setup');

describe('Book Service', () => {
  describe('Book Operations', () => {
    it('should create a new book', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000001'
      };

      const { data: book, error } = await supabase
        .from('books')
        .insert(bookData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(book).toMatchObject(bookData);
    });

    it('should update a book', async () => {
      const testBook = await createTestBook();
      const updateData = {
        title: 'Updated Title',
        price: 19.99
      };

      const { data: book, error } = await supabase
        .from('books')
        .update(updateData)
        .eq('id', testBook.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(book).toMatchObject(updateData);
    });

    it('should delete a book', async () => {
      const testBook = await createTestBook();

      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', testBook.id);

      expect(error).toBeNull();

      // Verify book is deleted
      const { data: book } = await supabase
        .from('books')
        .select()
        .eq('id', testBook.id)
        .single();

      expect(book).toBeNull();
    });
  });

  describe('Book Categories', () => {
    it('should associate a book with categories', async () => {
      const testBook = await createTestBook();
      const testCategory = await createTestCategory();

      const { error } = await supabase
        .from('book_categories')
        .insert({
          book_id: testBook.id,
          category_id: testCategory.id
        });

      expect(error).toBeNull();

      // Verify association
      const { data: categories } = await supabase
        .from('book_categories')
        .select('categories(*)')
        .eq('book_id', testBook.id);

      expect(categories).toHaveLength(1);
      expect(categories[0].categories.id).toBe(testCategory.id);
    });

    it('should remove category association', async () => {
      const testBook = await createTestBook();
      const testCategory = await createTestCategory();

      // Create association
      await supabase
        .from('book_categories')
        .insert({
          book_id: testBook.id,
          category_id: testCategory.id
        });

      // Remove association
      const { error } = await supabase
        .from('book_categories')
        .delete()
        .eq('book_id', testBook.id)
        .eq('category_id', testCategory.id);

      expect(error).toBeNull();

      // Verify removal
      const { data: categories } = await supabase
        .from('book_categories')
        .select()
        .eq('book_id', testBook.id);

      expect(categories).toHaveLength(0);
    });
  });

  describe('Book Search', () => {
    it('should search books by title', async () => {
      const testBook = await createTestBook();

      const { data: books, error } = await supabase
        .from('books')
        .select()
        .ilike('title', `%${testBook.title}%`);

      expect(error).toBeNull();
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe(testBook.id);
    });

    it('should search books by author', async () => {
      const testBook = await createTestBook();

      const { data: books, error } = await supabase
        .from('books')
        .select()
        .ilike('author', `%${testBook.author}%`);

      expect(error).toBeNull();
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe(testBook.id);
    });

    it('should search books by category', async () => {
      const testBook = await createTestBook();
      const testCategory = await createTestCategory();

      // Create association
      await supabase
        .from('book_categories')
        .insert({
          book_id: testBook.id,
          category_id: testCategory.id
        });

      const { data: books, error } = await supabase
        .from('books')
        .select('*, book_categories!inner(categories!inner(*))')
        .eq('book_categories.categories.id', testCategory.id);

      expect(error).toBeNull();
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe(testBook.id);
    });
  });

  describe('Book Statistics', () => {
    it('should calculate book statistics', async () => {
      const testBook = await createTestBook();

      // Create some reading progress
      await supabase
        .from('reading_progress')
        .insert({
          book_id: testBook.id,
          user_id: global.testUserId,
          current_page: 100,
          total_pages: 200,
          status: 'reading'
        });

      const { data: stats, error } = await supabase
        .rpc('get_book_stats', { book_id: testBook.id });

      expect(error).toBeNull();
      expect(stats).toHaveProperty('total_readers');
      expect(stats).toHaveProperty('average_progress');
      expect(stats).toHaveProperty('total_bookmarks');
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate ISBN', async () => {
      const testBook = await createTestBook();

      const { error } = await supabase
        .from('books')
        .insert({
          title: 'Another Book',
          author: 'Another Author',
          isbn: testBook.isbn
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505'); // Unique violation
    });

    it('should handle invalid category association', async () => {
      const testBook = await createTestBook();

      const { error } = await supabase
        .from('book_categories')
        .insert({
          book_id: testBook.id,
          category_id: '00000000-0000-0000-0000-000000000000'
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23503'); // Foreign key violation
    });
  });
}); 