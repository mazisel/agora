-- Support Tickets: Rename user_id to requester_id to match code
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE support_tickets RENAME COLUMN user_id TO requester_id;
    END IF;
END $$;

-- Support Tickets: Fix Foreign Keys with specific names expected by code hints
-- Requester
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_profiles_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_requester_id_fkey;

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_requester_id_fkey 
    FOREIGN KEY (requester_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Assigned To
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_agent_id_fkey;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_assigned_to_fkey 
    FOREIGN KEY (assigned_agent_id) REFERENCES user_profiles(id) ON DELETE SET NULL;


-- Leave Requests: Add assigned_to FK
-- Ensure column exists first (it should, but safety first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'assigned_to') THEN
        ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_assigned_to_fkey;
        ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_assigned_to_fkey 
            FOREIGN KEY (assigned_to) REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;


-- Suggestions: Add assigned_to FK
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suggestions' AND column_name = 'assigned_to') THEN
        ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_assigned_to_fkey;
        ALTER TABLE suggestions ADD CONSTRAINT suggestions_assigned_to_fkey 
            FOREIGN KEY (assigned_to) REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Suggestion / Leave Request standard User FK names (just in case)
-- (These were addressed in previous migration, but good to ensure)

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
