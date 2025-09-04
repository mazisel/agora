-- Avans talepleri tablosuna assigned_to alanı ekle
ALTER TABLE advance_requests 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Öneri/şikayet tablosuna assigned_to alanı ekle  
ALTER TABLE suggestions 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- İzin talepleri tablosuna assigned_to alanı ekle (manager_id ile aynı olacak)
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_advance_requests_assigned_to ON advance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_suggestions_assigned_to ON suggestions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leave_requests_assigned_to ON leave_requests(assigned_to);

-- Mevcut avans taleplerini "Avans Talebi" kategorisindeki destek kişilerine ata
DO $$
DECLARE
    advance_category_id UUID;
    agent_ids UUID[];
    request_record RECORD;
    random_agent UUID;
BEGIN
    -- Avans kategorisini bul
    SELECT id INTO advance_category_id 
    FROM support_categories 
    WHERE name = 'Avans Talebi' AND is_system = true;
    
    IF advance_category_id IS NOT NULL THEN
        -- Bu kategorideki destek kişilerini al
        SELECT ARRAY(SELECT user_id FROM support_agents WHERE category_id = advance_category_id) INTO agent_ids;
        
        IF array_length(agent_ids, 1) > 0 THEN
            -- Atanmamış avans taleplerini güncelle
            FOR request_record IN 
                SELECT id FROM advance_requests WHERE assigned_to IS NULL
            LOOP
                -- Rastgele bir destek kişisi seç
                random_agent := agent_ids[1 + (random() * (array_length(agent_ids, 1) - 1))::int];
                
                -- Atama yap
                UPDATE advance_requests 
                SET assigned_to = random_agent 
                WHERE id = request_record.id;
            END LOOP;
        END IF;
    END IF;
END $$;

-- Mevcut izin taleplerinin assigned_to alanını manager_id ile eşitle
UPDATE leave_requests 
SET assigned_to = (
    SELECT manager_id 
    FROM user_profiles 
    WHERE user_profiles.id = leave_requests.user_id
)
WHERE assigned_to IS NULL 
AND EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_profiles.id = leave_requests.user_id 
    AND user_profiles.manager_id IS NOT NULL
);

-- Mevcut öneri/şikayetleri "Öneri / Şikayet" kategorisindeki destek kişilerine ata
DO $$
DECLARE
    suggestion_category_id UUID;
    agent_ids UUID[];
    suggestion_record RECORD;
    random_agent UUID;
BEGIN
    -- Öneri/Şikayet kategorisini bul
    SELECT id INTO suggestion_category_id 
    FROM support_categories 
    WHERE name = 'Öneri / Şikayet' AND is_system = true;
    
    IF suggestion_category_id IS NOT NULL THEN
        -- Bu kategorideki destek kişilerini al
        SELECT ARRAY(SELECT user_id FROM support_agents WHERE category_id = suggestion_category_id) INTO agent_ids;
        
        IF array_length(agent_ids, 1) > 0 THEN
            -- Atanmamış öneri/şikayetleri güncelle
            FOR suggestion_record IN 
                SELECT id FROM suggestions WHERE assigned_to IS NULL
            LOOP
                -- Rastgele bir destek kişisi seç
                random_agent := agent_ids[1 + (random() * (array_length(agent_ids, 1) - 1))::int];
                
                -- Atama yap
                UPDATE suggestions 
                SET assigned_to = random_agent 
                WHERE id = suggestion_record.id;
            END LOOP;
        END IF;
    END IF;
END $$;
