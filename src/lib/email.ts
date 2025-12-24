import nodemailer from 'nodemailer';

// SMTP transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
    secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    authMethod: 'PLAIN',
    debug: true,
    logger: true
  });
};

// Email template types
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Base email sending function
export async function sendEmail(
  to: string | string[],
  template: EmailTemplate,
  cc?: string[],
  bcc?: string[]
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Agora',
        address: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || '',
      },
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc?.join(', '),
      bcc: bcc?.join(', '),
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Email templates for different events
export const emailTemplates = {
  // Task assignment notification
  taskAssigned: (taskTitle: string, assignedBy: string, dueDate?: string): EmailTemplate => ({
    subject: `Yeni Görev Atandı: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Yeni Görev Atandı</h2>
        <p>Merhaba,</p>
        <p>Size yeni bir görev atandı:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${taskTitle}</h3>
          <p style="margin: 5px 0;"><strong>Atayan:</strong> ${assignedBy}</p>
          ${dueDate ? `<p style="margin: 5px 0;"><strong>Teslim Tarihi:</strong> ${dueDate}</p>` : ''}
        </div>
        <p>İyi çalışmalar!</p>
      </div>
    `,
    text: `Yeni Görev Atandı: ${taskTitle}\n\nAtayan: ${assignedBy}\n${dueDate ? `Teslim Tarihi: ${dueDate}\n` : ''}\nGörev detaylarını görmek için sisteme giriş yapabilirsiniz.`
  }),

  // Task status update notification
  taskStatusUpdate: (taskTitle: string, oldStatus: string, newStatus: string, updatedBy: string): EmailTemplate => ({
    subject: `Görev Durumu Güncellendi: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Görev Durumu Güncellendi</h2>
        <p>Merhaba,</p>
        <p>Bir görevin durumu güncellendi:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${taskTitle}</h3>
          <p style="margin: 5px 0;"><strong>Eski Durum:</strong> <span style="color: #dc2626;">${oldStatus}</span></p>
          <p style="margin: 5px 0;"><strong>Yeni Durum:</strong> <span style="color: #16a34a;">${newStatus}</span></p>
          <p style="margin: 5px 0;"><strong>Güncelleyen:</strong> ${updatedBy}</p>
        </div>
      </div>
    `,
    text: `Görev Durumu Güncellendi: ${taskTitle}\n\nEski Durum: ${oldStatus}\nYeni Durum: ${newStatus}\nGüncelleyen: ${updatedBy}`
  }),

  // Event reminder notification
  eventReminder: (eventTitle: string, eventDate: string, eventTime?: string, location?: string): EmailTemplate => ({
    subject: `Etkinlik Hatırlatması: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Etkinlik Hatırlatması</h2>
        <p>Merhaba,</p>
        <p>Yaklaşan etkinlik hatırlatması:</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${eventTitle}</h3>
          <p style="margin: 5px 0;"><strong>Tarih:</strong> ${eventDate}</p>
          ${eventTime ? `<p style="margin: 5px 0;"><strong>Saat:</strong> ${eventTime}</p>` : ''}
          ${location ? `<p style="margin: 5px 0;"><strong>Konum:</strong> ${location}</p>` : ''}
        </div>
        <p>Etkinliği unutmayın!</p>
      </div>
    `,
    text: `Etkinlik Hatırlatması: ${eventTitle}\n\nTarih: ${eventDate}\n${eventTime ? `Saat: ${eventTime}\n` : ''}${location ? `Konum: ${location}\n` : ''}`
  }),

  // New user welcome email
  userWelcome: (userName: string, tempPassword: string): EmailTemplate => ({
    subject: 'Agora\'ya Hoş Geldiniz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Hoş Geldiniz!</h2>
        <p>Merhaba ${userName},</p>
        <p>Agora'ya hoş geldiniz! Hesabınız başarıyla oluşturuldu.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Giriş Bilgileriniz</h3>
          <p style="margin: 5px 0;"><strong>Geçici Şifre:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <p><strong>Önemli:</strong> İlk giriş yaptığınızda şifrenizi değiştirmeniz önerilir.</p>
        <p>İyi çalışmalar!</p>
      </div>
    `,
    text: `Hoş Geldiniz ${userName}!\n\nAgora'ya hoş geldiniz! Hesabınız başarıyla oluşturuldu.\n\nGeçici Şifre: ${tempPassword}\n\nİlk giriş yaptığınızda şifrenizi değiştirmeniz önerilir.`
  }),

  // Password reset notification
  passwordReset: (userName: string, newPassword: string): EmailTemplate => ({
    subject: 'Şifreniz Sıfırlandı',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Şifre Sıfırlama</h2>
        <p>Merhaba ${userName},</p>
        <p>Şifreniz başarıyla sıfırlandı.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Yeni Şifreniz</h3>
          <p style="margin: 5px 0;"><strong>Yeni Şifre:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 4px;">${newPassword}</code></p>
        </div>
        <p><strong>Güvenlik:</strong> Giriş yaptıktan sonra şifrenizi değiştirmeniz önerilir.</p>
        <p>Eğer bu işlemi siz yapmadıysanız, lütfen sistem yöneticisi ile iletişime geçin.</p>
      </div>
    `,
    text: `Şifre Sıfırlama\n\nMerhaba ${userName},\n\nŞifreniz başarıyla sıfırlandı.\nYeni Şifre: ${newPassword}\n\nGiriş yaptıktan sonra şifrenizi değiştirmeniz önerilir.`
  }),

  // Project assignment notification
  projectAssigned: (projectTitle: string, assignedBy: string, role: string): EmailTemplate => ({
    subject: `Yeni Proje Ataması: ${projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Yeni Proje Ataması</h2>
        <p>Merhaba,</p>
        <p>Yeni bir projeye atandınız:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${projectTitle}</h3>
          <p style="margin: 5px 0;"><strong>Rolünüz:</strong> ${role}</p>
          <p style="margin: 5px 0;"><strong>Atayan:</strong> ${assignedBy}</p>
        </div>
        <p>İyi çalışmalar!</p>
      </div>
    `,
    text: `Yeni Proje Ataması: ${projectTitle}\n\nRolünüz: ${role}\nAtayan: ${assignedBy}\n\nProje detaylarını görmek için sisteme giriş yapabilirsiniz.`
  })
};

// Notification preferences type
export interface NotificationPreferences {
  taskAssignments: boolean;
  taskUpdates: boolean;
  eventReminders: boolean;
  projectUpdates: boolean;
  systemNotifications: boolean;
}

// Get user notification preferences (you can extend this to fetch from database)
export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    taskAssignments: true,
    taskUpdates: true,
    eventReminders: true,
    projectUpdates: true,
    systemNotifications: true,
  };
}
