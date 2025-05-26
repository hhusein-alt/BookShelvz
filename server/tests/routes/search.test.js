const request = require('supertest');
const app = require('../../server');
const { supabase } = require('../setup');

describe('Search API', () => {
  let testBooks;

  beforeAll(async () => {
    // Create test books with various attributes
    const books = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'A story of the fabulously wealthy Jay Gatsby',
        genre: 'Fiction',
        price: 9.99,
        isbn: '978-0000000004',
        tags: ['classic', 'american', 'literature']
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        description: 'The story of racial injustice and the loss of innocence',
        genre: 'Fiction',
        price: 12.99,
        isbn: '978-0000000005',
        tags: ['classic', 'american', 'drama']
      },
      {
        title: 'The Art of Programming',
        author: 'John Smith',
        description: 'A comprehensive guide to programming',
        genre: 'Technology',
        price: 29.99,
        isbn: '978-0000000006',
        tags: ['programming', 'technology', 'education']
      }
    ];

    const { data, error } = await supabase
      .from('books')
      .insert(books)
      .select();

    if (error) throw error;
    testBooks = data;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase
      .from('books')
      .delete()
      .in('id', testBooks.map(book => book.id));
  });

  describe('GET /api/search', () => {
    it('should search books by title', async () => {
      const response = await request(app)
        .get('/api/search?q=gatsby')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].title).toContain('Gatsby');
    });

    it('should search books by author', async () => {
      const response = await request(app)
        .get('/api/search?q=fitzgerald')
        .expect(200);

      expect(response.body.data[0].author).toContain('Fitzgerald');
    });

    it('should search books by description', async () => {
      const response = await request(app)
        .get('/api/search?q=wealthy')
        .expect(200);

      expect(response.body.data[0].description).toContain('wealthy');
    });

    it('should filter by genre', async () => {
      const response = await request(app)
        .get('/api/search?q=programming&genre=Technology')
        .expect(200);

      expect(response.body.data.every(book => book.genre === 'Technology')).toBe(true);
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/search?min_price=10&max_price=20')
        .expect(200);

      expect(response.body.data.every(book => 
        book.price >= 10 && book.price <= 20
      )).toBe(true);
    });

    it('should search by tags', async () => {
      const response = await request(app)
        .get('/api/search?tags=classic,american')
        .expect(200);

      expect(response.body.data.every(book => 
        book.tags.includes('classic') && book.tags.includes('american')
      )).toBe(true);
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/search?q=nonexistentbook')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should handle special characters in search', async () => {
      const response = await request(app)
        .get('/api/search?q=art & programming')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle case-insensitive search', async () => {
      const response = await request(app)
        .get('/api/search?q=GATSBY')
        .expect(200);

      expect(response.body.data[0].title).toContain('Gatsby');
    });
  });

  describe('Search Pagination', () => {
    it('should paginate search results', async () => {
      const response = await request(app)
        .get('/api/search?page=1&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/search?page=0&limit=0')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Search Sorting', () => {
    it('should sort by price ascending', async () => {
      const response = await request(app)
        .get('/api/search?sort=price&order=asc')
        .expect(200);

      const prices = response.body.data.map(book => book.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('should sort by price descending', async () => {
      const response = await request(app)
        .get('/api/search?sort=price&order=desc')
        .expect(200);

      const prices = response.body.data.map(book => book.price);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('should sort by title alphabetically', async () => {
      const response = await request(app)
        .get('/api/search?sort=title&order=asc')
        .expect(200);

      const titles = response.body.data.map(book => book.title);
      expect(titles).toEqual([...titles].sort());
    });
  });

  describe('Search Performance', () => {
    it('should handle large result sets efficiently', async () => {
      // Create 50 test books
      const books = Array(50).fill().map((_, i) => ({
        title: `Test Book ${i}`,
        author: `Author ${i}`,
        description: `Description ${i}`,
        genre: 'Test',
        price: 9.99,
        isbn: `978-0000000${i.toString().padStart(3, '0')}`,
        tags: ['test']
      }));

      await supabase.from('books').insert(books);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/search?q=test')
        .expect(200);
      const endTime = Date.now();

      // Should complete within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Clean up
      await supabase
        .from('books')
        .delete()
        .eq('genre', 'Test');
    });

    it('should handle concurrent search requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/search?q=test')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Search Error Handling', () => {
    it('should handle malformed search queries', async () => {
      const response = await request(app)
        .get('/api/search?q=' + 'a'.repeat(1000))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle invalid filter parameters', async () => {
      const response = await request(app)
        .get('/api/search?min_price=invalid')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
}); 