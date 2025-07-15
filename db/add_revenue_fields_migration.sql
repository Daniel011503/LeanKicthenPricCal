-- Add revenue tracking fields to recipes table
-- This migration adds support for tracking selling prices, revenue, and profit margins

-- Add selling_price_per_serving column
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS selling_price_per_serving DECIMAL(10,2) DEFAULT 0;

-- Add total_revenue column  
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0;

-- Add profit_margin column (percentage)
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0;

-- Add comments to document the new columns
COMMENT ON COLUMN recipes.selling_price_per_serving IS 'Price charged per serving ($)';
COMMENT ON COLUMN recipes.total_revenue IS 'Total revenue for all servings (selling_price_per_serving * servings)';
COMMENT ON COLUMN recipes.profit_margin IS 'Profit margin percentage ((revenue - cost) / revenue * 100)';
