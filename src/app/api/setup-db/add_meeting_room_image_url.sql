-- Add image_url column to meeting_rooms table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meeting_rooms' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE meeting_rooms
        ADD COLUMN image_url text;
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
