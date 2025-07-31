import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key ile admin client oluştur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bu environment variable'ı eklemek gerekiyor
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
