const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/config');
const router = express.Router();

// Validation middleware
const validateRecipe = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('servings').isInt({ min: 1 }).withMessage('Servings must be a positive integer'),
  body('week').optional({ nullable: true }).isISO8601().withMessage('Week must be a valid date'),
  body('total_recipe_cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Total recipe cost must be non-negative'),
  body('cost_per_serving').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Cost per serving must be non-negative'),
  body('recipe_ingredients').optional().isArray().withMessage('Recipe ingredients must be an array'),
  body('recipe_packaging').optional().isArray().withMessage('Recipe packaging must be an array')
];

// GET all recipes
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting all recipes...');
    const result = await pool.query(`
      SELECT r.*
      FROM recipes r
      ORDER BY r.week DESC, r.name ASC
    `);
    console.log(`📋 Found ${result.rows.length} recipes`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching recipes:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🧪 Test endpoint hit!');
  res.json({ message: 'Backend is working!' });
});

// GET single recipe by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get recipe basic info
    const recipeResult = await pool.query(`
      SELECT r.*
      FROM recipes r
      WHERE r.id = $1
    `, [id]);
    
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Get recipe ingredients
    const ingredientsResult = await pool.query(`
      SELECT ri.*, i.name as ingredient_name, i.cost_per_unit as ingredient_cost_per_unit,
             i.unit_type as ingredient_unit_type,
             (ri.quantity_used * i.cost_per_unit) as total_cost
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = $1
      ORDER BY i.name ASC
    `, [id]);
    
    // Get recipe packaging
    const packagingResult = await pool.query(`
      SELECT rp.*, p.name as packaging_name, p.price as packaging_price,
             (rp.quantity * p.price) as total_cost
      FROM recipe_packaging rp
      JOIN packing p ON rp.packaging_id = p.id
      WHERE rp.recipe_id = $1
      ORDER BY p.name ASC
    `, [id]);
    
    const recipe = recipeResult.rows[0];
    recipe.ingredients = ingredientsResult.rows;
    recipe.packaging = packagingResult.rows;
    
    res.json(recipe);
  } catch (err) {
    console.error('❌ Error fetching recipe:', err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// POST create new recipe
router.post('/', validateRecipe, async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🍳 Received recipe data:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    await client.query('BEGIN');
    
    const {
      name,
      servings,
      week,
      total_recipe_cost,
      cost_per_serving,
      selling_price_per_serving,
      recipe_ingredients,
      recipe_packaging
    } = req.body;

    // Calculate total_revenue and profit_margin if possible
    const parsedServings = servings ? parseFloat(servings) : 0;
    const parsedSellingPrice = selling_price_per_serving ? parseFloat(selling_price_per_serving) : 0;
    const parsedTotalCost = total_recipe_cost ? parseFloat(total_recipe_cost) : 0;
    const total_revenue = (parsedServings > 0 && parsedSellingPrice > 0)
      ? (parsedServings * parsedSellingPrice)
      : 0;
    const profit_margin = (total_revenue > 0 && parsedTotalCost >= 0)
      ? (((total_revenue - parsedTotalCost) / total_revenue) * 100)
      : 0;

    console.log('💰 Cost and revenue values calculated:', {
      total_recipe_cost,
      cost_per_serving,
      selling_price_per_serving,
      total_revenue,
      profit_margin
    });

    // Insert recipe
    const insertValues = [
      name,
      servings,
      week || null,
      parsedTotalCost,
      cost_per_serving ? parseFloat(cost_per_serving) : 0,
      parsedSellingPrice,
      total_revenue,
      profit_margin
    ];

    console.log('📝 INSERT values with types:', insertValues.map((val, i) => ({
      index: i,
      value: val,
      type: typeof val
    })));

    const recipeResult = await client.query(
      'INSERT INTO recipes (name, servings, week, total_recipe_cost, cost_per_serving, selling_price_per_serving, total_revenue, profit_margin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      insertValues
    );
    
    const recipeId = recipeResult.rows[0].id;
    
    // Insert recipe ingredients if provided
    if (recipe_ingredients && recipe_ingredients.length > 0) {
      for (const ingredient of recipe_ingredients) {
        await client.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit_type) VALUES ($1, $2, $3, $4)',
          [recipeId, ingredient.ingredient_id, ingredient.quantity, ingredient.unit]
        );
      }
    }
    
    // Insert recipe packaging if provided
    if (recipe_packaging && recipe_packaging.length > 0) {
      for (const packaging of recipe_packaging) {
        await client.query(
          'INSERT INTO recipe_packaging (recipe_id, packaging_id, quantity) VALUES ($1, $2, $3)',
          [recipeId, packaging.packaging_id, packaging.quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Return the created recipe
    res.status(201).json(recipeResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating recipe:', err);
    res.status(500).json({ 
      error: 'Failed to create recipe',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    client.release();
  }
});

// PUT update recipe
router.put('/:id', validateRecipe, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      name, 
      servings, 
      week,
      total_recipe_cost,
      cost_per_serving,
      recipe_ingredients,
      recipe_packaging
    } = req.body;
    
    // Update recipe
    const recipeResult = await client.query(
      'UPDATE recipes SET name = $1, servings = $2, week = $3, total_recipe_cost = $4, cost_per_serving = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, servings, week || null, total_recipe_cost || 0, cost_per_serving || 0, id]
    );
    
    if (recipeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Update recipe ingredients if provided
    if (recipe_ingredients) {
      // Delete existing ingredients
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
      
      // Insert new ingredients
      for (const ingredient of recipe_ingredients) {
        await client.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit_type) VALUES ($1, $2, $3, $4)',
          [id, ingredient.ingredient_id, ingredient.quantity, ingredient.unit]
        );
      }
    }
    
    // Update recipe packaging if provided
    if (recipe_packaging) {
      // Delete existing packaging
      await client.query('DELETE FROM recipe_packaging WHERE recipe_id = $1', [id]);
      
      // Insert new packaging
      for (const packaging of recipe_packaging) {
        await client.query(
          'INSERT INTO recipe_packaging (recipe_id, packaging_id, quantity) VALUES ($1, $2, $3)',
          [id, packaging.packaging_id, packaging.quantity]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Return the updated recipe
    res.json(recipeResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating recipe:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    client.release();
  }
});

// DELETE recipe
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting recipe with ID: ${id}`);
    
    const result = await pool.query(
      'DELETE FROM recipes WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    console.log(`✅ Recipe "${result.rows[0].name}" deleted successfully`);
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting recipe:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});


// POST duplicate recipe
router.post('/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, week } = req.body; // Optional: allow user to specify new name and week

    // Fetch the original recipe
    const recipeResult = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Original recipe not found' });
    }
    const original = recipeResult.rows[0];

    // Fetch ingredients and packaging
    const ingredientsResult = await client.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [id]);
    const packagingResult = await client.query('SELECT * FROM recipe_packaging WHERE recipe_id = $1', [id]);

    // Prepare new recipe values
    const newName = name || `${original.name} (Copy)`;
    const newWeek = week || original.week;
    const insertValues = [
      newName,
      original.servings,
      newWeek,
      original.total_recipe_cost,
      original.cost_per_serving,
      original.selling_price_per_serving,
      original.total_revenue,
      original.profit_margin
    ];

    await client.query('BEGIN');
    // Insert new recipe
    const newRecipeResult = await client.query(
      'INSERT INTO recipes (name, servings, week, total_recipe_cost, cost_per_serving, selling_price_per_serving, total_revenue, profit_margin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      insertValues
    );
    const newRecipeId = newRecipeResult.rows[0].id;

    // Duplicate ingredients
    for (const ingredient of ingredientsResult.rows) {
      await client.query(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_used, unit_type) VALUES ($1, $2, $3, $4)',
        [newRecipeId, ingredient.ingredient_id, ingredient.quantity_used, ingredient.unit_type]
      );
    }

    // Duplicate packaging
    for (const packaging of packagingResult.rows) {
      await client.query(
        'INSERT INTO recipe_packaging (recipe_id, packaging_id, quantity) VALUES ($1, $2, $3)',
        [newRecipeId, packaging.packaging_id, packaging.quantity]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(newRecipeResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error duplicating recipe:', err);
    res.status(500).json({ error: 'Failed to duplicate recipe' });
  } finally {
    client.release();
  }
});

module.exports = router;