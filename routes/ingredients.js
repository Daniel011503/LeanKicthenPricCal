const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/config');
const router = express.Router();

// Validation middleware
const validateIngredient = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('cost_per_unit').isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  body('base_cost').optional().isFloat({ min: 0 }).withMessage('Base cost must be a positive number'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('unit_type').notEmpty().trim().withMessage('Unit type is required')
];

// GET all ingredients
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ingredients ORDER BY name ASC'
    );
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, cost_per_unit, base_cost, quantity, unit_type } = req.body;
    
    const result = await pool.query(
      'INSERT INTO ingredients (name, cost_per_unit, base_cost, quantity, unit_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, cost_per_unit, base_cost || null, quantity, unit_type]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
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
    const { name, cost_per_unit, base_cost, quantity, unit_type } = req.body;
    
    const result = await pool.query(
      'UPDATE ingredients SET name = $1, cost_per_unit = $2, base_cost = $3, quantity = $4, unit_type = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, cost_per_unit, base_cost || null, quantity, unit_type, id]
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