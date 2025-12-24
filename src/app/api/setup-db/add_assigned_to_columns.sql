-- Add assigned_to column to leave_requests
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- Add FK for leave_requests.assigned_to
DO $$
BEGIN
    -- Check if constraint already exists (it shouldn't if I couldn't add it before because column was missing)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leave_requests_assigned_to_fkey'
    ) THEN
        ALTER TABLE leave_requests 
        ADD CONSTRAINT leave_requests_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;


-- Add assigned_to column to suggestions
ALTER TABLE suggestions 
ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- Add FK for suggestions.assigned_to
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'suggestions_assigned_to_fkey'
    ) THEN
        ALTER TABLE suggestions 
        ADD CONSTRAINT suggestions_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
