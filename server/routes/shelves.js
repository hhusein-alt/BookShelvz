const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { createShelf, findShelvesByUser, findShelfById, updateShelf, deleteShelf, addBookToShelf, removeBookFromShelf } = require('../models/shelf');

// Validation middleware
const validateShelf = [
    body('name').trim().notEmpty().withMessage('Shelf name is required'),
    body('description').optional().trim(),
];

const validateBookId = [
    param('bookId').notEmpty().withMessage('Book ID is required'),
];

// Get all shelves for the authenticated user
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const shelves = await findShelvesByUser(req.user.id);
    res.json(shelves);
}));

// Get a specific shelf
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const shelf = await findShelfById(req.params.id);

    if (!shelf) {
        return res.status(404).json({ message: 'Shelf not found' });
    }

    if (shelf.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(shelf);
}));

// Create a new shelf
router.post('/', authenticate, validateShelf, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const shelfData = {
        name: req.body.name,
        description: req.body.description,
        user_id: req.user.id,
        books: []
    };

    const newShelf = await createShelf(shelfData);
    res.status(201).json(newShelf);
}));

// Update a shelf
router.patch('/:id', authenticate, validateShelf, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const shelf = await findShelfById(req.params.id);
    if (!shelf) {
        return res.status(404).json({ message: 'Shelf not found' });
    }

    if (shelf.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    const shelfData = {
        name: req.body.name,
        description: req.body.description,
    };

    const updatedShelf = await updateShelf(req.params.id, shelfData);
    res.json(updatedShelf);
}));

// Delete a shelf
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const shelf = await findShelfById(req.params.id);
    if (!shelf) {
        return res.status(404).json({ message: 'Shelf not found' });
    }

    if (shelf.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    await deleteShelf(req.params.id);
    res.json({ message: 'Shelf deleted successfully' });
}));

// Add a book to a shelf
router.post('/:id/books', authenticate, validateBookId, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const shelfId = req.params.id;
    const { bookId } = req.body;

    const updatedShelf = await addBookToShelf(shelfId, bookId);

    const finalShelf = await findShelfById(shelfId);

    res.json(finalShelf);
}));

// Remove a book from a shelf
router.delete('/:id/books/:bookId', authenticate, validateBookId, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const shelfId = req.params.id;
    const bookId = req.params.bookId;

    const updatedShelf = await removeBookFromShelf(shelfId, bookId);

    const finalShelf = await findShelfById(shelfId);

    res.json(finalShelf);
}));

module.exports = router; 