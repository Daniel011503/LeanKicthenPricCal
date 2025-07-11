-- Add box_count and cost_per_box columns to ingredients table
-- This migration adds support for tracking number of boxes and cost per box calculation

-- Add box_count column (defaults to 1 for existing ingredients)
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT 1 CHECK (box_count > 0);

-- Add cost_per_box column (will store cost_per_unit / box_count)
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS cost_per_box DECIMAL(10,2);

-- Update existing records to set cost_per_box = cost_per_unit / box_count
UPDATE ingredients 
SET cost_per_box = cost_per_unit / COALESCE(box_count, 1)
WHERE cost_per_box IS NULL;

-- Update existing records to recalculate base_cost using the correct formula
UPDATE ingredients 
SET base_cost = (cost_per_unit / COALESCE(box_count, 1)) / quantity;

-- Add comment to document the columns
COMMENT ON COLUMN ingredients.box_count IS 'Number of boxes/packages purchased';
COMMENT ON COLUMN ingredients.cost_per_box IS 'Cost per single box (cost_per_unit / box_count)';
COMMENT ON COLUMN ingredients.base_cost IS 'Cost per single unit ((cost_per_unit / box_count) / quantity_per_box)';
COMMENT ON COLUMN ingredients.cost_per_unit IS 'Total amount paid for all boxes';
COMMENT ON COLUMN ingredients.quantity IS 'Quantity per box (e.g., 3 lbs per box)';
