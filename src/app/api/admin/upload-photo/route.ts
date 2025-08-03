import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key ile admin client oluştur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    
    if (!file || !fileName) {
      return NextResponse.json(
        { error: 'Dosya ve dosya adı gerekli' },
        { status: 400 }
      );
    }

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Dosya boyutu 5MB\'dan büyük olamaz' },
        { status: 400 }
      );
    }

    // Dosya türü kontrolü
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Desteklenmeyen dosya türü' },
        { status: 400 }
      );
    }

    // Bucket kontrolü ve oluşturma
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const profilePhotosBucket = buckets?.find(bucket => bucket.name === 'profile-photos');
    
    if (!profilePhotosBucket) {
      const { error: bucketError } = await supabaseAdmin.storage.createBucket('profile-photos', {
        public: true,
        allowedMimeTypes: allowedTypes,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (bucketError) {
        console.error('Bucket creation error:', bucketError);
        return NextResponse.json(
          { error: 'Storage bucket oluşturulamadı: ' + bucketError.message },
          { status: 500 }
        );
      }
    }

    // Eski dosyayı sil (varsa)
    await supabaseAdmin.storage
      .from('profile-photos')
      .remove([fileName]);

    // Dosyayı yükle
    const { error: uploadError, data } = await supabaseAdmin.storage
      .from('profile-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Dosya yüklenirken hata oluştu: ' + uploadError.message },
        { status: 500 }
      );
    }

    // Public URL al
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      publicUrl: publicUrl,
      data: data
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Beklenmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}
