import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { notifyTaskAssignment } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      taskId,
      assignedToIds,
      assignedByName,
      taskTitle,
      dueDate
    } = body;

    if (!taskId || !Array.isArray(assignedToIds) || assignedToIds.length === 0 || !assignedByName || !taskTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await notifyTaskAssignment(
      taskId,
      assignedToIds,
      assignedByName,
      taskTitle,
      dueDate || undefined
    );

    return NextResponse.json({ success });
  } catch (error) {
    console.error('notify-assignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
