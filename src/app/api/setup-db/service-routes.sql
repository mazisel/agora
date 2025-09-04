-- Servis güzergahları ve saatleri tablosu
CREATE TABLE IF NOT EXISTS service_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    description TEXT,
    departure_time TIME NOT NULL,
    arrival_time TIME,
    departure_location VARCHAR(255) NOT NULL,
    arrival_location VARCHAR(255) NOT NULL,
    stops JSONB DEFAULT '[]'::jsonb, -- Ara duraklar
    capacity INTEGER DEFAULT 50,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    vehicle_plate VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    days_of_week JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb, -- Çalışma günleri
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS politikaları
ALTER TABLE service_routes ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (aktif olanları)
CREATE POLICY "Anyone can view active service routes" ON service_routes
    FOR SELECT USING (is_active = true);

-- Sadece admin ve modül sorumluları ekleyebilir/güncelleyebilir
CREATE POLICY "Admins and module managers can manage service routes" ON service_routes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND (
                user_profiles.authority_level IN ('admin', 'manager', 'director')
                OR user_profiles.id IN (
                    SELECT assigned_to FROM modules 
                    WHERE name = 'Servis Saat ve Güzergah' AND is_active = true
                )
            )
        )
    );

-- Güncelleme zamanını otomatik ayarla
CREATE OR REPLACE FUNCTION update_service_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_routes_updated_at
    BEFORE UPDATE ON service_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_service_routes_updated_at();

-- Örnek veri ekle
INSERT INTO service_routes (
    route_name, 
    description, 
    departure_time, 
    arrival_time,
    departure_location, 
    arrival_location,
    stops,
    capacity,
    driver_name,
    driver_phone,
    vehicle_plate,
    days_of_week,
    notes
) VALUES 
(
    'Merkez - Fabrika',
    'Ana merkez ofisten fabrikaya servis',
    '08:00:00',
    '08:30:00',
    'Merkez Ofis',
    'Fabrika',
    '[{"name": "Metro İstasyonu", "time": "08:10"}, {"name": "Alışveriş Merkezi", "time": "08:20"}]'::jsonb,
    45,
    'Ahmet Yılmaz',
    '+90 555 123 4567',
    '34 ABC 123',
    '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
    'Sabah vardiyası için ana servis'
),
(
    'Fabrika - Merkez',
    'Fabrikadan ana merkez ofise dönüş servisi',
    '17:30:00',
    '18:00:00',
    'Fabrika',
    'Merkez Ofis',
    '[{"name": "Alışveriş Merkezi", "time": "17:40"}, {"name": "Metro İstasyonu", "time": "17:50"}]'::jsonb,
    45,
    'Ahmet Yılmaz',
    '+90 555 123 4567',
    '34 ABC 123',
    '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
    'Akşam vardiyası için dönüş servisi'
),
(
    'Şehir Merkezi Turu',
    'Şehir merkezindeki ofisleri dolaşan servis',
    '09:00:00',
    '10:00:00',
    'Ana Ofis',
    'Ana Ofis',
    '[{"name": "1. Şube", "time": "09:15"}, {"name": "2. Şube", "time": "09:30"}, {"name": "3. Şube", "time": "09:45"}]'::jsonb,
    30,
    'Mehmet Demir',
    '+90 555 987 6543',
    '34 XYZ 789',
    '["monday","wednesday","friday"]'::jsonb,
    'Şube ziyaretleri için özel servis'
);
