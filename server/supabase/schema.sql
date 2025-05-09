-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (id)
);

-- Create books table
CREATE TABLE public.books (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_shelves table
CREATE TABLE public.user_shelves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, book_id)
);

-- Create RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shelves ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Books policies
CREATE POLICY "Books are viewable by everyone" ON public.books
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert books"
  ON public.books FOR INSERT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- User shelves policies
CREATE POLICY "Users can view their own shelf" ON public.user_shelves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add books to their shelf" ON public.user_shelves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some sample books
INSERT INTO public.books (title, author, genre, description, cover_url, price) VALUES
  ('The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.', 'https://example.com/gatsby.jpg', 9.99),
  ('To Kill a Mockingbird', 'Harper Lee', 'Fiction', 'The story of racial injustice and the loss of innocence in the American South.', 'https://example.com/mockingbird.jpg', 12.99),
  ('1984', 'George Orwell', 'Science Fiction', 'A dystopian social science fiction novel and cautionary tale.', 'https://example.com/1984.jpg', 10.99); 