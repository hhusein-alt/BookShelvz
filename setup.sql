-- Drop existing tables if they exist
DROP TABLE IF EXISTS reading_progress CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS book_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS reading_goals CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view books
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'books' 
        AND policyname = 'Books are viewable by everyone'
    ) THEN
        CREATE POLICY "Books are viewable by everyone"
            ON books FOR SELECT
            USING (true);
    END IF;
END $$;

-- Create policy to allow authenticated users to insert books
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'books' 
        AND policyname = 'Authenticated users can insert books'
    ) THEN
        CREATE POLICY "Authenticated users can insert books"
            ON books FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, book_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own purchases
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchases' 
        AND policyname = 'Users can view their own purchases'
    ) THEN
        CREATE POLICY "Users can view their own purchases"
            ON purchases FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to insert their own purchases
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchases' 
        AND policyname = 'Users can insert their own purchases'
    ) THEN
        CREATE POLICY "Users can insert their own purchases"
            ON purchases FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to delete their own purchases
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchases' 
        AND policyname = 'Users can delete their own purchases'
    ) THEN
        CREATE POLICY "Users can delete their own purchases"
            ON purchases FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,
    last_read TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, book_id)
);

-- Enable RLS for reading_progress
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own reading progress
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reading_progress' 
        AND policyname = 'Users can view their own reading progress'
    ) THEN
        CREATE POLICY "Users can view their own reading progress"
            ON reading_progress FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to update their own reading progress
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reading_progress' 
        AND policyname = 'Users can update their own reading progress'
    ) THEN
        CREATE POLICY "Users can update their own reading progress"
            ON reading_progress FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own notes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notes' 
        AND policyname = 'Users can view their own notes'
    ) THEN
        CREATE POLICY "Users can view their own notes"
            ON notes FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to manage their own notes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notes' 
        AND policyname = 'Users can manage their own notes'
    ) THEN
        CREATE POLICY "Users can manage their own notes"
            ON notes FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Categories are viewable by everyone'
    ) THEN
        CREATE POLICY "Categories are viewable by everyone"
            ON categories FOR SELECT
            USING (true);
    END IF;
END $$;

-- Create policy to allow authenticated users to manage categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Authenticated users can manage categories'
    ) THEN
        CREATE POLICY "Authenticated users can manage categories"
            ON categories FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Create book_categories junction table
CREATE TABLE IF NOT EXISTS book_categories (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (book_id, category_id)
);

-- Enable RLS for book_categories
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view book categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'book_categories' 
        AND policyname = 'Book categories are viewable by everyone'
    ) THEN
        CREATE POLICY "Book categories are viewable by everyone"
            ON book_categories FOR SELECT
            USING (true);
    END IF;
END $$;

-- Create policy to allow authenticated users to manage book categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'book_categories' 
        AND policyname = 'Authenticated users can manage book categories'
    ) THEN
        CREATE POLICY "Authenticated users can manage book categories"
            ON book_categories FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
    ('Fiction', 'Imaginative works of prose', 'book'),
    ('Non-Fiction', 'Factual works based on real events and information', 'document'),
    ('Science Fiction', 'Futuristic and scientific themes', 'rocket'),
    ('Fantasy', 'Magical and supernatural elements', 'sparkles'),
    ('Mystery', 'Suspense and detective stories', 'magnifying-glass'),
    ('Romance', 'Love and relationships', 'heart'),
    ('Biography', 'Life stories of real people', 'user'),
    ('History', 'Historical events and periods', 'clock'),
    ('Self-Help', 'Personal development and improvement', 'light-bulb'),
    ('Business', 'Business and professional topics', 'briefcase'),
    ('Technology', 'Computers, programming, and tech', 'computer'),
    ('Science', 'Scientific topics and discoveries', 'flask'),
    ('Philosophy', 'Philosophical works and ideas', 'academic-cap'),
    ('Poetry', 'Poetic works and collections', 'pencil'),
    ('Children', 'Books for young readers', 'academic-cap')
ON CONFLICT (name) DO NOTHING;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    bio TEXT,
    reading_preferences JSONB,
    reading_goals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile"
            ON user_profiles FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to update their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile"
            ON user_profiles FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    page_number INTEGER,
    chapter TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, book_id, page_number)
);

-- Enable RLS for bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own bookmarks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookmarks' 
        AND policyname = 'Users can manage their own bookmarks'
    ) THEN
        CREATE POLICY "Users can manage their own bookmarks"
            ON bookmarks FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, book_id)
);

-- Enable RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view reviews
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' 
        AND policyname = 'Reviews are viewable by everyone'
    ) THEN
        CREATE POLICY "Reviews are viewable by everyone"
            ON reviews FOR SELECT
            USING (true);
    END IF;
END $$;

-- Create policy to allow users to manage their own reviews
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' 
        AND policyname = 'Users can manage their own reviews'
    ) THEN
        CREATE POLICY "Users can manage their own reviews"
            ON reviews FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create reading_goals table
CREATE TABLE IF NOT EXISTS reading_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_books INTEGER,
    target_pages INTEGER,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    progress_books INTEGER DEFAULT 0,
    progress_pages INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CHECK (end_date > start_date)
);

-- Enable RLS for reading_goals
ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own reading goals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reading_goals' 
        AND policyname = 'Users can manage their own reading goals'
    ) THEN
        CREATE POLICY "Users can manage their own reading goals"
            ON reading_goals FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_goals_updated_at
    BEFORE UPDATE ON reading_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('whatsapp', 'instagram', 'other')),
    payment_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, book_id, status)
);

-- Enable RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can view their own orders'
    ) THEN
        CREATE POLICY "Users can view their own orders"
            ON orders FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to create their own orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can create their own orders'
    ) THEN
        CREATE POLICY "Users can create their own orders"
            ON orders FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to update their own orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can update their own orders'
    ) THEN
        CREATE POLICY "Users can update their own orders"
            ON orders FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 