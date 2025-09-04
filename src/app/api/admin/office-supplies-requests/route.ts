import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key ile admin işlemleri için
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

export async function GET(request: NextRequest) {
  try {
    // Fetch all office supplies requests with user profiles using raw SQL
    const { data: requests, error } = await supabaseAdmin.rpc('get_office_supplies_requests_with_users');

    // If RPC doesn't exist, use manual JOIN
    if (error && error.message.includes('function')) {
      const { data: requestsData, error: requestsError } = await supabaseAdmin
        .from('office_supplies_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Requests error:', requestsError);
        return NextResponse.json({ 
          success: false, 
          error: requestsError.message 
        }, { status: 500 });
      }

      // Fetch user profiles separately
      const userIds = requestsData?.map(r => r.user_id).filter(Boolean) || [];
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number, department')
        .in('id', userIds);

      if (usersError) {
        console.error('Users error:', usersError);
        return NextResponse.json({ 
          success: false, 
          error: usersError.message 
        }, { status: 500 });
      }

      // Combine data
      const requestsWithUsers = requestsData?.map(request => ({
        ...request,
        user_profiles: usersData?.find(user => user.id === request.user_id) || null
      })) || [];

      return NextResponse.json({
        success: true,
        requests: requestsWithUsers
      });
    }

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requests: requests || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, status, additionalData } = body;

    if (!requestId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Request ID and status are required' 
      }, { status: 400 });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const { data, error } = await supabaseAdmin
      .from('office_supplies_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
