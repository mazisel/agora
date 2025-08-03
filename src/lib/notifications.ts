import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Notification helper functions
export class NotificationService {
  
  // Send email notification via API
  private static async sendEmailNotification(
    type: string,
    recipients: string[],
    data: any
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send-email', {
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

  // Get user emails by user IDs
  private static async getUserEmails(userIds: string[]): Promise<string[]> {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
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

  // Get user emails by role
  private static async getUserEmailsByRole(role: string): Promise<string[]> {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', role)
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

  // Task assignment notification
  static async notifyTaskAssignment(
    taskId: string,
    assignedToIds: string[],
    assignedByName: string,
    taskTitle: string,
    dueDate?: string
  ): Promise<boolean> {
    const emails = await this.getUserEmails(assignedToIds);
    
    if (emails.length === 0) {
      console.warn('No valid emails found for task assignment notification');
      return false;
    }

    return await this.sendEmailNotification('task_assigned', emails, {
      taskTitle,
      assignedBy: assignedByName,
      dueDate,
      taskId
    });
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
    const emails = await this.getUserEmails(notifyUserIds);
    
    if (emails.length === 0) {
      console.warn('No valid emails found for task status update notification');
      return false;
    }

    return await this.sendEmailNotification('task_status_update', emails, {
      taskTitle,
      oldStatus,
      newStatus,
      updatedBy: updatedByName,
      taskId
    });
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
    const emails = await this.getUserEmails(participantIds);
    
    if (emails.length === 0) {
      console.warn('No valid emails found for event reminder notification');
      return false;
    }

    return await this.sendEmailNotification('event_reminder', emails, {
      eventTitle,
      eventDate,
      eventTime,
      location,
      eventId
    });
  }

  // New user welcome notification
  static async notifyUserWelcome(
    userEmail: string,
    userName: string,
    tempPassword: string
  ): Promise<boolean> {
    return await this.sendEmailNotification('user_welcome', [userEmail], {
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
    return await this.sendEmailNotification('password_reset', [userEmail], {
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
    const emails = await this.getUserEmails(assignedToIds);
    
    if (emails.length === 0) {
      console.warn('No valid emails found for project assignment notification');
      return false;
    }

    return await this.sendEmailNotification('project_assigned', emails, {
      projectTitle,
      assignedBy: assignedByName,
      role,
      projectId
    });
  }

  // Notify all admins
  static async notifyAdmins(
    type: string,
    data: any
  ): Promise<boolean> {
    const emails = await this.getUserEmailsByRole('admin');
    
    if (emails.length === 0) {
      console.warn('No admin emails found');
      return false;
    }

    return await this.sendEmailNotification(type, emails, data);
  }

  // Notify all managers
  static async notifyManagers(
    type: string,
    data: any
  ): Promise<boolean> {
    const emails = await this.getUserEmailsByRole('manager');
    
    if (emails.length === 0) {
      console.warn('No manager emails found');
      return false;
    }

    return await this.sendEmailNotification(type, emails, data);
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
