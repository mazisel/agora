import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client for admin operations
const serviceSupabase = createClient(
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
    const { requestId, action, adminNotes } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID ve action gereklidir' },
        { status: 400 }
      );
    }

    // Get the request details
    const { data: profileRequest, error: requestError } = await serviceSupabase
      .from('profile_update_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !profileRequest) {
      return NextResponse.json(
        { error: 'Talep bulunamadı' },
        { status: 404 }
      );
    }

    // Get current user for approved_by field
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { createClient: createAuthClient } = await import('@supabase/supabase-js');
    const authSupabase = createAuthClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await authSupabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      );
    }

    // Update request status
    const { error: updateError } = await serviceSupabase
      .from('profile_update_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: adminNotes || '',
        approved_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Talep güncellenirken hata oluştu: ' + updateError.message },
        { status: 500 }
      );
    }

    // If approved, update the user profile
    if (action === 'approve') {
      let updateData: any = {};

      if (profileRequest.request_type === 'emergency_contact') {
        // Parse JSON data for emergency contact
        try {
          const emergencyData = JSON.parse(profileRequest.requested_value);
          updateData = {
            emergency_contact_name: emergencyData.name,
            emergency_contact_phone: emergencyData.phone
          };
        } catch (error) {
          return NextResponse.json(
            { error: 'Acil durum iletişim verileri işlenirken hata oluştu' },
            { status: 400 }
          );
        }
      } else {
        updateData = {
          [profileRequest.request_type]: profileRequest.requested_value
        };
      }

      console.log('Updating user profile with data:', updateData);
      console.log('User ID:', profileRequest.user_id);

      const { error: profileError } = await serviceSupabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', profileRequest.user_id);

      if (profileError) {
        console.log('Profile update error:', profileError);
        return NextResponse.json(
          { error: 'Profil güncellenirken hata oluştu: ' + profileError.message },
          { status: 500 }
        );
      }

      console.log('Profile updated successfully');
    }

    return NextResponse.json({
      message: action === 'approve' ? 'Talep onaylandı ve profil güncellendi!' : 'Talep reddedildi!',
      success: true
    });

  } catch (error) {
    console.error('Approve profile request error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
