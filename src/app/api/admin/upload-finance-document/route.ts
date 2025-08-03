import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transactionId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Dosya boyutu 10MB\'dan büyük olamaz' },
        { status: 400 }
      );
    }

    // Dosya türü kontrolü
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Desteklenmeyen dosya türü. Sadece resim, PDF ve Office belgeleri yükleyebilirsiniz.' },
        { status: 400 }
      );
    }

    // Dosya adını oluştur
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `finance-documents/${fileName}`;

    // Dosyayı Supabase Storage'a yükle
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Dosya yüklenirken hata oluştu' },
        { status: 500 }
      );
    }

    // Dosya bilgilerini veritabanına kaydet
    const { data: documentData, error: dbError } = await supabase
      .from('finance_documents')
      .insert([{
        transaction_id: transactionId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Yüklenen dosyayı sil
      await supabase.storage.from('documents').remove([filePath]);
      return NextResponse.json(
        { error: 'Dosya bilgileri kaydedilirken hata oluştu' },
        { status: 500 }
      );
    }

    // Dosyanın public URL'ini al
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      document: {
        ...documentData,
        public_url: urlData.publicUrl
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Dosya yüklenirken beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Belge ID\'si gerekli' },
        { status: 400 }
      );
    }

    // Belge bilgilerini al
    const { data: document, error: fetchError } = await supabase
      .from('finance_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Belge bulunamadı' },
        { status: 404 }
      );
    }

    // Dosyayı storage'dan sil
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Veritabanından sil
    const { error: dbError } = await supabase
      .from('finance_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json(
        { error: 'Belge silinirken hata oluştu' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Belge silinirken beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}
