-- Create task_transfers table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES user_profiles(id),
    to_user_id UUID NOT NULL REFERENCES user_profiles(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix leave_requests FK to user_profiles
-- We use a DO block to safely handle constraint existence checking if needed, or just standard ALTER
DO $$
BEGIN
    -- Leave Requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        -- Drop old constraint if it exists (it might be named differently or non-existent)
        -- We won't rigorously check the name, just try to add the new one. 
        -- If user_id already references auth.users, that's fine. We need a reference to user_profiles.
        -- Check if constraint to user_profiles exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            WHERE tc.table_name = 'leave_requests' AND ccu.table_name = 'user_profiles'
        ) THEN
            ALTER TABLE leave_requests
            ADD CONSTRAINT leave_requests_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Advance Requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advance_requests') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            WHERE tc.table_name = 'advance_requests' AND ccu.table_name = 'user_profiles'
        ) THEN
            ALTER TABLE advance_requests
            ADD CONSTRAINT advance_requests_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Suggestions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suggestions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            WHERE tc.table_name = 'suggestions' AND ccu.table_name = 'user_profiles'
        ) THEN
            ALTER TABLE suggestions
            ADD CONSTRAINT suggestions_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Support Agents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_agents') THEN
        -- Check if it references users (invalid) and drop it
        ALTER TABLE support_agents DROP CONSTRAINT IF EXISTS support_agents_user_id_fkey;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            WHERE tc.table_name = 'support_agents' AND ccu.table_name = 'user_profiles'
        ) THEN
            ALTER TABLE support_agents
            ADD CONSTRAINT support_agents_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Support Tickets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
        ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
        ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_agent_id_fkey;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
            WHERE tc.table_name = 'support_tickets' AND ccu.table_name = 'user_profiles' AND ccu.column_name = 'id'
        ) THEN
            ALTER TABLE support_tickets
            ADD CONSTRAINT support_tickets_user_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
            
            ALTER TABLE support_tickets
            ADD CONSTRAINT support_tickets_assigned_agent_id_fkey 
            FOREIGN KEY (assigned_agent_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
