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
  recipientName?: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  collegeName?: string;
  primaryColor?: string;
  accentColor?: string;
}) {
  const college = params.collegeName || 'วิทยาลัยการอาชีพเชียงราย';
  const actionLabel = params.actionLabel || 'เปิดดูในระบบ';
  const actionUrl = params.actionUrl || process.env.APP_URL || 'http://localhost:3005';
  const primaryColor = params.primaryColor || '#064e3b';
  const accentColor = params.accentColor || '#059669';

  // Format recipient name with proper spacing and prefix cleanup
  const rawRecipient = params.recipientName ? params.recipientName.trim() : '';
  const cleanRecipient = rawRecipient.replace(/^(คุณ|นาย|นาง|นางสาว|ดร\.|ผศ\.|อาจารย์)\s*/, '');
  const greeting = rawRecipient
    ? rawRecipient.startsWith('คุณ') || rawRecipient.startsWith('นาย') || rawRecipient.startsWith('นาง') || rawRecipient.startsWith('นางสาว') || rawRecipient.startsWith('ดร.') || rawRecipient.startsWith('ผศ.') || rawRecipient.startsWith('อาจารย์')
      ? `เรียน ${rawRecipient}`
      : `เรียน คุณ ${rawRecipient}`
    : 'เรียน ผู้ใช้งานระบบ';

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    body { font-family: 'Prompt', 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02); }
    .header { background: linear-gradient(135deg, ${primaryColor} 0%, #047857 60%, #0f766e 100%); color: #ffffff; padding: 32px 30px; text-align: center; position: relative; }
    .header-badge { display: inline-block; background: rgba(255, 255, 255, 0.16); backdrop-filter: blur(4px); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #fef08a; letter-spacing: 0.5px; margin-bottom: 8px; border: 1px solid rgba(255, 255, 255, 0.2); }
    .header h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 0.3px; line-height: 1.3; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); }
    .header p { margin: 6px 0 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.9); font-weight: 500; }
    .content { padding: 32px 30px; background: #ffffff; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .intro-text { font-size: 14px; color: #475569; margin: 0 0 18px 0; line-height: 1.6; }
    .card { background: #f8fafc; border-left: 4px solid ${accentColor}; border: 1px solid #e2e8f0; padding: 18px 22px; border-radius: 10px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); }
    .card-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; }
    .card-desc { font-size: 14px; color: #334155; white-space: pre-wrap; margin: 0; line-height: 1.65; }
    .btn-container { text-align: center; margin: 32px 0 24px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #047857 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.3); letter-spacing: 0.3px; transition: all 0.2s ease; }
    .fallback-link { font-size: 12px; color: #64748b; margin-top: 24px; padding-top: 18px; border-top: 1px dashed #e2e8f0; line-height: 1.6; }
    .fallback-link a { color: ${accentColor}; word-break: break-all; text-decoration: none; font-weight: 600; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .footer p { margin: 0; }
    .footer .copy { margin-top: 6px; font-size: 11px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-badge">ระบบแจ้งเตือนอัตโนมัติ</div>
      <h1>${college}</h1>
      <p>ระบบบริหารจัดการงานแผนงานและโครงการ (Chiang Rai Vocational Plan)</p>
    </div>
    <div class="content">
      <div class="greeting">${greeting}</div>
      <p class="intro-text">
        ระบบมีการแจ้งเตือนความเคลื่อนไหวเกี่ยวกับโครงการของท่านหรือโครงการที่อยู่ในความรับผิดชอบ ดังนี้:
      </p>
      <div class="card">
        <div class="card-title">${params.title}</div>
        <p class="card-desc">${params.message}</p>
      </div>
      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank">${actionLabel}</a>
      </div>
      <div class="fallback-link">
        * หากปุ่มด้านบนไม่สามารถคลิกได้ กรุณาคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์: <br>
        <a href="${actionUrl}">${actionUrl}</a>
      </div>
    </div>
    <div class="footer">
      <p>อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้</p>
      <p class="copy">&copy; ${new Date().getFullYear()} ${college}. สงวนลิขสิทธิ์</p>
    </div>
  </div>
</body>
</html>
  `;
}
