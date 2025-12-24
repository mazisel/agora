import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyPasswordReset } from '@/lib/notifications';
import { authenticateUser, isAdmin } from '@/lib/auth-helper';

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
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, newPassword } = body;

    // Kullanıcının şifresini güncelle (admin API ile)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return NextResponse.json(
        { error: 'Şifre güncellenirken hata oluştu: ' + error.message },
        { status: 400 }
      );
    }

    // Kullanıcı bilgilerini al ve şifre sıfırlama e-postası gönder
    if (data.user) {
      try {
        // Kullanıcı profilini al
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('id', userId)
          .single();

        if (!profileError && profile) {
          const userName = `${profile.first_name} ${profile.last_name}`;
          const userEmail = profile.email || data.user.email;

          if (userEmail) {
            await notifyPasswordReset(userEmail, userName, newPassword);
          }
        }
      } catch (emailError) {
        console.error('Password reset email could not be sent:', emailError);
        // E-posta gönderilememesi şifre sıfırlama işlemini durdurmaz
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla güncellendi'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
