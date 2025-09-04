-- Add is_system column to support_categories table
ALTER TABLE support_categories 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Update existing categories to mark system categories
UPDATE support_categories 
SET is_system = TRUE 
WHERE name IN ('Avans', 'Öneri Şikayet', 'Avans Talebi', 'Öneri / Şikayet');

-- Insert system categories if they don't exist
INSERT INTO support_categories (name, description, is_system) VALUES 
('Avans Talebi', 'Avans talepleri için destek kategorisi', TRUE),
('Öneri / Şikayet', 'Öneri ve şikayet talepleri için destek kategorisi', TRUE)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system;
