const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/config');
const router = express.Router();

// Validation middleware for vendors
const validateVendor = [
  body('name').notEmpty().trim().withMessage('Vendor name is required'),
  body('address').optional().trim(),
  body('phone').optional().trim()
];

// GET all vendors
router.get('/', async (req, res) => {
  try {
    console.log('🏪 Getting all vendors...');
    const result = await pool.query(`
      SELECT v.*, 
             COUNT(i.id) as ingredient_count
      FROM vendors v
      LEFT JOIN ingredients i ON v.id = i.vendor_id
      WHERE v.is_active = true
      GROUP BY v.id
      ORDER BY v.name ASC
    `);
    console.log(`🏪 Found ${result.rows.length} vendors`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching vendors:', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET single vendor by ID with ingredients
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get vendor info
    const vendorResult = await pool.query(`
      SELECT * FROM vendors WHERE id = $1 AND is_active = true
    `, [id]);
    
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Get vendor's ingredients
    const ingredientsResult = await pool.query(`
      SELECT i.*, 
             CASE 
               WHEN i.last_price_check < CURRENT_DATE - INTERVAL '30 days' 
               THEN true ELSE false 
             END as price_outdated
      FROM ingredients i
      WHERE i.vendor_id = $1
      ORDER BY i.name ASC
    `, [id]);
    
    const vendor = vendorResult.rows[0];
    vendor.ingredients = ingredientsResult.rows;
    
    res.json(vendor);
  } catch (err) {
    console.error('❌ Error fetching vendor:', err);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// POST create new vendor
router.post('/', validateVendor, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, phone } = req.body;
    
    console.log('🏪 Creating vendor:', { name, address, phone });
    
    const result = await pool.query(
      'INSERT INTO vendors (name, address, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, address || null, phone || null]
    );
    
    console.log('✅ Vendor created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating vendor:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Vendor name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  }
});

// PUT update vendor
router.put('/:id', validateVendor, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, address, phone, is_active } = req.body;
    
    console.log('🏪 Updating vendor:', id, { name, address, phone });
    
    const result = await pool.query(
      `UPDATE vendors 
       SET name = $1, address = $2, phone = $3, 
           is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, address || null, phone || null, 
       is_active !== undefined ? is_active : true, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    console.log('✅ Vendor updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating vendor:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'Vendor name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update vendor' });
    }
  }
});

// DELETE vendor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Soft deleting vendor with ID: ${id}`);
    
    // Check if vendor has ingredients
    const ingredientCheck = await pool.query(
      'SELECT COUNT(*) FROM ingredients WHERE vendor_id = $1',
      [id]
    );
    
    const ingredientCount = parseInt(ingredientCheck.rows[0].count);
    
    if (ingredientCount > 0) {
      // Soft delete - mark as inactive
      const result = await pool.query(
        'UPDATE vendors SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      
      console.log(`✅ Vendor "${result.rows[0].name}" marked as inactive (has ${ingredientCount} ingredients)`);
      res.json({ 
        message: `Vendor marked as inactive (has ${ingredientCount} ingredients)`,
        vendor: result.rows[0]
      });
    } else {
      // Hard delete if no ingredients
      const result = await pool.query(
        'DELETE FROM vendors WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      
      console.log(`✅ Vendor "${result.rows[0].name}" deleted permanently`);
      res.json({ message: 'Vendor deleted successfully' });
    }
  } catch (err) {
    console.error('❌ Error deleting vendor:', err);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// GET vendor price comparison report
router.get('/reports/price-comparison', async (req, res) => {
  try {
    console.log('📊 Generating vendor price comparison report...');
    
    const result = await pool.query(`
      SELECT 
        i.name as ingredient_name,
        i.unit_type,
        v.name as vendor_name,
        i.cost_per_unit,
        i.last_price_check,
        CASE 
          WHEN i.last_price_check < CURRENT_DATE - INTERVAL '30 days' 
          THEN 'Outdated' ELSE 'Current' 
        END as price_status
      FROM ingredients i
      JOIN vendors v ON i.vendor_id = v.id
      WHERE v.is_active = true
      ORDER BY i.name, i.cost_per_unit ASC
    `);
    
    // Group by ingredient for comparison
    const comparison = {};
    result.rows.forEach(row => {
      if (!comparison[row.ingredient_name]) {
        comparison[row.ingredient_name] = [];
      }
      comparison[row.ingredient_name].push(row);
    });
    
    res.json(comparison);
  } catch (err) {
    console.error('❌ Error generating price comparison:', err);
    res.status(500).json({ error: 'Failed to generate price comparison report' });
  }
});

module.exports = router;
