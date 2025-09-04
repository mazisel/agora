-- Destek Kategorileri Tablosu
CREATE TABLE IF NOT EXISTS support_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_system BOOLEAN DEFAULT FALSE, -- Sistem kategorileri silinemez
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Destek Kişileri Tablosu
CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES support_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id) -- Bir kullanıcı aynı kategoride birden fazla kez olamaz
);

-- Destek Talepleri Tablosu (gelecekte kullanılmak üzere)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES support_categories(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Destek Talep Detayları Tablosu (gelecekte kullanılmak üzere)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Dahili notlar için
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_support_agents_user_id ON support_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agents_category_id ON support_agents(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category_id ON support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_agent_id ON support_tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);

-- Trigger fonksiyonu updated_at için
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS update_support_categories_updated_at ON support_categories;
CREATE TRIGGER update_support_categories_updated_at
    BEFORE UPDATE ON support_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_agents_updated_at ON support_agents;
CREATE TRIGGER update_support_agents_updated_at
    BEFORE UPDATE ON support_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sabit sistem kategorilerini ekle
INSERT INTO support_categories (name, description, is_system) VALUES 
('Avans Talebi', 'Avans talepleri için destek kategorisi', TRUE),
('Öneri / Şikayet', 'Öneri ve şikayet talepleri için destek kategorisi', TRUE)
ON CONFLICT DO NOTHING;

-- Örnek kategoriler ekle
INSERT INTO support_categories (name, description, is_system) VALUES 
('Teknik Destek', 'Yazılım ve donanım sorunları için teknik destek', FALSE),
('Hesap Yönetimi', 'Kullanıcı hesapları ve profil yönetimi', FALSE),
('Faturalandırma', 'Ödeme ve fatura ile ilgili sorular', FALSE),
('Genel Sorular', 'Diğer genel sorular ve bilgi talepleri', FALSE)
ON CONFLICT DO NOTHING;
