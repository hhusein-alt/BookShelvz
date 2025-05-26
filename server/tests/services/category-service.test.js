const { supabase } = require('../../config/supabase');
const { AppError } = require('../../utils/error');
const { createTestCategory, createTestBook } = require('../setup');

describe('Category Service', () => {
  describe('Category Management', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'Test Description',
        icon: 'book'
      };

      const { data: category, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(category).toMatchObject(categoryData);
    });

    it('should update a category', async () => {
      const testCategory = await createTestCategory();
      const updateData = {
        name: 'Updated Category',
        description: 'Updated Description',
        icon: 'library'
      };

      const { data: category, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', testCategory.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(category).toMatchObject(updateData);
    });

    it('should delete a category', async () => {
      const testCategory = await createTestCategory();

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', testCategory.id);

      expect(error).toBeNull();

      // Verify category is deleted
      const { data: category } = await supabase
        .from('categories')
        .select()
        .eq('id', testCategory.id)
        .single();

      expect(category).toBeNull();
    });
  });

  describe('Book Categorization', () => {
    it('should associate a book with multiple categories', async () => {
      const testBook = await createTestBook();
      const testCategory1 = await createTestCategory();
      const testCategory2 = await createTestCategory();

      // Create associations
      const { error } = await supabase
        .from('book_categories')
        .insert([
          {
            book_id: testBook.id,
            category_id: testCategory1.id
          },
          {
            book_id: testBook.id,
            category_id: testCategory2.id
          }
        ]);

      expect(error).toBeNull();

      // Verify associations
      const { data: categories } = await supabase
        .from('book_categories')
        .select('categories(*)')
        .eq('book_id', testBook.id);

      expect(categories).toHaveLength(2);
      expect(categories.map(c => c.categories.id)).toContain(testCategory1.id);
      expect(categories.map(c => c.categories.id)).toContain(testCategory2.id);
    });

    it('should remove category associations', async () => {
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

  describe('Category Retrieval', () => {
    it('should retrieve all categories', async () => {
      const testCategory1 = await createTestCategory();
      const testCategory2 = await createTestCategory();

      const { data: categories, error } = await supabase
        .from('categories')
        .select();

      expect(error).toBeNull();
      expect(categories.length).toBeGreaterThanOrEqual(2);
      expect(categories.map(c => c.id)).toContain(testCategory1.id);
      expect(categories.map(c => c.id)).toContain(testCategory2.id);
    });

    it('should retrieve books in a category', async () => {
      const testCategory = await createTestCategory();
      const testBook1 = await createTestBook();
      const testBook2 = await createTestBook();

      // Create associations
      await supabase
        .from('book_categories')
        .insert([
          {
            book_id: testBook1.id,
            category_id: testCategory.id
          },
          {
            book_id: testBook2.id,
            category_id: testCategory.id
          }
        ]);

      const { data: books, error } = await supabase
        .from('books')
        .select('*, book_categories!inner(categories!inner(*))')
        .eq('book_categories.categories.id', testCategory.id);

      expect(error).toBeNull();
      expect(books).toHaveLength(2);
      expect(books.map(b => b.id)).toContain(testBook1.id);
      expect(books.map(b => b.id)).toContain(testBook2.id);
    });
  });

  describe('Category Statistics', () => {
    it('should calculate category statistics', async () => {
      const testCategory = await createTestCategory();
      const testBook1 = await createTestBook();
      const testBook2 = await createTestBook();

      // Create associations
      await supabase
        .from('book_categories')
        .insert([
          {
            book_id: testBook1.id,
            category_id: testCategory.id
          },
          {
            book_id: testBook2.id,
            category_id: testCategory.id
          }
        ]);

      const { data: stats, error } = await supabase
        .rpc('get_category_stats', { category_id: testCategory.id });

      expect(error).toBeNull();
      expect(stats).toHaveProperty('total_books');
      expect(stats).toHaveProperty('total_readers');
      expect(stats).toHaveProperty('average_rating');
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate category names', async () => {
      const testCategory = await createTestCategory();

      const { error } = await supabase
        .from('categories')
        .insert({
          name: testCategory.name,
          description: 'Another Description',
          icon: 'book'
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505'); // Unique violation
    });

    it('should handle invalid book associations', async () => {
      const testCategory = await createTestCategory();

      const { error } = await supabase
        .from('book_categories')
        .insert({
          book_id: '00000000-0000-0000-0000-000000000000',
          category_id: testCategory.id
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23503'); // Foreign key violation
    });

    it('should handle invalid category updates', async () => {
      const testCategory = await createTestCategory();

      const { error } = await supabase
        .from('categories')
        .update({
          name: '' // Invalid: empty name
        })
        .eq('id', testCategory.id);

      expect(error).not.toBeNull();
    });
  });
}); 