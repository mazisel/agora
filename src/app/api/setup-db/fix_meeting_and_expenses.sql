-- 1. Create meeting_rooms table
CREATE TABLE IF NOT EXISTS meeting_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  location VARCHAR(255),
  amenities TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fix Expense Entries Relationship
-- It seems the API tries to fetch 'attachments' via specific hinted relationship
-- We need to ensure expense_attachments has a foreign key to expense_entries
ALTER TABLE expense_attachments 
DROP CONSTRAINT IF EXISTS expense_attachments_expense_id_fkey;

ALTER TABLE expense_attachments
ADD CONSTRAINT expense_attachments_expense_id_fkey
FOREIGN KEY (expense_id) REFERENCES expense_entries(id) ON DELETE CASCADE;

-- Also check expense_categories just in case
ALTER TABLE expense_entries 
DROP CONSTRAINT IF EXISTS expense_entries_category_id_fkey;

ALTER TABLE expense_entries 
ADD COLUMN IF NOT EXISTS category_id UUID;

-- (Assuming expense_categories table exists, verify/add FK)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_categories') THEN
        ALTER TABLE expense_entries
        ADD CONSTRAINT expense_entries_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
