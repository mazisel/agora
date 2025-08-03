import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, recipients, data } = body;

    if (!type || !recipients || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipients, data' },
        { status: 400 }
      );
    }

    let template;
    
    switch (type) {
      case 'task_assigned':
        template = emailTemplates.taskAssigned(
          data.taskTitle,
          data.assignedBy,
          data.dueDate
        );
        break;
        
      case 'task_status_update':
        template = emailTemplates.taskStatusUpdate(
          data.taskTitle,
          data.oldStatus,
          data.newStatus,
          data.updatedBy
        );
        break;
        
      case 'event_reminder':
        template = emailTemplates.eventReminder(
          data.eventTitle,
          data.eventDate,
          data.eventTime,
          data.location
        );
        break;
        
      case 'user_welcome':
        template = emailTemplates.userWelcome(
          data.userName,
          data.tempPassword
        );
        break;
        
      case 'password_reset':
        template = emailTemplates.passwordReset(
          data.userName,
          data.newPassword
        );
        break;
        
      case 'project_assigned':
        template = emailTemplates.projectAssigned(
          data.projectTitle,
          data.assignedBy,
          data.role
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // Send email to all recipients
    const emailPromises = recipients.map((email: string) => 
      sendEmail(email, template)
    );
    
    const results = await Promise.allSettled(emailPromises);
    
    // Count successful and failed sends
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;
    
    const failed = results.length - successful;

    // Log the notification in database (optional)
    try {
      await supabase.from('email_notifications').insert({
        type,
        recipients,
        subject: template.subject,
        sent_at: new Date().toISOString(),
        successful_count: successful,
        failed_count: failed,
        data
      });
    } catch (dbError) {
      console.error('Failed to log notification:', dbError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${successful} recipients`,
      stats: {
        total: results.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 }
    );
  }
}
