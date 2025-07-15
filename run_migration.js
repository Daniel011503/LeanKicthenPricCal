const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'recipe_cost_calculator',
  password: 'dannynico011',
  port: 5432,
});

async function runMigration() {
  try {
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    console.log('Adding revenue fields to recipes table...');
    
    // Add columns one by one
    try {
      await pool.query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS selling_price_per_serving DECIMAL(10,2) DEFAULT 0');
      console.log('✅ Added selling_price_per_serving column');
    } catch (error) {
      console.log('⚠️ selling_price_per_serving column may already exist');
    }
    
    try {
      await pool.query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0');
      console.log('✅ Added total_revenue column');
    } catch (error) {
      console.log('⚠️ total_revenue column may already exist');
    }
    
    try {
      await pool.query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0');
      console.log('✅ Added profit_margin column');
    } catch (error) {
      console.log('⚠️ profit_margin column may already exist');
    }
    
    // Check current table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Current recipes table structure:');
    tableInfo.rows.forEach(row => {
      console.log('- ' + row.column_name + ': ' + row.data_type);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
