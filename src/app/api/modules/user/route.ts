import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user profile first
    const { data: userProfile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found', details: profileError.message },
        { status: 404 }
      );
    }

    // Get modules assigned to this user
    const { data: modules, error: modulesError } = await supabaseServer
      .from('modules')
      .select('*')
      .eq('assigned_to', userProfile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (modulesError) {
      console.error('Error fetching user modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules', details: modulesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      modules: modules || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
