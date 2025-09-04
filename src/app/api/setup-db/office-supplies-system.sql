-- Office Supplies Request System Tables

-- Office supplies requests table
CREATE TABLE IF NOT EXISTS office_supplies_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL, -- Array of items with name, quantity, unit, description
    justification TEXT, -- Reason for the request
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent')),
    department VARCHAR(100),
    cost_center VARCHAR(50),
    estimated_cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ordered', 'delivered', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Office supplies categories table (for predefined items)
CREATE TABLE IF NOT EXISTS office_supplies_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Office supplies items table (predefined items)
CREATE TABLE IF NOT EXISTS office_supplies_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES office_supplies_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'adet', -- piece, box, pack, etc.
    estimated_unit_cost DECIMAL(10,2),
    supplier VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_office_supplies_requests_user_id ON office_supplies_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_office_supplies_requests_status ON office_supplies_requests(status);
CREATE INDEX IF NOT EXISTS idx_office_supplies_requests_request_date ON office_supplies_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_office_supplies_requests_approved_by ON office_supplies_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_office_supplies_items_category_id ON office_supplies_items(category_id);

-- RLS Policies
ALTER TABLE office_supplies_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_supplies_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_supplies_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own office supplies requests" ON office_supplies_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create office supplies requests" ON office_supplies_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests
CREATE POLICY "Users can update own pending office supplies requests" ON office_supplies_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Managers can view all requests
CREATE POLICY "Managers can view all office supplies requests" ON office_supplies_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.authority_level IN ('manager', 'director', 'admin')
        )
    );

-- Managers can update request status
CREATE POLICY "Managers can update office supplies requests" ON office_supplies_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.authority_level IN ('manager', 'director', 'admin')
        )
    );

-- Everyone can view active categories and items
CREATE POLICY "Everyone can view office supplies categories" ON office_supplies_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Everyone can view office supplies items" ON office_supplies_items
    FOR SELECT USING (is_active = true);

-- Only admins can manage categories and items
CREATE POLICY "Admins can manage office supplies categories" ON office_supplies_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.authority_level = 'admin'
        )
    );

CREATE POLICY "Admins can manage office supplies items" ON office_supplies_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.authority_level = 'admin'
        )
    );

-- Insert default categories
INSERT INTO office_supplies_categories (name, description) VALUES
('Kırtasiye', 'Kalem, kağıt, dosya vb. kırtasiye malzemeleri'),
('Teknoloji', 'Bilgisayar aksesuarları, kablolar, USB vb.'),
('Ofis Mobilyası', 'Masa, sandalye, dolap vb. mobilya'),
('Temizlik', 'Temizlik malzemeleri ve hijyen ürünleri'),
('Mutfak', 'Çay, kahve, su vb. mutfak malzemeleri'),
('Diğer', 'Diğer ofis malzemeleri')
ON CONFLICT DO NOTHING;

-- Insert default items
INSERT INTO office_supplies_items (category_id, name, description, unit, estimated_unit_cost) 
SELECT 
    c.id,
    item.name,
    item.description,
    item.unit,
    item.cost
FROM office_supplies_categories c
CROSS JOIN (
    VALUES 
    ('Kırtasiye', 'Tükenmez Kalem', 'Mavi/Siyah tükenmez kalem', 'adet', 2.50),
    ('Kırtasiye', 'A4 Kağıt', 'Beyaz A4 fotokopi kağıdı', 'paket', 25.00),
    ('Kırtasiye', 'Dosya', 'Plastik dosya', 'adet', 5.00),
    ('Kırtasiye', 'Post-it', 'Yapışkanlı not kağıdı', 'paket', 8.00),
    ('Teknoloji', 'USB Kablo', 'USB-C kablo', 'adet', 15.00),
    ('Teknoloji', 'Mouse Pad', 'Bilgisayar mouse pad', 'adet', 12.00),
    ('Teknoloji', 'USB Bellek', '16GB USB bellek', 'adet', 35.00),
    ('Mutfak', 'Çay', 'Demlik poşet çay', 'kutu', 20.00),
    ('Mutfak', 'Kahve', 'Hazır kahve', 'kutu', 45.00),
    ('Mutfak', 'Su', '19L damacana su', 'adet', 8.00),
    ('Temizlik', 'Kağıt Havlu', 'Kağıt havlu rulosu', 'paket', 15.00),
    ('Temizlik', 'Deterjan', 'Bulaşık deterjanı', 'şişe', 12.00)
) AS item(category, name, description, unit, cost)
WHERE c.name = item.category
ON CONFLICT DO NOTHING;
