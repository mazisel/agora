-- Fix missing column
ALTER TABLE task_transfers 
ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(50); -- Verify type from code if needed, assume varchar for now

-- Rename constraints to match code expectations
-- Support Tickets
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_agent_id_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_assigned_to_fkey 
    FOREIGN KEY (assigned_agent_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_profiles_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_requester_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_requester_id_fkey 
    FOREIGN KEY (requester_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Leave Requests (Code uses leave_requests_user_profiles_fkey, ensure it exists)
-- If it already exists, good. If not, recreate.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leave_requests_user_profiles_fkey'
    ) THEN
        ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
        ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Suggestions (Code uses suggestions_user_profiles_fkey)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'suggestions_user_profiles_fkey'
    ) THEN
        ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_user_id_fkey;
        ALTER TABLE suggestions ADD CONSTRAINT suggestions_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
