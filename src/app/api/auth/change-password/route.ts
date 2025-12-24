import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for password updates
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
    console.log('🔄 Password change request received');

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Mevcut şifre ve yeni şifre gereklidir' },
        { status: 400 }
      );
    }

    // Güçlü şifre politikası kontrolü
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Yeni şifre en az 8 karakter olmalıdır' },
        { status: 400 }
      );
    }

    // Büyük harf kontrolü
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Yeni şifre en az bir büyük harf içermelidir' },
        { status: 400 }
      );
    }

    // Küçük harf kontrolü
    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Yeni şifre en az bir küçük harf içermelidir' },
        { status: 400 }
      );
    }

    // Rakam kontrolü
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Yeni şifre en az bir rakam içermelidir' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Get current user from token using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı veya token geçersiz' },
        { status: 401 }
      );
    }

    // Create a separate client instance for password verification
    const verificationClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify current password by attempting to sign in with a separate client
    const { error: signInError } = await verificationClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Mevcut şifre yanlış' },
        { status: 400 }
      );
    }

    // Update password using the admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json(
        { error: 'Şifre güncellenirken hata oluştu: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Şifre başarıyla güncellendi' },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
}
