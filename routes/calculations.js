const express = require('express');
const pool = require('../db/config');
const router = express.Router();

// GET recipe cost breakdown
router.get('/recipe/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get recipe cost summary
    const costSummaryResult = await pool.query(
      'SELECT * FROM recipe_cost_summary WHERE id = $1',
      [id]
    );
    
    if (costSummaryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const costSummary = costSummaryResult.rows[0];
    
    // Calculate suggested pricing based on profit margin
    const costPerServing = parseFloat(costSummary.cost_per_serving);
    const profitMargin = parseFloat(costSummary.desired_profit_margin) / 100;
    const suggestedPrice = costPerServing / (1 - profitMargin);
    const profitPerServing = suggestedPrice - costPerServing;
    const totalProfit = profitPerServing * parseInt(costSummary.servings);
    
    // Get detailed ingredient breakdown
    const ingredientBreakdownResult = await pool.query(`
      SELECT i.name as ingredient_name,
             ri.quantity_used,
             ri.unit_type,
             i.cost_per_unit,
             (ri.quantity_used * i.cost_per_unit) as total_cost,
             ROUND(((ri.quantity_used * i.cost_per_unit) / NULLIF(rcs.total_ingredient_cost, 0) * 100), 2) as percentage_of_ingredient_cost
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN recipe_cost_summary rcs ON ri.recipe_id = rcs.id
      WHERE ri.recipe_id = $1
      ORDER BY total_cost DESC
    `, [id]);
    
    // Get additional costs breakdown
    const additionalCostsResult = await pool.query(
      'SELECT * FROM additional_costs WHERE recipe_id = $1 ORDER BY cost_amount DESC',
      [id]
    );
    
    const response = {
      recipe_id: parseInt(id),
      recipe_name: costSummary.name,
      servings: parseInt(costSummary.servings),
      costs: {
        total_ingredient_cost: parseFloat(costSummary.total_ingredient_cost),
        total_additional_cost: parseFloat(costSummary.total_additional_cost),
        total_recipe_cost: parseFloat(costSummary.total_recipe_cost),
        cost_per_serving: costPerServing
      },
      pricing: {
        desired_profit_margin: parseFloat(costSummary.desired_profit_margin),
        suggested_price_per_serving: parseFloat(suggestedPrice.toFixed(2)),
        profit_per_serving: parseFloat(profitPerServing.toFixed(2)),
        total_profit: parseFloat(totalProfit.toFixed(2))
      },
      breakdown: {
        ingredients: ingredientBreakdownResult.rows,
        additional_costs: additionalCostsResult.rows
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate recipe costs' });
  }
});

// POST calculate custom pricing scenarios
router.post('/pricing-scenarios', async (req, res) => {
  try {
    const { recipe_id, profit_margins } = req.body;
    
    if (!recipe_id || !profit_margins || !Array.isArray(profit_margins)) {
      return res.status(400).json({ error: 'recipe_id and profit_margins array are required' });
    }
    
    // Get recipe cost summary
    const costSummaryResult = await pool.query(
      'SELECT * FROM recipe_cost_summary WHERE id = $1',
      [recipe_id]
    );
    
    if (costSummaryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const costSummary = costSummaryResult.rows[0];
    const costPerServing = parseFloat(costSummary.cost_per_serving);
    
    const scenarios = profit_margins.map(margin => {
      const profitMarginDecimal = parseFloat(margin) / 100;
      const suggestedPrice = costPerServing / (1 - profitMarginDecimal);
      const profitPerServing = suggestedPrice - costPerServing;
      const totalProfit = profitPerServing * parseInt(costSummary.servings);
      
      return {
        profit_margin: parseFloat(margin),
        suggested_price_per_serving: parseFloat(suggestedPrice.toFixed(2)),
        profit_per_serving: parseFloat(profitPerServing.toFixed(2)),
        total_profit: parseFloat(totalProfit.toFixed(2))
      };
    });
    
    res.json({
      recipe_id: parseInt(recipe_id),
      recipe_name: costSummary.name,
      cost_per_serving: costPerServing,
      scenarios: scenarios
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate pricing scenarios' });
  }
});

// GET ingredient usage across all recipes
router.get('/ingredient-usage', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.name as ingredient_name,
             COUNT(ri.recipe_id) as used_in_recipes,
             SUM(ri.quantity_used) as total_quantity_used,
             i.unit_type,
             SUM(ri.quantity_used * i.cost_per_unit) as total_cost_across_recipes
      FROM ingredients i
      LEFT JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
      GROUP BY i.id, i.name, i.unit_type
      ORDER BY total_cost_across_recipes DESC NULLS LAST
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ingredient usage' });
  }
});

// GET profitability analysis for all recipes
router.get('/profitability-analysis', async (req, res) => {
  try {
    // Get all recipes with their week
    const recipesResult = await pool.query(`
      SELECT r.id, r.name as recipe_name, r.week,
             rcs.servings, rcs.total_recipe_cost, rcs.cost_per_serving,
             r.desired_profit_margin,
             r.selling_price_per_serving,
             ROUND((rcs.cost_per_serving / (1 - r.desired_profit_margin / 100)), 2) as suggested_price_per_serving,
             ROUND((rcs.cost_per_serving / (1 - r.desired_profit_margin / 100)) - rcs.cost_per_serving, 2) as profit_per_serving,
             ROUND(((rcs.cost_per_serving / (1 - r.desired_profit_margin / 100)) - rcs.cost_per_serving) * rcs.servings, 2) as total_profit
      FROM recipes r
      JOIN recipe_cost_summary rcs ON r.id = rcs.id
      ORDER BY r.week DESC, r.id ASC
    `);

    // Group recipes by week start (Sunday)
    const groupByWeek = {};
    for (const recipe of recipesResult.rows) {
      let weekStart = recipe.week;
      if (weekStart) {
        // Parse week as date and get previous Sunday
        const date = new Date(weekStart);
        if (!isNaN(date.getTime())) {
          const day = date.getDay();
          date.setDate(date.getDate() - day);
          weekStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
      } else {
        weekStart = 'Unscheduled';
      }
      if (!groupByWeek[weekStart]) groupByWeek[weekStart] = [];
      groupByWeek[weekStart].push(recipe);
    }

    // Calculate totals per week
    const weekData = Object.entries(groupByWeek).map(([week, recipes]) => {
      const total_cost = recipes.reduce((sum, r) => sum + parseFloat(r.total_recipe_cost || 0), 0);
      const total_revenue = recipes.reduce((sum, r) => sum + (parseFloat(r.selling_price_per_serving || 0) * parseFloat(r.servings || 0)), 0);
      const total_profit = recipes.reduce((sum, r) => sum + parseFloat(r.total_profit || 0), 0);
      const avg_profit_margin = recipes.length > 0 ? (recipes.reduce((sum, r) => sum + parseFloat(r.desired_profit_margin || 0), 0) / recipes.length) : 0;
      return {
        week,
        recipes,
        recipes_created: recipes.length,
        total_cost,
        total_revenue,
        total_profit,
        avg_profit_margin
      };
    });

    res.json(weekData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profitability analysis' });
  }
});

module.exports = router;