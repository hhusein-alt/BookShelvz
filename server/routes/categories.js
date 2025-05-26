const express = require('express');
const router = express.Router();
const { AppError } = require('../middleware/errorHandler');

// GET /categories - получить список категорий
router.get('/', async (req, res, next) => {
  try {
    const supabase = req.supabase; // Use supabase from request object
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
      
    if (error) return next(new AppError('Error fetching categories', 500, error));
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 