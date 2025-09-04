-- Talep Atama Sistemi için Tablolar

-- Avans Talepleri için Atama Tablosu
CREATE TABLE IF NOT EXISTS advance_request_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_request_id UUID NOT NULL REFERENCES advance_requests(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(advance_request_id, assigned_to) -- Aynı talep aynı kişiye birden fazla kez atanamaz
);

-- Öneri/Şikayet Talepleri için Atama Tablosu
CREATE TABLE IF NOT EXISTS suggestion_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(suggestion_id, assigned_to) -- Aynı talep aynı kişiye birden fazla kez atanamaz
);

-- İzin Talepleri için Atama Tablosu (gelecekte kullanılabilir)
CREATE TABLE IF NOT EXISTS leave_request_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leave_request_id, assigned_to) -- Aynı talep aynı kişiye birden fazla kez atanamaz
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_advance_request_assignments_request_id ON advance_request_assignments(advance_request_id);
CREATE INDEX IF NOT EXISTS idx_advance_request_assignments_assigned_to ON advance_request_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_advance_request_assignments_assigned_by ON advance_request_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_suggestion_assignments_suggestion_id ON suggestion_assignments(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_assignments_assigned_to ON suggestion_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_suggestion_assignments_assigned_by ON suggestion_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_leave_request_assignments_request_id ON leave_request_assignments(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_request_assignments_assigned_to ON leave_request_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leave_request_assignments_assigned_by ON leave_request_assignments(assigned_by);

-- RLS Politikaları

-- Avans Talep Atamaları için RLS
ALTER TABLE advance_request_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage advance request assignments" ON advance_request_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.authority_level = 'admin'
        )
    );

CREATE POLICY "Assigned users can view their advance request assignments" ON advance_request_assignments
    FOR SELECT USING (auth.uid() = assigned_to);

-- Öneri/Şikayet Atamaları için RLS
ALTER TABLE suggestion_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suggestion assignments" ON suggestion_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.authority_level = 'admin'
        )
    );

CREATE POLICY "Assigned users can view their suggestion assignments" ON suggestion_assignments
    FOR SELECT USING (auth.uid() = assigned_to);

-- İzin Talep Atamaları için RLS
ALTER TABLE leave_request_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leave request assignments" ON leave_request_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.authority_level = 'admin'
        )
    );

CREATE POLICY "Assigned users can view their leave request assignments" ON leave_request_assignments
    FOR SELECT USING (auth.uid() = assigned_to);

-- Mevcut RLS politikalarını güncelle

-- Avans talepleri için atanmış kişilerin görüntüleyebilmesi
DROP POLICY IF EXISTS "Assigned users can view advance requests" ON advance_requests;
CREATE POLICY "Assigned users can view advance requests" ON advance_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM advance_request_assignments ara
            WHERE ara.advance_request_id = advance_requests.id
            AND ara.assigned_to = auth.uid()
        )
    );

-- Avans talepleri için atanmış kişilerin güncelleyebilmesi
DROP POLICY IF EXISTS "Assigned users can update advance requests" ON advance_requests;
CREATE POLICY "Assigned users can update advance requests" ON advance_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM advance_request_assignments ara
            WHERE ara.advance_request_id = advance_requests.id
            AND ara.assigned_to = auth.uid()
        )
    );

-- Öneri/Şikayetler için atanmış kişilerin görüntüleyebilmesi
DROP POLICY IF EXISTS "Assigned users can view suggestions" ON suggestions;
CREATE POLICY "Assigned users can view suggestions" ON suggestions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM suggestion_assignments sa
            WHERE sa.suggestion_id = suggestions.id
            AND sa.assigned_to = auth.uid()
        )
    );

-- Öneri/Şikayetler için atanmış kişilerin güncelleyebilmesi
DROP POLICY IF EXISTS "Assigned users can update suggestions" ON suggestions;
CREATE POLICY "Assigned users can update suggestions" ON suggestions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM suggestion_assignments sa
            WHERE sa.suggestion_id = suggestions.id
            AND sa.assigned_to = auth.uid()
        )
    );
