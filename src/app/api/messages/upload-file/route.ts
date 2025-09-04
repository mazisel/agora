import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Supabase client'ları
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Normal client (anon key ile)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (sadece gerekli durumlarda kullanılacak)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Kullanıcı kimlik doğrulaması - Authorization header'dan al
    const authHeader = request.headers.get('authorization');
    let authToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    } else {
      // Cookie'den almayı dene
      const cookieStore = await cookies();
      
      // Farklı cookie isimlerini dene
      const possibleCookieNames = [
        'sb-access-token',
        'sb-riacmnpxjsbrppzfjeur-auth-token',
        'supabase-auth-token',
        'supabase.auth.token'
      ];

      for (const cookieName of possibleCookieNames) {
        const cookie = cookieStore.get(cookieName);
        if (cookie?.value) {
          try {
            // JSON parse etmeyi dene (Supabase bazen JSON olarak saklar)
            const parsed = JSON.parse(cookie.value);
            if (parsed.access_token) {
              authToken = parsed.access_token;
              break;
            }
          } catch {
            // JSON değilse direkt kullan
            authToken = cookie.value;
            break;
          }
        }
      }
    }

    if (!authToken) {
      console.log('Auth token bulunamadı. Mevcut cookie\'ler:', 
        Array.from((await cookies()).getAll()).map(c => c.name));
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    // Kullanıcı bilgilerini doğrula
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    
    if (authError || !user) {
      console.log('Auth doğrulama hatası:', authError);
      return NextResponse.json(
        { error: 'Geçersiz yetkilendirme' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const messageId = formData.get('messageId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    if (!messageId) {
      return NextResponse.json(
        { error: 'Mesaj ID gerekli' },
        { status: 400 }
      );
    }

    // Mesajın bu kullanıcıya ait olup olmadığını kontrol et
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('user_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message || message.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Bu mesaja dosya ekleme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Dosya boyutu kontrolü (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Dosya boyutu 10MB\'dan büyük olamaz' },
        { status: 400 }
      );
    }

    // Dosya türü kontrolü
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Desteklenmeyen dosya türü' },
        { status: 400 }
      );
    }

    // Dosya adını temizle ve benzersiz yap
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${cleanFileName}`;
    const filePath = `message-attachments/${fileName}`;

    // Dosyayı Supabase Storage'a yükle
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Dosya yüklenirken hata oluştu' },
        { status: 500 }
      );
    }

    // Dosya URL'ini al
    const { data: urlData } = supabaseAdmin.storage
      .from('files')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Thumbnail URL'i oluştur (sadece resimler için - Supabase otomatik resize)
    let thumbnailUrl = null;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = fileUrl; // Aynı URL'i kullan, frontend'de resize yapacağız
    }

    // Veritabanına attachment kaydını ekle
    const { data: attachment, error: dbError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Veritabanı hatası varsa yüklenen dosyayı sil
      await supabaseAdmin.storage
        .from('files')
        .remove([filePath]);

      return NextResponse.json(
        { error: 'Veritabanı hatası' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attachment
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
