const express = require('express');
const pool = require('../db/config');
const router = express.Router();

// GET Dashboard Summary - All key metrics in one endpoint
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Generating dashboard summary...');
    
    // Get highest cost recipes
    const highestCostRecipes = await pool.query(`
      SELECT 
        name,
        servings,
        total_recipe_cost,
        cost_per_serving,
        created_at
      FROM recipes 
      ORDER BY CAST(total_recipe_cost AS DECIMAL) DESC 
      LIMIT 5
    `);

    // Get most profitable recipes (assuming revenue is 3x cost for example)
    const mostProfitableRecipes = await pool.query(`
      SELECT 
        name,
        servings,
        total_recipe_cost,
        cost_per_serving,
        COALESCE(total_revenue, CAST(total_recipe_cost AS DECIMAL) * 3) as estimated_revenue,
        COALESCE(total_revenue, CAST(total_recipe_cost AS DECIMAL) * 3) - CAST(total_recipe_cost AS DECIMAL) as estimated_profit,
        COALESCE(profit_margin, ROUND(((COALESCE(total_revenue, CAST(total_recipe_cost AS DECIMAL) * 3) - CAST(total_recipe_cost AS DECIMAL)) / COALESCE(total_revenue, CAST(total_recipe_cost AS DECIMAL) * 3)) * 100, 2)) as profit_margin_percent
      FROM recipes 
      WHERE total_recipe_cost IS NOT NULL AND total_recipe_cost != '0'
      ORDER BY estimated_profit DESC 
      LIMIT 5
    `);

    // Calculate average profit margin
    const avgProfitMargin = await pool.query(`
      SELECT 
        ROUND(AVG(COALESCE(profit_margin, ((COALESCE(total_revenue, CAST(total_recipe_cost AS DECIMAL) * 3) - CAST(total_recipe_cost AS DECIMAL)) / COALESCE(total_revenue, CAST(total_recipe_cost AS DECIMAL) * 3) * 100))), 2) as avg_profit_margin,
        COUNT(*) as total_recipes
      FROM recipes 
      WHERE total_recipe_cost IS NOT NULL AND total_recipe_cost != '0'
    `);

    // Weekly cost and revenue analysis (last 4 weeks)
    const weeklyAnalysis = await pool.query(`
      SELECT 
        DATE_TRUNC('week', created_at) as week_start,
        COUNT(*) as recipes_created,
        SUM(CAST(total_recipe_cost AS DECIMAL)) as total_cost,
        SUM(CASE 
          WHEN total_revenue IS NOT NULL AND total_revenue > 0 
          THEN CAST(total_revenue AS DECIMAL)
          ELSE CAST(total_recipe_cost AS DECIMAL) * 3
        END) as total_revenue,
        SUM(CASE 
          WHEN total_revenue IS NOT NULL AND total_revenue > 0 
          THEN CAST(total_revenue AS DECIMAL) - CAST(total_recipe_cost AS DECIMAL)
          ELSE (CAST(total_recipe_cost AS DECIMAL) * 3) - CAST(total_recipe_cost AS DECIMAL)
        END) as total_profit,
        AVG(CASE 
          WHEN profit_margin IS NOT NULL AND profit_margin > 0 
          THEN CAST(profit_margin AS DECIMAL)
          ELSE ((CAST(total_recipe_cost AS DECIMAL) * 3) - CAST(total_recipe_cost AS DECIMAL)) / (CAST(total_recipe_cost AS DECIMAL) * 3) * 100
        END) as avg_profit_margin
      FROM recipes 
      WHERE 
        created_at >= NOW() - INTERVAL '4 weeks'
        AND total_recipe_cost IS NOT NULL 
        AND total_recipe_cost != '0'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start DESC
    `);

    // Recipe count and cost breakdown
    const recipeStats = await pool.query(`
      SELECT 
        COUNT(*) as total_recipes,
        SUM(CAST(total_recipe_cost AS DECIMAL)) as total_cost_all_recipes,
        AVG(CAST(total_recipe_cost AS DECIMAL)) as avg_recipe_cost,
        MAX(CAST(total_recipe_cost AS DECIMAL)) as highest_recipe_cost,
        MIN(CAST(total_recipe_cost AS DECIMAL)) as lowest_recipe_cost
      FROM recipes 
      WHERE total_recipe_cost IS NOT NULL AND total_recipe_cost != '0'
    `);

    // Vendor cost analysis
    const vendorAnalysis = await pool.query(`
      SELECT 
        v.name as vendor_name,
        COUNT(i.id) as ingredient_count,
        SUM(CAST(i.cost_per_unit AS DECIMAL)) as total_vendor_cost,
        AVG(CAST(i.cost_per_unit AS DECIMAL)) as avg_ingredient_cost
      FROM vendors v
      LEFT JOIN ingredients i ON v.id = i.vendor_id
      GROUP BY v.id, v.name
      ORDER BY total_vendor_cost DESC
    `);
    
    console.log('🔍 Vendor analysis results:', vendorAnalysis.rows);

    const dashboardData = {
      highest_cost_recipes: highestCostRecipes.rows,
      most_profitable_recipes: mostProfitableRecipes.rows,
      average_profit_margin: avgProfitMargin.rows[0],
      weekly_analysis: weeklyAnalysis.rows,
      recipe_statistics: recipeStats.rows[0],
      vendor_analysis: vendorAnalysis.rows,
      generated_at: new Date().toISOString()
    };

    console.log('✅ Dashboard data generated successfully');
    res.json(dashboardData);
  } catch (err) {
    console.error('❌ Error generating dashboard:', err);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

// GET Highest Cost Recipes
router.get('/highest-cost-recipes', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const result = await pool.query(`
      SELECT 
        id,
        name,
        servings,
        total_recipe_cost,
        cost_per_serving,
        created_at
      FROM recipes 
      ORDER BY CAST(total_recipe_cost AS DECIMAL) DESC 
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching highest cost recipes:', err);
    res.status(500).json({ error: 'Failed to fetch highest cost recipes' });
  }
});

// GET Most Profitable Recipes
router.get('/most-profitable-recipes', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const profitMultiplier = req.query.profit_multiplier || 3; // Default 3x markup
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        servings,
        total_recipe_cost,
        cost_per_serving,
        CAST(total_recipe_cost AS DECIMAL) * $2 as estimated_revenue,
        (CAST(total_recipe_cost AS DECIMAL) * $2) - CAST(total_recipe_cost AS DECIMAL) as estimated_profit,
        ROUND(((CAST(total_recipe_cost AS DECIMAL) * $2) - CAST(total_recipe_cost AS DECIMAL)) / (CAST(total_recipe_cost AS DECIMAL) * $2) * 100, 2) as profit_margin_percent,
        created_at
      FROM recipes 
      WHERE total_recipe_cost IS NOT NULL AND total_recipe_cost != '0'
      ORDER BY estimated_profit DESC 
      LIMIT $1
    `, [limit, profitMultiplier]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching most profitable recipes:', err);
    res.status(500).json({ error: 'Failed to fetch most profitable recipes' });
  }
});

