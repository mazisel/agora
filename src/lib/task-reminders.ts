import { supabaseAdmin } from './supabase-admin';

interface ReminderContext {
  taskTitle?: string | null;
  priority?: string | null;
  projectName?: string | null;
  assigneeNames?: string[] | null;
  assignedByName?: string | null;
  dueDate?: string | null;
}

const DEFAULT_FIRST_REMINDER_MINUTES = 30;
const DEFAULT_INTERVAL_MINUTES = 60;
const DEFAULT_MAX_REMINDERS = 12;

export async function scheduleTaskAssignmentReminders(
  taskId: string,
  userIds: string[],
  context: ReminderContext
): Promise<void> {
  if (!userIds || userIds.length === 0) {
    return;
  }

  const now = new Date();
  const firstReminder = new Date(now.getTime() + DEFAULT_FIRST_REMINDER_MINUTES * 60 * 1000);

  const rows = userIds.map((userId) => ({
    task_id: taskId,
    user_id: userId,
    initial_notification_at: now.toISOString(),
    next_reminder_at: firstReminder.toISOString(),
    last_reminder_sent_at: now.toISOString(),
    reminder_attempts: 0,
    reminder_interval_minutes: DEFAULT_INTERVAL_MINUTES,
    max_reminders: DEFAULT_MAX_REMINDERS,
    completed_at: null,
    metadata: {
      taskTitle: context.taskTitle ?? null,
      priority: context.priority ?? null,
      projectName: context.projectName ?? null,
      assigneeNames: context.assigneeNames ?? null,
      assignedByName: context.assignedByName ?? null,
      dueDate: context.dueDate ?? null,
    },
    updated_at: now.toISOString(),
  }));

  try {
    await supabaseAdmin
      .from('task_assignment_reminders')
      .upsert(rows, {
        onConflict: 'task_id,user_id',
      });
  } catch (error) {
    console.error('Failed to schedule task assignment reminders:', error);
  }
}

export async function completeTaskReminder(reminderId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('task_assignment_reminders')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId);
  } catch (error) {
    console.error('Failed to complete task reminder:', error);
  }
