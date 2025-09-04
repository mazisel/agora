-- Araç havuzu tablosu
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50),
    fuel_type VARCHAR(20) DEFAULT 'benzin', -- 'benzin', 'dizel', 'elektrik', 'hibrit'
    capacity INTEGER DEFAULT 5,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Araç talep tablosu
CREATE TABLE IF NOT EXISTS vehicle_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    request_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    destination VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    passenger_count INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed', 'cancelled'
    admin_notes TEXT,
    reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Araç rezervasyon tablosu (onaylanmış talepler için)
CREATE TABLE IF NOT EXISTS vehicle_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES vehicle_requests(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    destination VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_reservations ENABLE ROW LEVEL SECURITY;

-- Araçlar için politikalar
CREATE POLICY "Herkes araçları okuyabilir" ON vehicles
    FOR SELECT USING (true);

CREATE POLICY "Sadece adminler araçları yönetebilir" ON vehicles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Araç talepleri için politikalar
CREATE POLICY "Kullanıcılar kendi taleplerini görebilir" ON vehicle_requests
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Kullanıcılar talep oluşturabilir" ON vehicle_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi taleplerini güncelleyebilir" ON vehicle_requests
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Adminler talepleri silebilir" ON vehicle_requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Rezervasyonlar için politikalar
CREATE POLICY "Kullanıcılar kendi rezervasyonlarını görebilir" ON vehicle_reservations
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Sadece adminler rezervasyon oluşturabilir" ON vehicle_reservations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

CREATE POLICY "Adminler rezervasyonları yönetebilir" ON vehicle_reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Trigger fonksiyonları
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_requests_updated_at BEFORE UPDATE ON vehicle_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_reservations_updated_at BEFORE UPDATE ON vehicle_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_user_id ON vehicle_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_vehicle_id ON vehicle_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status ON vehicle_requests(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_request_date ON vehicle_requests(request_date);

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_user_id ON vehicle_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_vehicle_id ON vehicle_reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_reservation_date ON vehicle_reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_status ON vehicle_reservations(status);

-- Çakışma kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehicle_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_request_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Aynı araç için aynı tarih ve saatte çakışan rezervasyon var mı kontrol et
    RETURN NOT EXISTS (
        SELECT 1 FROM vehicle_reservations vr
        WHERE vr.vehicle_id = p_vehicle_id
        AND vr.reservation_date = p_date
        AND vr.status = 'active'
        AND (
            (p_start_time >= vr.start_time AND p_start_time < vr.end_time) OR
            (p_end_time > vr.start_time AND p_end_time <= vr.end_time) OR
            (p_start_time <= vr.start_time AND p_end_time >= vr.end_time)
        )
        AND (p_exclude_request_id IS NULL OR vr.request_id != p_exclude_request_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Araç talep modülünü modules tablosuna ekle
INSERT INTO modules (name, description, icon, is_active, settings) VALUES
('vehicle-requests', 'Araç Talep ve Rezervasyon', 'Car', true, '{"features": ["request", "reservation", "tracking"]}')
ON CONFLICT (name) DO NOTHING;

-- Örnek araç verileri
INSERT INTO vehicles (plate_number, brand, model, year, color, fuel_type, capacity) VALUES
('34 ABC 123', 'Toyota', 'Corolla', 2022, 'Beyaz', 'benzin', 5),
('34 DEF 456', 'Ford', 'Transit', 2021, 'Gri', 'dizel', 12),
('34 GHI 789', 'Volkswagen', 'Passat', 2023, 'Siyah', 'dizel', 5),
('34 JKL 012', 'Renault', 'Clio', 2020, 'Kırmızı', 'benzin', 5)
ON CONFLICT (plate_number) DO NOTHING;
