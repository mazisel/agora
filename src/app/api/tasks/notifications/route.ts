import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { notifyTaskAssignment, notifyTaskStatusUpdate } from '@/lib/notifications';

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
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json({ error: 'Missing type or payload' }, { status: 400 });
    }

    switch (type) {
      case 'taskAssigned': {
        const { taskId, assignedToIds, assignedByName, taskTitle, dueDate } = payload;

        if (!taskId || !Array.isArray(assignedToIds) || assignedToIds.length === 0 || !assignedByName || !taskTitle) {
          return NextResponse.json({ error: 'Invalid taskAssigned payload' }, { status: 400 });
        }

        const success = await notifyTaskAssignment(
          taskId,
          assignedToIds,
          assignedByName,
          taskTitle,
          dueDate || undefined
        );

        return NextResponse.json({ success });
      }

      case 'taskStatusUpdated': {
        const { taskId, taskTitle, oldStatus, newStatus, updatedByName, notifyUserIds } = payload;

        if (!taskId || !taskTitle || !oldStatus || !newStatus || !updatedByName || !Array.isArray(notifyUserIds) || notifyUserIds.length === 0) {
          return NextResponse.json({ error: 'Invalid taskStatusUpdated payload' }, { status: 400 });
        }

        const success = await notifyTaskStatusUpdate(
          taskId,
          taskTitle,
          oldStatus,
          newStatus,
          updatedByName,
          notifyUserIds
        );

        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json({ error: 'Unsupported notification type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Task notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
