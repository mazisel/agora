import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: /api/tasks/transferred called');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🔍 API: No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Supabase client'a user token'ı set et
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('🔍 API: Invalid user', userError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('🔍 API: User authenticated:', user.id);

    // Direkt user ID ile sorgu yap (RLS bypass için)
    console.log('🔍 API: Querying with user ID:', user.id);
    
    const { data: transferredTasks, error } = await supabase
      .from('task_transfers')
      .select(`
        id,
        task_id,
        from_user_id,
        to_user_id,
        reason,
        transfer_type,
        status,
        created_at,
        task:tasks(
          id,
          title,
          description,
          status,
          priority,
          due_date
        ),
        from_user:user_profiles!task_transfers_from_user_id_fkey(
          id,
          first_name,
          last_name,
          personnel_number
        )
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('🔍 API: Query result:', { transferredTasks, error });

    if (error) {
      console.error('🔍 API: Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch transferred tasks', details: error }, { status: 500 });
    }

    console.log('🔍 API: Returning data:', transferredTasks?.length || 0, 'transfers');

    return NextResponse.json({ 
      success: true, 
      data: transferredTasks || [],
      debug: {
        userId: user.id,
        queryCount: transferredTasks?.length || 0
      }
    });

  } catch (error) {
    console.error('🔍 API: Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
