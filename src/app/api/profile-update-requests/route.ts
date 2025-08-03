import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get user's profile update requests
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      );
    }

    // Get user's profile update requests
    const { data: requests, error } = await supabase
      .from('profile_update_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Talepler alınırken hata oluştu' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests });

  } catch (error) {
    console.error('Profile update requests error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// Create new profile update request
export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { requestType, currentValue, requestedValue, requestedValue2, reason } = body;

    if (!requestType || !requestedValue) {
      console.log('Missing required fields:', { requestType, requestedValue });
      return NextResponse.json(
        { error: 'Talep türü ve yeni değer gereklidir' },
        { status: 400 }
      );
    }

    // Validate request type (only allow changeable fields)
    const allowedTypes = ['phone', 'address', 'emergency_contact'];
    if (!allowedTypes.includes(requestType)) {
      console.log('Invalid request type:', requestType);
      return NextResponse.json(
        { error: 'Bu alan için güncelleme talebi oluşturulamaz' },
        { status: 400 }
      );
    }

    // For emergency contact, both name and phone are required
    if (requestType === 'emergency_contact' && !requestedValue2) {
      console.log('Missing emergency contact phone');
      return NextResponse.json(
        { error: 'Acil durum iletişim bilgileri için hem ad hem telefon gereklidir' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid auth header');
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Getting user with token');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('User error:', userError);
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      );
    }

    console.log('User found:', user.id);

    // Check if there's already a pending request for this field
    console.log('Checking for existing request');
    const { data: existingRequest, error: checkError } = await supabase
      .from('profile_update_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', requestType)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.log('Check error:', checkError);
      return NextResponse.json(
        { error: 'Mevcut talepler kontrol edilirken hata oluştu: ' + checkError.message },
        { status: 500 }
      );
    }

    if (existingRequest) {
      console.log('Existing request found');
      return NextResponse.json(
        { error: 'Bu alan için zaten bekleyen bir talebiniz var' },
        { status: 400 }
      );
    }

    // Prepare the request data
    let requestData: any = {
      user_id: user.id,
      request_type: requestType,
      current_value: currentValue || '',
      requested_value: requestedValue,
      reason: reason || ''
    };

    // For emergency contact, combine both values
    if (requestType === 'emergency_contact') {
      requestData.requested_value = JSON.stringify({
        name: requestedValue,
        phone: requestedValue2
      });
      requestData.current_value = JSON.stringify({
        name: currentValue || '',
        phone: '' // We'll get this from user profile
      });
    }

    console.log('Creating request with data:', requestData);

    // Create the request
    const { data: newRequest, error } = await supabase
      .from('profile_update_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.log('Insert error:', error);
      return NextResponse.json(
        { error: 'Talep oluşturulurken hata oluştu: ' + error.message },
        { status: 500 }
      );
    }

    console.log('Request created successfully:', newRequest);

    return NextResponse.json(
      { message: 'Talep başarıyla oluşturuldu', request: newRequest },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create profile update request error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
