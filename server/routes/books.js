const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET /books - получить список книг
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { title, author, description, category_id, cover_url } = req.body;
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
router.put('/:id', [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('author').optional().notEmpty().withMessage('Author cannot be empty')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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
router.delete('/:id', async (req, res) => {
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

module.exports = router; 