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

-- 2. Create expense_categories table (if missing)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create expense_attachments table (if missing)
CREATE TABLE IF NOT EXISTS expense_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure FK to expense_entries
  CONSTRAINT expense_attachments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES expense_entries(id) ON DELETE CASCADE
);

-- 4. Fix Expense Entries Relationship
ALTER TABLE expense_entries 
DROP CONSTRAINT IF EXISTS expense_entries_category_id_fkey;

ALTER TABLE expense_entries 
ADD COLUMN IF NOT EXISTS category_id UUID;

ALTER TABLE expense_entries
ADD CONSTRAINT expense_entries_category_id_fkey
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
