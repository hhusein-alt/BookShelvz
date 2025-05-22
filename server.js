require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// GET /books - получить список книг
app.get('/books', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /books/:id - получить книгу по ID
app.get('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching book:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /books - добавить новую книгу
app.post('/books', async (req, res) => {
  try {
    const { title, author, description, category_id, cover_url } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const { data, error } = await supabase
      .from('books')
      .insert([
        { title, author, description, category_id, cover_url }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating book:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /books/:id - обновить книгу
app.put('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, category_id, cover_url } = req.body;

    const { data, error } = await supabase
      .from('books')
      .update({ title, author, description, category_id, cover_url })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error updating book:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /books/:id - удалить книгу
app.delete('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /categories - получить список категорий
app.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
}); 