const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/config');
const router = express.Router();

// Validation middleware
const validatePacking = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
];

// GET all packing items
router.get('/', async (req, res) => {
  try {
    console.log('📦 Getting all packing items...');
    const result = await pool.query(`
      SELECT p.*
      FROM packing p
      ORDER BY p.name ASC
    `);
    console.log(`📦 Found ${result.rows.length} packing items`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching packing items:', err);
    res.status(500).json({ error: 'Failed to fetch packing items' });
  }
});

// GET single packing item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM packing WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Packing item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching packing item:', err);
    res.status(500).json({ error: 'Failed to fetch packing item' });
  }
});

// POST create new packing item
router.post('/', validatePacking, async (req, res) => {
  try {
    console.log('📦 Received packing data:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price } = req.body;
    
    console.log('💰 Packing values received:', { name, price, price_parsed: parseFloat(price) });

    const insertValues = [name.trim(), parseFloat(price)];
    
    console.log('📝 INSERT values:', insertValues);
    
    const result = await pool.query(
      'INSERT INTO packing (name, price) VALUES ($1, $2) RETURNING *',
      insertValues
    );
    
    console.log('✅ Packing item created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating packing item:', err);
    res.status(500).json({ 
      error: 'Failed to create packing item',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// PUT update packing item
router.put('/:id', validatePacking, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, price } = req.body;
    
    const result = await pool.query(
      'UPDATE packing SET name = $1, price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name.trim(), parseFloat(price), id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Packing item not found' });
    }
    
    console.log('✅ Packing item updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating packing item:', err);
    res.status(500).json({ error: 'Failed to update packing item' });
  }
});

// DELETE packing item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM packing WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Packing item not found' });
    }
    
    console.log('🗑️ Packing item deleted:', result.rows[0]);
    res.json({ message: 'Packing item deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting packing item:', err);
    res.status(500).json({ error: 'Failed to delete packing item' });
  }
});

module.exports = router;
