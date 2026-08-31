import nodemailer from 'nodemailer';
import { prisma } from '../../lib/prisma';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

/**
 * Get current SMTP configuration from system_settings or env
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'smtp_host',
          'smtp_port',
          'smtp_secure',
          'smtp_user',
          'smtp_pass',
          'smtp_from_name',
          'smtp_from_email',
          'smtp_enabled',
        ],
      },
    },
  });

  const settingMap: Record<string, string> = {};
  settings.forEach((s) => {
    settingMap[s.key] = s.value;
  });

  return {
    host: settingMap['smtp_host'] || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(settingMap['smtp_port'] || process.env.SMTP_PORT || '587', 10),
    secure: settingMap['smtp_secure'] === 'true' || process.env.SMTP_SECURE === 'true',
    user: settingMap['smtp_user'] || process.env.SMTP_USER || '',
    pass: settingMap['smtp_pass'] || process.env.SMTP_PASS || '',
    fromName: settingMap['smtp_from_name'] || process.env.SMTP_FROM_NAME || 'ระบบบริหารจัดการโครงการ',
    fromEmail: settingMap['smtp_from_email'] || process.env.SMTP_FROM_EMAIL || 'noreply@vocational-plan.ac.th',
    enabled: settingMap['smtp_enabled'] ? settingMap['smtp_enabled'] === 'true' : (process.env.SMTP_ENABLED === 'true' || false),
  };
}

/**
 * Create a nodemailer transporter based on given or loaded config
 */
export async function createTransporter(customConfig?: SmtpConfig) {
  const config = customConfig || (await getSmtpConfig());

  if (!config.user || !config.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

/**
 * Send an email asynchronously (safe and non-blocking)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getSmtpConfig();

    if (!config.enabled) {
      console.log(`[EmailService] Email notification is disabled. Skipped sending to ${options.to}`);
      return { success: false, error: 'Email service is disabled in settings' };
    }

    const transporter = await createTransporter(config);
    if (!transporter) {
      console.warn(`[EmailService] SMTP credentials not fully configured. Skipped sending to ${options.to}`);
      return { success: false, error: 'SMTP credentials not configured' };
    }

    const fromHeader = `"${config.fromName}" <${config.fromEmail || config.user}>`;

    const info = await transporter.sendMail({
      from: fromHeader,
      to: options.to,
      subject: options.subject,
      text: options.text || options.subject,
      html: options.html,
    });

    console.log(`[EmailService] Email sent successfully to ${options.to}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send email to ${options.to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate standard HTML email template for notifications
 */
export function buildNotificationEmailHtml(params: {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  collegeName?: string;
}) {
  const college = params.collegeName || 'วิทยาลัยการอาชีพเชียงราย';
  const actionLabel = params.actionLabel || 'เปิดดูในระบบ';
  const actionUrl = params.actionUrl || process.env.APP_URL || 'http://localhost:3005';

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 24px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; }
    .content { padding: 30px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .card { background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 6px; margin: 16px 0; }
    .card-title { font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 6px; }
    .card-desc { font-size: 14px; color: #475569; white-space: pre-wrap; margin: 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #1e40af; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 30px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${college}</h1>
      <p>ระบบบริหารจัดการงานแผนงานและโครงการ (Chiang Rai Vocational Plan)</p>
    </div>
    <div class="content">
      <div class="greeting">เรียน คุณ${params.recipientName}</div>
      <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
        ระบบมีการแจ้งเตือนความเคลื่อนไหวเกี่ยวกับโครงการของท่านหรือโครงการที่อยู่ในความรับผิดชอบ ดังนี้:
      </p>
      <div class="card">
        <div class="card-title">${params.title}</div>
        <p class="card-desc">${params.message}</p>
      </div>
      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank">${actionLabel}</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        * หากปุ่มด้านบนไม่สามารถคลิกได้ กรุณาคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์: <br>
        <a href="${actionUrl}" style="color: #2563eb; word-break: break-all;">${actionUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้</p>
      <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} ${college}. สงวนลิขสิทธิ์</p>
    </div>
  </div>
</body>
</html>
  `;
}
