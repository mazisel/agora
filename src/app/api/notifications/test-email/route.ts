import { NextRequest, NextResponse } from 'next/server';
import { testEmailConfiguration } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    console.log('Testing SMTP configuration...');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
    console.log('SMTP User:', process.env.SMTP_USER);
    console.log('SMTP Secure:', process.env.SMTP_SECURE);

    // Test email gönder
    const success = await testEmailConfiguration(testEmail);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email. Please check your SMTP configuration and credentials.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
