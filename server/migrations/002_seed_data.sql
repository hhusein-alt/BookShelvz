-- Seed categories
INSERT INTO categories (name, description, icon) VALUES
  ('Fiction', 'Works of fiction including novels and short stories', '📚'),
  ('Non-Fiction', 'Factual works including biographies and educational books', '📖'),
  ('Science Fiction', 'Speculative fiction dealing with futuristic concepts', '🚀'),
  ('Fantasy', 'Imaginative fiction with magical elements', '✨'),
  ('Mystery', 'Suspenseful stories involving crime or puzzles', '🔍'),
  ('Romance', 'Stories focusing on romantic relationships', '❤️'),
  ('Biography', 'Accounts of people''s lives', '👤'),
  ('History', 'Accounts of past events', '📜'),
  ('Science', 'Works about scientific concepts and discoveries', '🔬'),
  ('Technology', 'Books about computers, programming, and tech', '💻')
ON CONFLICT (name) DO NOTHING;

-- Seed books
INSERT INTO books (title, author, description, genre, price, isbn, published_date) VALUES
  ('The Great Gatsby', 'F. Scott Fitzgerald', 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.', 'Fiction', 9.99, '978-0743273565', '1925-04-10'),
  ('To Kill a Mockingbird', 'Harper Lee', 'The story of racial injustice and the loss of innocence in the American South.', 'Fiction', 12.99, '978-0446310789', '1960-07-11'),
  ('1984', 'George Orwell', 'A dystopian social science fiction novel and cautionary tale.', 'Science Fiction', 10.99, '978-0451524935', '1949-06-08'),
  ('The Hobbit', 'J.R.R. Tolkien', 'A fantasy novel about the adventures of Bilbo Baggins.', 'Fantasy', 14.99, '978-0547928227', '1937-09-21'),
  ('The Da Vinci Code', 'Dan Brown', 'A mystery thriller novel about a murder in the Louvre Museum.', 'Mystery', 11.99, '978-0307474278', '2003-03-18'),
  ('Pride and Prejudice', 'Jane Austen', 'A romantic novel of manners.', 'Romance', 8.99, '978-0141439518', '1813-01-28'),
  ('Steve Jobs', 'Walter Isaacson', 'The biography of Apple co-founder Steve Jobs.', 'Biography', 16.99, '978-1451648539', '2011-10-24'),
  ('Sapiens', 'Yuval Noah Harari', 'A brief history of humankind.', 'History', 15.99, '978-0062316097', '2014-02-10'),
  ('A Brief History of Time', 'Stephen Hawking', 'A popular science book about cosmology.', 'Science', 13.99, '978-0553380163', '1988-04-01'),
  ('Clean Code', 'Robert C. Martin', 'A handbook of agile software craftsmanship.', 'Technology', 17.99, '978-0132350884', '2008-08-11')
ON CONFLICT (isbn) DO NOTHING;

-- Associate books with categories
INSERT INTO book_categories (book_id, category_id)
SELECT b.id, c.id
FROM books b
CROSS JOIN categories c
WHERE (b.title = 'The Great Gatsby' AND c.name = 'Fiction')
   OR (b.title = 'To Kill a Mockingbird' AND c.name = 'Fiction')
   OR (b.title = '1984' AND c.name = 'Science Fiction')
   OR (b.title = 'The Hobbit' AND c.name = 'Fantasy')
   OR (b.title = 'The Da Vinci Code' AND c.name = 'Mystery')
   OR (b.title = 'Pride and Prejudice' AND c.name = 'Romance')
   OR (b.title = 'Steve Jobs' AND c.name = 'Biography')
   OR (b.title = 'Sapiens' AND c.name = 'History')
   OR (b.title = 'A Brief History of Time' AND c.name = 'Science')
   OR (b.title = 'Clean Code' AND c.name = 'Technology')
ON CONFLICT (book_id, category_id) DO NOTHING;

-- Create admin user profile
INSERT INTO user_profiles (user_id, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual admin user ID
  'Admin User',
  'admin'
)
ON CONFLICT (user_id) DO NOTHING; 