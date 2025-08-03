import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID gerekli' },
        { status: 400 }
      );
    }

    // Belgeleri al
    const { data: documents, error } = await supabase
      .from('finance_documents')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Belgeler alınırken hata oluştu' },
        { status: 500 }
      );
    }

    // Her belge için public URL ekle
    const documentsWithUrls = documents.map(doc => {
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(doc.file_path);
      
      return {
        ...doc,
        public_url: urlData.publicUrl
      };
    });

    return NextResponse.json({
      success: true,
      documents: documentsWithUrls
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Belgeler alınırken beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}
