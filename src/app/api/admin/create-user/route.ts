import { NextRequest, NextResponse } from 'next/server';
import { notifyUserWelcome } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName,
      profileData 
    } = body;

    // Kullanıcı oluştur (admin API ile)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulurken hata oluştu: ' + authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı.' },
        { status: 400 }
      );
    }

    // Profil tablosuna kaydet
    const { data: profileResult, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([{
        id: authData.user.id,
        ...profileData
      }])
      .select()
      .single();

    if (profileError) {
      // Kullanıcı oluşturuldu ama profil kaydedilemedi, kullanıcıyı sil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Profil oluşturulurken hata oluştu: ' + profileError.message },
        { status: 400 }
      );
    }

    // Hoş geldin e-postası gönder
    try {
      const userName = `${firstName} ${lastName}`;
      await notifyUserWelcome(email, userName, password);
    } catch (emailError) {
      console.error('Welcome email could not be sent:', emailError);
      // E-posta gönderilememesi kullanıcı oluşturma işlemini durdurmaz
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      profile: profileResult
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
