-- Add status column to task_transfers
ALTER TABLE task_transfers 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add resolved_at column to support_tickets
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
