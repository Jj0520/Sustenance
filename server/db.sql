CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add these columns to the existing donations table to support monetary donations
-- Run these ALTER TABLE commands on your database:

ALTER TABLE donations ADD COLUMN IF NOT EXISTS donation_type VARCHAR(20) DEFAULT 'goods';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_path VARCHAR(255);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS message TEXT;

-- Update existing donations to have 'goods' as donation_type
UPDATE donations SET donation_type = 'goods' WHERE donation_type IS NULL;

-- Modify item_type to allow NULL values for monetary donations
ALTER TABLE donations ALTER COLUMN item_type DROP NOT NULL;

-- Add bank details columns to recipient table if they don't exist
ALTER TABLE recipient ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE recipient ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE recipient ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(100); 