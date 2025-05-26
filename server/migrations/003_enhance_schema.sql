-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create new enum types
CREATE TYPE theme_color AS ENUM ('light', 'dark', 'sepia', 'custom');
CREATE TYPE share_platform AS ENUM ('twitter', 'facebook', 'instagram', 'whatsapp', 'telegram');
CREATE TYPE admin_action_type AS ENUM ('add_book', 'update_book', 'delete_book', 'assign_purchase', 'update_user', 'delete_user');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Add role column to user_profiles if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Modify user_profiles table to add theme preferences
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS preferred_theme theme_color DEFAULT 'light',
ADD COLUMN IF NOT EXISTS preferred_genre TEXT,
ADD COLUMN IF NOT EXISTS theme_customization JSONB DEFAULT '{
  "primary_color": "#000000",
  "secondary_color": "#ffffff",
  "background_color": "#f5f5f5",
  "text_color": "#333333"
}'::jsonb;

-- Create book_files table for PDF access
CREATE TABLE IF NOT EXISTS book_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL DEFAULT 'pdf',
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    page_count INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(book_id, file_type)
);

-- Create user_shelf table
CREATE TABLE IF NOT EXISTS user_shelf (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    shelf_type TEXT NOT NULL CHECK (shelf_type IN ('reading', 'completed', 'want_to_read', 'favorites')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, book_id, shelf_type)
);

-- Create genre_stats table for analytics
CREATE TABLE IF NOT EXISTS genre_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    genre TEXT NOT NULL,
    total_reads INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in minutes
    average_rating DECIMAL(3,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(genre)
);

-- Create book_stats table for analytics
CREATE TABLE IF NOT EXISTS book_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    total_reads INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in minutes
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(book_id)
);

-- Create author_stats table for analytics
CREATE TABLE IF NOT EXISTS author_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    author TEXT NOT NULL,
    total_books INTEGER DEFAULT 0,
    total_reads INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(author)
);

-- Create shared_stories table for social sharing
CREATE TABLE IF NOT EXISTS shared_stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    platform share_platform NOT NULL,
    share_text TEXT,
    share_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, book_id, platform)
);

-- Create manual_purchases table
CREATE TABLE IF NOT EXISTS manual_purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    payment_reference TEXT,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type admin_action_type NOT NULL,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    action_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_files_book ON book_files(book_id);
CREATE INDEX IF NOT EXISTS idx_user_shelf_user ON user_shelf(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shelf_book ON user_shelf(book_id);
CREATE INDEX IF NOT EXISTS idx_genre_stats_genre ON genre_stats(genre);
CREATE INDEX IF NOT EXISTS idx_book_stats_book ON book_stats(book_id);
CREATE INDEX IF NOT EXISTS idx_author_stats_author ON author_stats(author);
CREATE INDEX IF NOT EXISTS idx_shared_stories_user ON shared_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_stories_book ON shared_stories(book_id);
CREATE INDEX IF NOT EXISTS idx_manual_purchases_user ON manual_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_purchases_admin ON manual_purchases(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);

-- Enable Row Level Security
ALTER TABLE book_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shelf ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for book_files
CREATE POLICY "Users can view book files they have purchased"
    ON book_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM manual_purchases mp
            WHERE mp.book_id = book_files.book_id
            AND mp.user_id = auth.uid()
            AND mp.status = 'confirmed'
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Create RLS policies for user_shelf
CREATE POLICY "Users can manage their own shelf"
    ON user_shelf FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for genre_stats
CREATE POLICY "Anyone can view genre stats"
    ON genre_stats FOR SELECT
    USING (true);

-- Create RLS policies for book_stats
CREATE POLICY "Anyone can view book stats"
    ON book_stats FOR SELECT
    USING (true);

-- Create RLS policies for author_stats
CREATE POLICY "Anyone can view author stats"
    ON author_stats FOR SELECT
    USING (true);

-- Create RLS policies for shared_stories
CREATE POLICY "Users can manage their own shared stories"
    ON shared_stories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for manual_purchases
CREATE POLICY "Users can view their own manual purchases"
    ON manual_purchases FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ));

-- Create RLS policies for admin_actions
CREATE POLICY "Only admins can view admin actions"
    ON admin_actions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ));

-- Create function to update theme based on genre
CREATE OR REPLACE FUNCTION update_user_theme()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's preferred genre and theme based on most read genre
    UPDATE user_profiles
    SET preferred_genre = (
        SELECT genre
        FROM books b
        JOIN user_shelf us ON b.id = us.book_id
        WHERE us.user_id = NEW.user_id
        AND us.shelf_type = 'completed'
        GROUP BY genre
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating theme
CREATE TRIGGER update_user_theme_trigger
    AFTER INSERT OR UPDATE ON user_shelf
    FOR EACH ROW
    EXECUTE FUNCTION update_user_theme();

-- Create function to update stats
CREATE OR REPLACE FUNCTION update_book_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update book stats
    INSERT INTO book_stats (book_id, total_reads, total_time_spent, average_rating, total_reviews)
    SELECT 
        b.id,
        COUNT(DISTINCT us.user_id),
        COALESCE(SUM(rp.progress), 0),
        COALESCE(AVG(r.rating), 0),
        COUNT(DISTINCT r.id)
    FROM books b
    LEFT JOIN user_shelf us ON b.id = us.book_id AND us.shelf_type = 'completed'
    LEFT JOIN reading_progress rp ON b.id = rp.book_id
    LEFT JOIN reviews r ON b.id = r.book_id
    WHERE b.id = NEW.book_id
    GROUP BY b.id
    ON CONFLICT (book_id) DO UPDATE
    SET 
        total_reads = EXCLUDED.total_reads,
        total_time_spent = EXCLUDED.total_time_spent,
        average_rating = EXCLUDED.average_rating,
        total_reviews = EXCLUDED.total_reviews,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating book stats
CREATE TRIGGER update_book_stats_trigger
    AFTER INSERT OR UPDATE ON user_shelf
    FOR EACH ROW
    EXECUTE FUNCTION update_book_stats(); 