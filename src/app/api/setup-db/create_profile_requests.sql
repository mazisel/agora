-- Create profile_update_requests table
CREATE TABLE IF NOT EXISTS profile_update_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  current_value TEXT,
  requested_value TEXT,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_update_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own requests"
  ON profile_update_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests"
  ON profile_update_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON profile_update_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND authority_level = 'admin'
    )
  );

CREATE POLICY "Admins can update requests"
  ON profile_update_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND authority_level = 'admin'
    )
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
