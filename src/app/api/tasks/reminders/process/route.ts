import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildTelegramMessage, sendTelegramMessages } from '@/lib/telegram';

const REMINDER_SECRET = process.env.TASK_REMINDER_SECRET;

function ensureAuthorized(request: NextRequest): boolean {
  if (!REMINDER_SECRET) {
    return true;
  }

  const headerSecret = request.headers.get('x-task-reminder-secret');
  const querySecret = request.nextUrl.searchParams.get('secret');

  return headerSecret === REMINDER_SECRET || querySecret === REMINDER_SECRET;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function POST(request: NextRequest) {
  if (!ensureAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: reminders, error } = await supabaseAdmin
      .from('task_assignment_reminders')
      .select(`
        id,
        task_id,
        user_id,
        initial_notification_at,
        next_reminder_at,
        last_reminder_sent_at,
        reminder_attempts,
        reminder_interval_minutes,
        max_reminders,
        metadata,
        task:tasks(id, title, due_date, priority, project:projects(name)),
        user:user_profiles(id, first_name, last_name, telegram_chat_id, telegram_notifications_enabled, last_login_at)
      `)
      .lte('next_reminder_at', nowIso)
      .is('completed_at', null);

    if (error) {
      console.error('Reminder fetch error:', error);
      return NextResponse.json({ error: 'Failed to load reminders' }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;

    for (const reminder of reminders) {
      const reminderId = reminder.id;
      const reminderAttempts = reminder.reminder_attempts ?? 0;
      const maxReminders = reminder.max_reminders ?? 0;
      const intervalMinutes = reminder.reminder_interval_minutes ?? 60;
      const metadata = reminder.metadata || {};
      const user = reminder.user;
      const task = reminder.task;

      const markCompleted = async () => {
        await supabaseAdmin
          .from('task_assignment_reminders')
          .update({
            completed_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', reminderId);
      };

      if (!user || !user.telegram_notifications_enabled || !user.telegram_chat_id) {
        await markCompleted();
        continue;
      }

      const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
      const lastReminderSent = reminder.last_reminder_sent_at ? new Date(reminder.last_reminder_sent_at) : null;
      const initialSent = reminder.initial_notification_at ? new Date(reminder.initial_notification_at) : null;

      const loginAfterInitial =
        lastLogin &&
        ((initialSent && lastLogin > initialSent) ||
          (lastReminderSent && lastLogin > lastReminderSent));

      if (loginAfterInitial) {
        await markCompleted();
        continue;
      }

      if (maxReminders > 0 && reminderAttempts >= maxReminders) {
        await markCompleted();
        continue;
      }

      const message = buildTelegramMessage('task_assigned_reminder', {
        taskTitle: task?.title || metadata.taskTitle || 'Görev',
        assignedBy: metadata.assignedByName || 'Yönetici',
        assigneeNames: metadata.assigneeNames || null,
        projectName: task?.project?.name || metadata.projectName || null,
        priority: task?.priority || metadata.priority || null,
        dueDate: task?.due_date || metadata.dueDate || null,
        taskId: reminder.task_id,
        attempt: reminderAttempts + 1,
      });

      if (!message) {
        console.warn('Reminder message could not be built for reminder', reminderId);
        await markCompleted();
        continue;
      }

      const { successful, failed } = await sendTelegramMessages(
        [user.telegram_chat_id],
        message
      );

      try {
        await supabaseAdmin.from('telegram_notifications').insert({
          type: 'task_assigned_reminder',
          recipients: [user.telegram_chat_id],
          message: message.text,
          sent_at: nowIso,
          successful_count: successful,
          failed_count: failed,
          data: {
            taskId: reminder.task_id,
            userId: reminder.user_id,
            attempt: reminderAttempts + 1,
          },
        });
      } catch (logError) {
        console.error('Failed to log reminder notification:', logError);
      }

      const updates: Record<string, any> = {
        reminder_attempts: reminderAttempts + 1,
        last_reminder_sent_at: nowIso,
        updated_at: nowIso,
      };

      if (maxReminders > 0 && reminderAttempts + 1 >= maxReminders) {
        updates.completed_at = nowIso;
        updates.next_reminder_at = null;
      } else {
        updates.next_reminder_at = addMinutes(now, intervalMinutes).toISOString();
      }

      await supabaseAdmin
        .from('task_assignment_reminders')
        .update(updates)
        .eq('id', reminderId);

      if (failed > 0 && successful === 0) {
        console.warn('Reminder delivery failed for reminder', reminderId);
      }

      processed += 1;
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error('process reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
