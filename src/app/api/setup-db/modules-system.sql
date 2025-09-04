-- Modüller tablosu
CREATE TABLE IF NOT EXISTS modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'Puzzle',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Günlük menü tablosu
CREATE TABLE IF NOT EXISTS daily_menu (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    soup VARCHAR(255),
    main_course VARCHAR(255) NOT NULL,
    side_dish VARCHAR(255),
    extra VARCHAR(255),
    extra_type VARCHAR(50) DEFAULT 'dessert', -- 'dessert', 'salad', 'drink'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_menu ENABLE ROW LEVEL SECURITY;

-- Modüller için politikalar
CREATE POLICY "Herkes modülleri okuyabilir" ON modules
    FOR SELECT USING (true);

CREATE POLICY "Sadece adminler modülleri yönetebilir" ON modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Günlük menü için politikalar
CREATE POLICY "Herkes menüyü okuyabilir" ON daily_menu
    FOR SELECT USING (true);

CREATE POLICY "Sadece adminler menüyü yönetebilir" ON daily_menu
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND authority_level = 'admin'
        )
    );

-- Trigger fonksiyonu updated_at için
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları ekle
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_menu_updated_at BEFORE UPDATE ON daily_menu
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_modules_is_active ON modules(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_menu_date ON daily_menu(date);
CREATE INDEX IF NOT EXISTS idx_daily_menu_created_at ON daily_menu(created_at);
