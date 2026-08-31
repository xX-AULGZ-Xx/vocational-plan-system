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
        select: { id: true, email: true, full_name: true },
      });

      if (!user || !user.email) {
        return;
      }

      const collegeSetting = await prisma.systemSetting.findUnique({
        where: { key: 'college_name' },
      });

      const collegeName = collegeSetting?.value || 'วิทยาลัยการอาชีพเชียงราย';
      const appUrl = process.env.APP_URL || 'http://localhost:3005';
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
      });

      await sendEmail({
        to: user.email,
        subject: `[${collegeName}] ${params.title}`,
        html: emailHtml,
        text: `${params.title}\n\n${params.message}\n\nเข้าสู่ระบบ: ${fullActionUrl}`,
      });
    } catch (err: any) {
      console.error('[NotificationService] Email background dispatch error:', err.message);
    }
  }
}

export const notificationService = new NotificationService();
