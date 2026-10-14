import { prisma, serializeBigInt } from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { sseManager } from './sse.manager';
import { sendEmail, buildNotificationEmailHtml } from '../email/email.service';

export interface CreateNotificationParams {
  userId: bigint | string | number;
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl?: string;
  sendEmailNotification?: boolean;
}

export class NotificationService {
  /**
   * Create an in-app notification, push via SSE, and send email asynchronously
   */
  public async createNotification(params: CreateNotificationParams) {
    try {
      const targetUserId = BigInt(params.userId);

      // 1. Create DB record
      const notification = await prisma.notification.create({
        data: {
          user_id: targetUserId,
          title: params.title,
          message: params.message,
          type: params.type || NotificationType.PROJECT_APPROVED,
          link_url: params.linkUrl || null,
        },
      });

      const serializedNotification = serializeBigInt(notification);

      // 2. Push via SSE
      sseManager.sendToUser(targetUserId.toString(), 'notification', {
        action: 'NEW_NOTIFICATION',
        notification: serializedNotification,
      });

      // Also send updated unread count
      const unreadCount = await prisma.notification.count({
        where: { user_id: targetUserId, is_read: false },
      });
      sseManager.sendToUser(targetUserId.toString(), 'unread_count', { count: unreadCount });

      // 3. Send Email in background if requested or by default
      if (params.sendEmailNotification !== false) {
        this.sendEmailInBackground(targetUserId, params);
      }

      return notification;
    } catch (error: any) {
      console.error('[NotificationService] Error creating notification:', error.message);
      return null;
    }
  }

  /**
   * Send email asynchronously without blocking the request
   */
  private async sendEmailInBackground(userId: bigint, params: CreateNotificationParams) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, full_name: true },
      });

      if (!user) {
        return;
      }

      // 1. Resolve recipient email:
      // Priority 1: User's registered email
      // Priority 2: Fallback to username with institutional domain (<username>@cric.ac.th)
      let recipientEmail = user.email?.trim();
      if (!recipientEmail && user.username) {
        recipientEmail = `${user.username}@cric.ac.th`;
      }

      if (!recipientEmail) {
        console.warn(`[NotificationService] Cannot send email. User ID ${userId} has no email or username.`);
        return;
      }

      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['college_name', 'theme_primary_color', 'theme_accent_color', 'app_url'],
          },
        },
      });

      const settingMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingMap[s.key] = s.value;
      });

      const collegeName = settingMap['college_name'] || 'วิทยาลัยการอาชีพเชียงราย';
      const primaryColor = settingMap['theme_primary_color'] || '#064e3b';
      const accentColor = settingMap['theme_accent_color'] || '#059669';
      const appUrl = settingMap['app_url'] || process.env.APP_URL || process.env.WEB_APP_URL || 'http://localhost:3005';

      const fullActionUrl = params.linkUrl
        ? params.linkUrl.startsWith('http')
          ? params.linkUrl
          : `${appUrl}${params.linkUrl.startsWith('/') ? '' : '/'}${params.linkUrl}`
        : appUrl;

      const emailHtml = buildNotificationEmailHtml({
        recipientName: user.full_name,
        title: params.title,
        message: params.message,
        actionUrl: fullActionUrl,
        actionLabel: 'เปิดดูในระบบงานแผน',
        collegeName,
        primaryColor,
        accentColor,
      });

      const result = await sendEmail({
        to: recipientEmail,
        subject: `[${collegeName}] ${params.title}`,
        html: emailHtml,
        text: `${params.title}\n\n${params.message}\n\nเข้าสู่ระบบ: ${fullActionUrl}`,
      });

      if (result.success) {
        console.log(`[NotificationService] Email notification successfully sent to ${recipientEmail} for: "${params.title}"`);
      } else {
        console.warn(`[NotificationService] Email dispatch skipped/failed for ${recipientEmail}: ${result.error}`);
      }
    } catch (err: any) {
      console.error('[NotificationService] Email background dispatch error:', err.message);
    }
  }
}

export const notificationService = new NotificationService();
