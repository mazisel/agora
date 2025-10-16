import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, updateData } = await request.json();

    if (!userId || !updateData) {
      return NextResponse.json(
        { error: 'User ID ve güncelleme verisi gerekli' },
        { status: 400 }
      );
    }

    console.log('🔄 Admin API: Kullanıcı güncelleniyor:', userId);
    console.log('📝 Güncelleme verisi:', updateData);

    // Service role key ile güncelleme yap
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('❌ Supabase güncelleme hatası:', error);
      return NextResponse.json(
        { error: 'Kullanıcı güncellenirken hata oluştu: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ Kullanıcı başarıyla güncellendi:', data);

    return NextResponse.json({
      success: true,
      data: data[0],
      message: 'Kullanıcı başarıyla güncellendi'
    });

  } catch (error) {
    console.error('💥 API hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
