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

    if (newPassword.length < 6) {
      console.log('❌ New password too short');
      return NextResponse.json(
        { error: 'Yeni şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Verifying user token...');

    // Get current user from token using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ User verification failed:', userError);
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı veya token geçersiz' },
        { status: 401 }
      );
    }

    console.log('✅ User verified:', user.email);

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
    console.log('🔍 Verifying current password...');
    const { error: signInError } = await verificationClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      console.error('❌ Current password verification failed:', signInError.message);
      return NextResponse.json(
        { error: 'Mevcut şifre yanlış' },
        { status: 400 }
      );
    }

    console.log('✅ Current password verified');

    // Update password using the admin client
    console.log('🔄 Updating password...');
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Password update failed:', updateError);
      return NextResponse.json(
        { error: 'Şifre güncellenirken hata oluştu: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Password updated successfully');

    return NextResponse.json(
      { message: 'Şifre başarıyla güncellendi' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Password change error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
}
