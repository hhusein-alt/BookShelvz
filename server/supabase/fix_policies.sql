-- Fix auth.uid() calls in RLS policies by wrapping them in subqueries
-- Orders table policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
CREATE POLICY "Users can create their own orders"
    ON orders FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
CREATE POLICY "Users can update their own orders"
    ON orders FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Purchases table policies
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
CREATE POLICY "Users can view their own purchases"
    ON purchases FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own purchases" ON purchases;
CREATE POLICY "Users can insert their own purchases"
    ON purchases FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own purchases" ON purchases;
CREATE POLICY "Users can delete their own purchases"
    ON purchases FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- Bookmarks table policies
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON bookmarks;
CREATE POLICY "Users can manage their own bookmarks"
    ON bookmarks FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Notes table policies
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
CREATE POLICY "Users can manage their own notes"
    ON notes FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Reading goals table policies
DROP POLICY IF EXISTS "Users can manage their own reading goals" ON reading_goals;
CREATE POLICY "Users can manage their own reading goals"
    ON reading_goals FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Reviews table policies
DROP POLICY IF EXISTS "Users can manage their own reviews" ON reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own reviews"
    ON reviews FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- User profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can manage their own profile"
    ON user_profiles FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Reading progress table policies
DROP POLICY IF EXISTS "Users can view their own reading progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can update their own reading progress" ON reading_progress;
CREATE POLICY "Users can manage their own reading progress"
    ON reading_progress FOR ALL
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Categories table policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
CREATE POLICY "Categories are viewable by everyone"
    ON categories FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage categories"
    ON categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Book categories table policies
DROP POLICY IF EXISTS "Book categories are viewable by everyone" ON book_categories;
DROP POLICY IF EXISTS "Authenticated users can manage book categories" ON book_categories;
CREATE POLICY "Book categories are viewable by everyone"
    ON book_categories FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage book categories"
    ON book_categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true); 