-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- !! UYARI: BU DOSYA SADECE DEVELOPMENT ORTAMINDA KULLANILMALIDIR !!
-- !! WARNING: DEV ONLY - NEVER RUN IN PRODUCTION !!
-- !! Bu dosya production'da çalıştırılırsa TÜM VERİLER HERKESE AÇIK olur !!
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

-- RLS'i geçici olarak devre dışı bırak
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE advance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions DISABLE ROW LEVEL SECURITY;

-- Veya alternatif olarak, herkese erişim izni ver
DROP POLICY IF EXISTS "Users can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can create their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Team leaders can view team leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Team leaders can update leave requests" ON leave_requests;

DROP POLICY IF EXISTS "Users can view their own advance requests" ON advance_requests;
DROP POLICY IF EXISTS "Users can create their own advance requests" ON advance_requests;
DROP POLICY IF EXISTS "Admins can view all advance requests" ON advance_requests;
DROP POLICY IF EXISTS "Admins can update advance requests" ON advance_requests;

DROP POLICY IF EXISTS "Users can view their own suggestions" ON suggestions;
DROP POLICY IF EXISTS "Users can create suggestions" ON suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON suggestions;
DROP POLICY IF EXISTS "Admins can update suggestions" ON suggestions;

-- Basit politikalar ekle
CREATE POLICY "Enable all for authenticated users" ON leave_requests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON advance_requests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON suggestions
    FOR ALL USING (auth.role() = 'authenticated');
