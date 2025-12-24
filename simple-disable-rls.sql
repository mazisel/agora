-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- !! UYARI: BU DOSYA SADECE DEVELOPMENT ORTAMINDA KULLANILMALIDIR !!
-- !! WARNING: DEV ONLY - NEVER RUN IN PRODUCTION !!
-- !! Bu dosya production'da çalıştırılırsa TÜM VERİLER HERKESE AÇIK olur !!
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

-- Basit RLS devre dışı bırakma
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE advance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions DISABLE ROW LEVEL SECURITY;
