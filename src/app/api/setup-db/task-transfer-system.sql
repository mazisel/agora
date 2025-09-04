-- Görev Yönlendirme Sistemi için Veritabanı Tabloları

-- Görev yönlendirme talepleri tablosu
CREATE TABLE IF NOT EXISTS task_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('reassign', 'delegate', 'escalate')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    requested_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Görev yönlendirme geçmişi tablosu
CREATE TABLE IF NOT EXISTS task_transfer_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('reassign', 'delegate', 'escalate')),
    transferred_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_task_transfers_task_id ON task_transfers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_transfers_from_user_id ON task_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_task_transfers_to_user_id ON task_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_transfers_status ON task_transfers(status);
CREATE INDEX IF NOT EXISTS idx_task_transfers_created_at ON task_transfers(created_at);

CREATE INDEX IF NOT EXISTS idx_task_transfer_history_task_id ON task_transfer_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_transfer_history_from_user_id ON task_transfer_history(from_user_id);
CREATE INDEX IF NOT EXISTS idx_task_transfer_history_to_user_id ON task_transfer_history(to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_transfer_history_transferred_at ON task_transfer_history(transferred_at);

-- Trigger fonksiyonu: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_task_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: task_transfers tablosu için updated_at güncelleme
DROP TRIGGER IF EXISTS trigger_update_task_transfers_updated_at ON task_transfers;
CREATE TRIGGER trigger_update_task_transfers_updated_at
    BEFORE UPDATE ON task_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_task_transfers_updated_at();

-- RLS (Row Level Security) politikaları
ALTER TABLE task_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_transfer_history ENABLE ROW LEVEL SECURITY;

-- task_transfers için RLS politikaları
CREATE POLICY "Users can view task transfers they are involved in" ON task_transfers
    FOR SELECT USING (
        auth.uid()::text IN (from_user_id, to_user_id, requested_by) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid()::text 
            AND authority_level IN ('manager', 'director', 'admin')
        )
    );

CREATE POLICY "Users can create task transfer requests" ON task_transfers
    FOR INSERT WITH CHECK (
        auth.uid()::text = requested_by AND
        (
            auth.uid()::text = from_user_id OR
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid()::text 
                AND authority_level IN ('team_lead', 'manager', 'director', 'admin')
            )
        )
    );

CREATE POLICY "Users can update task transfer requests" ON task_transfers
    FOR UPDATE USING (
        auth.uid()::text IN (to_user_id, approved_by) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid()::text 
            AND authority_level IN ('manager', 'director', 'admin')
        )
    );

-- task_transfer_history için RLS politikaları
CREATE POLICY "Users can view task transfer history they are involved in" ON task_transfer_history
    FOR SELECT USING (
        auth.uid()::text IN (from_user_id, to_user_id, transferred_by) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid()::text 
            AND authority_level IN ('manager', 'director', 'admin')
        )
    );

CREATE POLICY "System can insert task transfer history" ON task_transfer_history
    FOR INSERT WITH CHECK (true);

-- Yardımcı fonksiyonlar

-- Görev yönlendirme talebi oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_task_transfer_request(
    p_task_id UUID,
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_reason TEXT,
    p_transfer_type VARCHAR(20),
    p_requested_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
BEGIN
    -- Yeni yönlendirme talebi oluştur
    INSERT INTO task_transfers (
        task_id, from_user_id, to_user_id, reason, 
        transfer_type, requested_by
    ) VALUES (
        p_task_id, p_from_user_id, p_to_user_id, p_reason,
        p_transfer_type, p_requested_by
    ) RETURNING id INTO v_transfer_id;
    
    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Görev yönlendirme talebini onaylama fonksiyonu
CREATE OR REPLACE FUNCTION approve_task_transfer(
    p_transfer_id UUID,
    p_approved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_transfer RECORD;
BEGIN
    -- Transfer talebini al
    SELECT * INTO v_transfer 
    FROM task_transfers 
    WHERE id = p_transfer_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Transfer talebini onayla
    UPDATE task_transfers 
    SET status = 'accepted', 
        approved_by = p_approved_by, 
        approved_at = NOW()
    WHERE id = p_transfer_id;
    
    -- Görevi yeni kişiye ata
    UPDATE tasks 
    SET assigned_to = v_transfer.to_user_id,
        updated_at = NOW()
    WHERE id = v_transfer.task_id;
    
    -- Transfer geçmişine ekle
    INSERT INTO task_transfer_history (
        task_id, from_user_id, to_user_id, reason,
        transfer_type, transferred_by
    ) VALUES (
        v_transfer.task_id, v_transfer.from_user_id, v_transfer.to_user_id,
        v_transfer.reason, v_transfer.transfer_type, p_approved_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Görev yönlendirme talebini reddetme fonksiyonu
CREATE OR REPLACE FUNCTION reject_task_transfer(
    p_transfer_id UUID,
    p_approved_by UUID,
    p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE task_transfers 
    SET status = 'rejected', 
        approved_by = p_approved_by, 
        approved_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE id = p_transfer_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
