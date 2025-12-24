-- Add foreign key constraint for room_id in meeting_room_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'meeting_room_requests_room_id_fkey'
    ) THEN
        ALTER TABLE meeting_room_requests
        ADD CONSTRAINT meeting_room_requests_room_id_fkey
        FOREIGN KEY (room_id)
        REFERENCES meeting_rooms(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
