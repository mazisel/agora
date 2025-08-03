-- Finans belgeleri tablosu
CREATE TABLE IF NOT EXISTS finance_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES finance_transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finans işlemleri tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    employee_id UUID REFERENCES user_profiles(id),
    employee_name TEXT,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'check')),
    reference_number TEXT,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supabase Storage bucket oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy'leri
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- RLS politikaları
ALTER TABLE finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- Finans belgeleri için RLS politikaları
CREATE POLICY "Users can view finance documents" ON finance_documents
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert finance documents" ON finance_documents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update finance documents" ON finance_documents
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete finance documents" ON finance_documents
FOR DELETE USING (auth.role() = 'authenticated');

-- Finans işlemleri için RLS politikaları
CREATE POLICY "Users can view finance transactions" ON finance_transactions
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert finance transactions" ON finance_transactions
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update finance transactions" ON finance_transactions
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete finance transactions" ON finance_transactions
FOR DELETE USING (auth.role() = 'authenticated');

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_finance_documents_transaction_id ON finance_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_finance_documents_uploaded_at ON finance_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_created_by ON finance_transactions(created_by);

-- Trigger fonksiyonu updated_at için
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'lar
CREATE TRIGGER update_finance_documents_updated_at BEFORE UPDATE ON finance_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_transactions_updated_at BEFORE UPDATE ON finance_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
