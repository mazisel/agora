-- Toplantı odaları tablosu
CREATE TABLE IF NOT EXISTS meeting_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    capacity INTEGER NOT NULL,
    description TEXT,
    equipment TEXT[], -- ['projektor', 'beyaz_tahta', 'video_konferans', 'ses_sistemi']
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Toplantı odası rezervasyon talepleri tablosu
CREATE TABLE IF NOT EXISTS meeting_room_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES meeting_rooms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    participant_count INTEGER DEFAULT 1,
    equipment_needed TEXT[],
    catering_needed BOOLEAN DEFAULT false,
    catering_details TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed', 'cancelled'
    admin_notes TEXT,
    reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Toplantı odası rezervasyonları tablosu (onaylanmış talepler için)
CREATE TABLE IF NOT EXISTS meeting_room_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES meeting_room_requests(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    participant_count INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    setup_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE meeting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_room_reservations ENABLE ROW LEVEL SECURITY;

-- Toplantı odaları için politikalar
CREATE POLICY "Herkes toplantı odalarını okuyabilir" ON meeting_rooms
    FOR SELECT USING (true);

CREATE POLICY "Sadece adminler toplantı odalarını yönetebilir" ON meeting_rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Toplantı odası talepleri için politikalar
CREATE POLICY "Kullanıcılar kendi taleplerini görebilir" ON meeting_room_requests
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Kullanıcılar talep oluşturabilir" ON meeting_room_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi taleplerini güncelleyebilir" ON meeting_room_requests
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Adminler talepleri silebilir" ON meeting_room_requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Rezervasyonlar için politikalar
CREATE POLICY "Kullanıcılar kendi rezervasyonlarını görebilir" ON meeting_room_reservations
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Sadece adminler rezervasyon oluşturabilir" ON meeting_room_reservations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Adminler rezervasyonları yönetebilir" ON meeting_room_reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Trigger fonksiyonları
CREATE TRIGGER update_meeting_rooms_updated_at BEFORE UPDATE ON meeting_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_room_requests_updated_at BEFORE UPDATE ON meeting_room_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_room_reservations_updated_at BEFORE UPDATE ON meeting_room_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_is_available ON meeting_rooms(is_available);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_is_active ON meeting_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_capacity ON meeting_rooms(capacity);

CREATE INDEX IF NOT EXISTS idx_meeting_room_requests_user_id ON meeting_room_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_room_requests_room_id ON meeting_room_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_room_requests_status ON meeting_room_requests(status);
CREATE INDEX IF NOT EXISTS idx_meeting_room_requests_meeting_date ON meeting_room_requests(meeting_date);

CREATE INDEX IF NOT EXISTS idx_meeting_room_reservations_user_id ON meeting_room_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_room_reservations_room_id ON meeting_room_reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_room_reservations_meeting_date ON meeting_room_reservations(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_room_reservations_status ON meeting_room_reservations(status);

-- Çakışma kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION check_meeting_room_availability(
    p_room_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_request_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Aynı oda için aynı tarih ve saatte çakışan rezervasyon var mı kontrol et
    RETURN NOT EXISTS (
        SELECT 1 FROM meeting_room_reservations mrr
        WHERE mrr.room_id = p_room_id
        AND mrr.meeting_date = p_date
        AND mrr.status = 'active'
        AND (
            (p_start_time >= mrr.start_time AND p_start_time < mrr.end_time) OR
            (p_end_time > mrr.start_time AND p_end_time <= mrr.end_time) OR
            (p_start_time <= mrr.start_time AND p_end_time >= mrr.end_time)
        )
        AND (p_exclude_request_id IS NULL OR mrr.request_id != p_exclude_request_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Toplantı odası rezervasyon modülünü modules tablosuna ekle
INSERT INTO modules (name, description, icon, is_active, settings) VALUES
('Toplantı Odası Rezervasyon', 'Toplantı odalarını rezerve edin ve yönetin', 'Users', true, '{"features": ["reservation", "calendar", "equipment"]}')
ON CONFLICT (name) DO NOTHING;

-- Örnek toplantı odası verileri
INSERT INTO meeting_rooms (name, location, capacity, description, equipment, hourly_rate) VALUES
('Büyük Toplantı Salonu', '1. Kat', 20, 'Geniş toplantı salonu, sunum ve konferanslar için ideal', ARRAY['projektor', 'beyaz_tahta', 'video_konferans', 'ses_sistemi'], 50.00),
('Küçük Toplantı Odası A', '2. Kat', 8, 'Küçük grup toplantıları için uygun', ARRAY['beyaz_tahta', 'video_konferans'], 25.00),
('Küçük Toplantı Odası B', '2. Kat', 6, 'Birebir görüşmeler ve küçük toplantılar için', ARRAY['beyaz_tahta'], 20.00),
('Yönetim Kurulu Salonu', '3. Kat', 12, 'Yönetim kurulu toplantıları için özel salon', ARRAY['projektor', 'beyaz_tahta', 'video_konferans', 'ses_sistemi'], 75.00),
('Eğitim Salonu', 'Zemin Kat', 30, 'Eğitim ve seminerler için geniş salon', ARRAY['projektor', 'beyaz_tahta', 'ses_sistemi'], 60.00)
ON CONFLICT DO NOTHING;
