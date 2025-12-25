import { createClient } from '@supabase/supabase-js';
import { buildTelegramMessage, sendTelegramMessages, TelegramNotificationType } from '@/lib/telegram';
import { scheduleTaskAssignmentReminders } from '@/lib/task-reminders';

// Fallback to placeholder during build if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type NotificationType = TelegramNotificationType | 'user_welcome' | 'password_reset';
type NotificationPayload = Record<string, unknown>;

type TelegramContactRow = {
  telegram_chat_id: string | null;
  telegram_notifications_enabled: boolean | null;
};

interface TaskAssignmentContext {
  priority?: string | null;
  projectName?: string | null;
  assigneeNames?: string[] | null;
  assignedByName?: string | null;
  dueDate?: string | null;
}

// Notification helper functions
export class NotificationService {

  // Send email notification via API
  private static async sendEmailNotification(
    type: NotificationType,
    recipients: string[],
    data: NotificationPayload
  ): Promise<boolean> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${appUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          recipients,
          data
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  // Send Telegram notification via Bot API
  private static async sendTelegramNotification(
    type: TelegramNotificationType,
    chatIds: (string | number)[],
    data: NotificationPayload
  ): Promise<boolean> {
    if (!chatIds || chatIds.length === 0) {
      return false;
    }

    const message = buildTelegramMessage(type, data);

    if (!message) {
      console.warn(`No Telegram template found for notification type: ${type}`);
      return false;
    }

    try {
      const { successful, failed } = await sendTelegramMessages(chatIds, message);

      try {
        await supabase.from('telegram_notifications').insert({
          type,
          recipients: chatIds.map((id) => id.toString()),
          message: message.text,
          sent_at: new Date().toISOString(),
          successful_count: successful,
          failed_count: failed,
          data
        });
      } catch (logError) {
        console.error('Failed to log Telegram notification:', logError);
      }

      if (successful === 0) {
        console.warn(`Telegram notification "${type}" could not be delivered to any recipient.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      return false;
    }
  }

  // Get user emails by user IDs
  private static async getUserEmails(userIds: string[]): Promise<string[]> {
    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('email')
        .in('id', userIds)
        .not('email', 'is', null);

      if (error) {
        console.error('Error fetching user emails:', error);
        return [];
      }

      return users.map(user => user.email).filter(Boolean);
    } catch (error) {
      console.error('Error fetching user emails:', error);
      return [];
    }
  }

  // Get user Telegram chat IDs by user IDs
  private static async getUserTelegramChatIds(userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('telegram_chat_id, telegram_notifications_enabled')
        .in('id', userIds)
        .eq('telegram_notifications_enabled', true)
        .not('telegram_chat_id', 'is', null);

      if (error) {
        console.error('Error fetching Telegram chat IDs:', error);
        return [];
      }

      if (!users) {
        return [];
      }

      return users
        .filter(
          (user: any): user is TelegramContactRow & { telegram_chat_id: string } =>
            Boolean(user.telegram_notifications_enabled) &&
            typeof user.telegram_chat_id === 'string' &&
            user.telegram_chat_id.trim().length > 0
        )
        .map((user: any) => user.telegram_chat_id);
    } catch (error) {
      console.error('Error fetching Telegram chat IDs:', error);
      return [];
    }
  }

  // Get user emails by role
  private static async getUserEmailsByRole(role: string): Promise<string[]> {
    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('authority_level', role) // Fixed: role -> authority_level based on schema usage elsewhere
        .not('email', 'is', null);

      if (error) {
        console.error('Error fetching user emails by role:', error);
        return [];
      }

      return users.map(user => user.email).filter(Boolean);
    } catch (error) {
      console.error('Error fetching user emails by role:', error);
      return [];
    }
  }

  // Get Telegram chat IDs by role
  private static async getUserTelegramChatIdsByRole(role: string): Promise<string[]> {
    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('telegram_chat_id, telegram_notifications_enabled')
        .eq('authority_level', role)
        .eq('telegram_notifications_enabled', true)
        .not('telegram_chat_id', 'is', null);

      if (error) {
        console.error('Error fetching Telegram chat IDs by role:', error);
        return [];
      }

      if (!users) {
        return [];
      }

      return users
        .filter(
          (user: any): user is TelegramContactRow & { telegram_chat_id: string } =>
            Boolean(user.telegram_notifications_enabled) &&
            typeof user.telegram_chat_id === 'string' &&
            user.telegram_chat_id.trim().length > 0
        )
        .map((user: any) => user.telegram_chat_id);
    } catch (error) {
      console.error('Error fetching Telegram chat IDs by role:', error);
      return [];
    }
  }

  private static isTelegramNotificationType(
    type: NotificationType
  ): type is TelegramNotificationType {
    return (
      type === 'task_assigned' ||
      type === 'task_status_update' ||
      type === 'event_reminder' ||
      type === 'project_assigned' ||
      type === 'task_assigned_reminder'
    );
  }

  // Task assignment notification
  static async notifyTaskAssignment(
    taskId: string,
    assignedToIds: string[],
    assignedByName: string,
    taskTitle: string,
    dueDate?: string,
    context?: TaskAssignmentContext
  ): Promise<boolean> {
    const [emails, telegramChatIds] = await Promise.all([
      NotificationService.getUserEmails(assignedToIds),
      NotificationService.getUserTelegramChatIds(assignedToIds)
    ]);

    if (emails.length === 0 && telegramChatIds.length === 0) {
      console.warn('No valid recipients found for task assignment notification');
      return false;
    }

    const payload = {
      taskTitle,
      assignedBy: assignedByName,
      dueDate,
      taskId,
      priority: context?.priority ?? null,
      projectName: context?.projectName ?? null,
      assigneeNames: context?.assigneeNames ?? null,
    };

    const deliveries: Promise<boolean>[] = [];

    if (emails.length > 0) {
      deliveries.push(NotificationService.sendEmailNotification('task_assigned', emails, payload));
    }

    if (telegramChatIds.length > 0) {
      deliveries.push(
        NotificationService.sendTelegramNotification('task_assigned', telegramChatIds, payload)
      );
    }

    const results = await Promise.all(deliveries);

    await scheduleTaskAssignmentReminders(taskId, assignedToIds, {
      taskTitle,
      priority: context?.priority ?? null,
      projectName: context?.projectName ?? null,
      assigneeNames: context?.assigneeNames ?? null,
      assignedByName,
      dueDate: dueDate ?? null,
    });

    return results.some(Boolean);
  }

  // Task status update notification
  static async notifyTaskStatusUpdate(
    taskId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    updatedByName: string,
    notifyUserIds: string[]
  ): Promise<boolean> {
    const [emails, telegramChatIds] = await Promise.all([
      NotificationService.getUserEmails(notifyUserIds),
      NotificationService.getUserTelegramChatIds(notifyUserIds)
    ]);

    if (emails.length === 0 && telegramChatIds.length === 0) {
      console.warn('No valid recipients found for task status update notification');
      return false;
    }

    const payload = {
      taskTitle,
      oldStatus,
      newStatus,
      updatedBy: updatedByName,
      taskId
    };

    const deliveries: Promise<boolean>[] = [];

    if (emails.length > 0) {
      deliveries.push(NotificationService.sendEmailNotification('task_status_update', emails, payload));
    }

    if (telegramChatIds.length > 0) {
      deliveries.push(
        NotificationService.sendTelegramNotification('task_status_update', telegramChatIds, payload)
      );
    }

    const results = await Promise.all(deliveries);
    return results.some(Boolean);
  }

  // Event reminder notification
  static async notifyEventReminder(
    eventId: string,
    eventTitle: string,
    eventDate: string,
    participantIds: string[],
    eventTime?: string,
    location?: string
  ): Promise<boolean> {
    const [emails, telegramChatIds] = await Promise.all([
      NotificationService.getUserEmails(participantIds),
      NotificationService.getUserTelegramChatIds(participantIds)
    ]);

    if (emails.length === 0 && telegramChatIds.length === 0) {
      console.warn('No valid recipients found for event reminder notification');
      return false;
    }

    const payload = {
      eventTitle,
      eventDate,
      eventTime,
      location,
      eventId
    };

    const deliveries: Promise<boolean>[] = [];

    if (emails.length > 0) {
      deliveries.push(NotificationService.sendEmailNotification('event_reminder', emails, payload));
    }

    if (telegramChatIds.length > 0) {
      deliveries.push(
        NotificationService.sendTelegramNotification('event_reminder', telegramChatIds, payload)
      );
    }

    const results = await Promise.all(deliveries);
    return results.some(Boolean);
  }

  // New user welcome notification
  static async notifyUserWelcome(
    userEmail: string,
    userName: string,
    tempPassword: string
  ): Promise<boolean> {
    return await NotificationService.sendEmailNotification('user_welcome', [userEmail], {
      userName,
      tempPassword
    });
  }

  // Password reset notification
  static async notifyPasswordReset(
    userEmail: string,
    userName: string,
    newPassword: string
  ): Promise<boolean> {
    return await NotificationService.sendEmailNotification('password_reset', [userEmail], {
      userName,
      newPassword
    });
  }

  // Project assignment notification
  static async notifyProjectAssignment(
    projectId: string,
    projectTitle: string,
    assignedToIds: string[],
    assignedByName: string,
    role: string
  ): Promise<boolean> {
    const [emails, telegramChatIds] = await Promise.all([
      NotificationService.getUserEmails(assignedToIds),
      NotificationService.getUserTelegramChatIds(assignedToIds)
    ]);

    if (emails.length === 0 && telegramChatIds.length === 0) {
      console.warn('No valid recipients found for project assignment notification');
      return false;
    }

    const payload = {
      projectTitle,
      assignedBy: assignedByName,
      role,
      projectId
    };

    const deliveries: Promise<boolean>[] = [];

    if (emails.length > 0) {
      deliveries.push(NotificationService.sendEmailNotification('project_assigned', emails, payload));
    }

    if (telegramChatIds.length > 0) {
      deliveries.push(
        NotificationService.sendTelegramNotification('project_assigned', telegramChatIds, payload)
      );
    }

    const results = await Promise.all(deliveries);
    return results.some(Boolean);
  }

  // Notify all admins
  static async notifyAdmins(
    type: NotificationType,
    data: NotificationPayload
  ): Promise<boolean> {
    const [emails, telegramChatIds] = await Promise.all([
      NotificationService.getUserEmailsByRole('admin'),
      NotificationService.getUserTelegramChatIdsByRole('admin')
    ]);

    if (emails.length === 0 && telegramChatIds.length === 0) {
      console.warn('No admin recipients found for notification');
      return false;
    }

    const deliveries: Promise<boolean>[] = [];

    if (emails.length > 0) {
      deliveries.push(NotificationService.sendEmailNotification(type, emails, data));
    }

    if (telegramChatIds.length > 0 && this.isTelegramNotificationType(type)) {
      deliveries.push(NotificationService.sendTelegramNotification(type, telegramChatIds, data));
    }

    if (deliveries.length === 0) {
      console.warn('Admin notification skipped because no supported channels were available');
      return false;
    }

    const results = await Promise.all(deliveries);
    return results.some(Boolean);
  }

  // Notify all managers
  static async notifyManagers(
    type: NotificationType,
    data: NotificationPayload
  ): Promise<boolean> {
    const [emails, telegramChatIds] = await Promise.all([
      NotificationService.getUserEmailsByRole('manager'),
      NotificationService.getUserTelegramChatIdsByRole('manager')
    ]);

    if (emails.length === 0 && telegramChatIds.length === 0) {
      console.warn('No manager recipients found for notification');
      return false;
    }

    const deliveries: Promise<boolean>[] = [];

    if (emails.length > 0) {
      deliveries.push(NotificationService.sendEmailNotification(type, emails, data));
    }

    if (telegramChatIds.length > 0 && this.isTelegramNotificationType(type)) {
      deliveries.push(NotificationService.sendTelegramNotification(type, telegramChatIds, data));
    }

    if (deliveries.length === 0) {
      console.warn('Manager notification skipped because no supported channels were available');
      return false;
    }

    const results = await Promise.all(deliveries);
    return results.some(Boolean);
  }

  // Schedule event reminders (to be called by a cron job or scheduler)
  static async scheduleEventReminders(): Promise<void> {
    try {
      // Get events happening in the next 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          time,
          location,
          participants
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .lte('date', tomorrow.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching events for reminders:', error);
        return;
      }

      // Send reminders for each event
      for (const event of events || []) {
        if (event.participants && event.participants.length > 0) {
          await this.notifyEventReminder(
            event.id,
            event.title,
            event.date,
            event.participants,
            event.time,
            event.location
          );
        }
      }
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
    }
  }

  // Test email configuration
  static async testEmailConfiguration(testEmail: string): Promise<boolean> {
    try {
      // Import email functions directly for server-side use
      const { sendEmail, emailTemplates } = await import('@/lib/email');

      const template = emailTemplates.userWelcome('Test User', 'test123');

      const success = await sendEmail(testEmail, template);

      return success;
    } catch (error) {
      console.error('Test email configuration error:', error);
      return false;
    }
  }
}

// Export individual functions for easier use
export const {
  notifyTaskAssignment,
  notifyTaskStatusUpdate,
  notifyEventReminder,
  notifyUserWelcome,
  notifyPasswordReset,
  notifyProjectAssignment,
  notifyAdmins,
  notifyManagers,
  scheduleEventReminders,
  testEmailConfiguration
} = NotificationService;