// GET Weekly Revenue Analysis
router.get('/weekly-analysis', async (req, res) => {
  try {
    const weeks = req.query.weeks || 8; // Default last 8 weeks
    const profitMultiplier = req.query.profit_multiplier || 3;
    
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('week', created_at) as week_start,
        TO_CHAR(DATE_TRUNC('week', created_at), 'MM/DD/YYYY') as week_label,
        COUNT(*) as recipes_created,
        SUM(CAST(total_recipe_cost AS DECIMAL)) as total_cost,
        SUM(CAST(total_recipe_cost AS DECIMAL) * $2) as estimated_revenue,
        SUM((CAST(total_recipe_cost AS DECIMAL) * $2) - CAST(total_recipe_cost AS DECIMAL)) as estimated_profit,
        ROUND(AVG(((CAST(total_recipe_cost AS DECIMAL) * $2) - CAST(total_recipe_cost AS DECIMAL)) / (CAST(total_recipe_cost AS DECIMAL) * $2) * 100), 2) as avg_profit_margin
      FROM recipes 
      WHERE 
        created_at >= NOW() - INTERVAL '$1 weeks'
        AND total_recipe_cost IS NOT NULL 
        AND total_recipe_cost != '0'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start DESC
    `, [weeks, profitMultiplier]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching weekly analysis:', err);
    res.status(500).json({ error: 'Failed to fetch weekly analysis' });
  }
});

// GET Recipe Performance Metrics
router.get('/recipe-metrics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_recipes,
        SUM(CAST(total_recipe_cost AS DECIMAL)) as total_cost_all_recipes,
        AVG(CAST(total_recipe_cost AS DECIMAL)) as avg_recipe_cost,
        MAX(CAST(total_recipe_cost AS DECIMAL)) as highest_recipe_cost,
        MIN(CAST(total_recipe_cost AS DECIMAL)) as lowest_recipe_cost,
        SUM(servings) as total_servings_all_recipes,
        AVG(servings) as avg_servings_per_recipe
      FROM recipes 
      WHERE total_recipe_cost IS NOT NULL AND total_recipe_cost != '0'
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching recipe metrics:', err);
    res.status(500).json({ error: 'Failed to fetch recipe metrics' });
  }
});

module.exports = router;
