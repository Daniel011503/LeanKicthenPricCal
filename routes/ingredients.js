const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/config');
const router = express.Router();

// Validation middleware
const validateIngredient = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('cost_per_unit').isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('unit_type').notEmpty().trim().withMessage('Unit type is required'),
  body('vendor_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Vendor ID must be a positive integer')
];

// GET all ingredients
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, 
             v.name as vendor_name,
             CASE 
               WHEN i.last_price_check < CURRENT_DATE - INTERVAL '30 days' 
               THEN true ELSE false 
             END as price_outdated
      FROM ingredients i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      ORDER BY i.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

// GET single ingredient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ingredient' });
  }
});

// POST create new ingredient
router.post('/', validateIngredient, async (req, res) => {
  try {
    console.log('🥬 POST request received for creating ingredient');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, cost_per_unit, quantity, unit_type, vendor_id } = req.body;
    
    console.log('🥬 Creating ingredient:', { name, cost_per_unit, quantity, unit_type, vendor_id });
    
    // Calculate base_cost automatically (cost per single unit)
    const base_cost = cost_per_unit / quantity;
    
    const result = await pool.query(
      `INSERT INTO ingredients 
       (name, cost_per_unit, base_cost, quantity, unit_type, vendor_id, last_price_check) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE) RETURNING *`,
      [name, cost_per_unit, base_cost, quantity, unit_type, vendor_id || null]
    );
    
    console.log('✅ Ingredient created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating ingredient:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Ingredient with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create ingredient' });
    }
  }
});

// PUT update ingredient
router.put('/:id', validateIngredient, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, cost_per_unit, quantity, unit_type, vendor_id } = req.body;
    
    // Calculate base_cost automatically (cost per single unit)
    const base_cost = cost_per_unit / quantity;
    
    const result = await pool.query(
      `UPDATE ingredients 
       SET name = $1, cost_per_unit = $2, base_cost = $3, quantity = $4, unit_type = $5, 
           vendor_id = $6, last_price_check = CURRENT_DATE, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 RETURNING *`,
      [name, cost_per_unit, base_cost, quantity, unit_type, vendor_id || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Ingredient with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update ingredient' });
    }
  }
});

// DELETE ingredient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM ingredients WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete ingredient' });
  }
});

module.exports = router;