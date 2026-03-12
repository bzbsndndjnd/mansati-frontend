// services/notificationService.ts
// 🔔 خدمة الإشعارات - نسخة محسنة مع ApiResponse
// @version 2.2.0
// @lastUpdated 2026

import api from "./api";
import type { 
    Notification, 
    NotificationsResponse, 
    UnreadCountResponse,
    NotificationType 
} from "@/types/Notification";
import { secureLog } from "@/utils/security";

// ============================================================================
// أنواع إضافية للخدمة
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
}

export interface CreateNotificationData {
    recipient: string;
    type: NotificationType;
    message: string;
    title?: string;
    conversationId?: string;
    data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
}

// ============================================================================
// دوال مساعدة
// ============================================================================

const extractData = <T>(response: any, defaultValue: T): T => {
  if (!response) return defaultValue;
  if (response?.success === true && response.data !== undefined) {
    return response.data as T;
  }
  if (Array.isArray(response) || (typeof response === 'object' && response !== null)) {
    return response as T;
  }
  secureLog.warn('Unexpected response structure', response);
  return defaultValue;
};

// ============================================================================
// خدمة الإشعارات
// ============================================================================

const notificationService = {
    /**
     * جلب الإشعارات مع دعم التصفح
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
        try {
            console.log(`🔔 [NotificationService] Fetching page ${page}`);
            
            const response = await api.get<ApiResponse<NotificationsResponse['data']>>(
                `/notifications?page=${page}&limit=${limit}`
            );
            
            console.log('🔔 [NotificationService] Raw response:', response.data);

            // استخراج البيانات
            const data = extractData<NotificationsResponse['data']>(response.data, {
                notifications: [],
                stats: { unreadCount: 0, total: 0 }
            });

            const pagination = response.data?.pagination || {
                page,
                limit,
                total: 0,
                pages: 0,
                hasMore: false
            };

            return {
                success: response.data?.success || true,
                data,
                pagination
            };
        } catch (error) {
            secureLog.error('❌ فشل جلب الإشعارات');
            console.error('🔔 [NotificationService] Error:', error);
            
            return {
                success: false,
                data: {
                    notifications: [],
                    stats: { unreadCount: 0, total: 0 }
                },
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                    hasMore: false
                }
            };
        }
    },

    /**
     * جلب عدد الإشعارات غير المقروءة
     */
    async getUnreadCount(): Promise<number> {
        try {
            const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
            const data = extractData<{ count: number }>(response.data, { count: 0 });
            return data.count || 0;
        } catch (error) {
            secureLog.error('❌ فشل جلب عدد الإشعارات');
            console.error('🔔 [NotificationService] Unread count error:', error);
            return 0;
        }
    },

    /**
     * تحديث إشعار كمقروء
     */
    async markAsRead(notificationId: string): Promise<Notification> {
        try {
            const response = await api.patch<ApiResponse<Notification>>(`/notifications/${notificationId}/read`);
            const notification = extractData<Notification>(response.data, null as any);
            if (!notification) throw new Error('Invalid response structure');
            return notification;
        } catch (error) {
            secureLog.error('❌ فشل تحديث الإشعار');
            console.error('🔔 [NotificationService] Mark as read error:', error);
            throw error;
        }
    },

    /**
     * تحديث كل الإشعارات كمقروءة
     */
    async markAllAsRead(): Promise<void> {
        try {
            await api.patch('/notifications/read-all');
            console.log('🔔 [NotificationService] All notifications marked as read');
        } catch (error) {
            secureLog.error('❌ فشل تحديث كل الإشعارات');
            console.error('🔔 [NotificationService] Mark all as read error:', error);
            throw error;
        }
    },

    /**
     * حذف إشعار
     */
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            await api.delete(`/notifications/${notificationId}`);
            console.log('🔔 [NotificationService] Notification deleted:', notificationId);
        } catch (error) {
            secureLog.error('❌ فشل حذف الإشعار');
            console.error('🔔 [NotificationService] Delete error:', error);
            throw error;
        }
    },

    /**
     * إنشاء إشعار جديد (للمسؤولين فقط)
     */
    async createNotification(data: CreateNotificationData): Promise<Notification> {
        try {
            const response = await api.post<ApiResponse<Notification>>('/notifications', data);
            const notification = extractData<Notification>(response.data, null as any);
            if (!notification) throw new Error('Invalid response structure');
            return notification;
        } catch (error) {
            secureLog.error('❌ فشل إنشاء الإشعار');
            console.error('🔔 [NotificationService] Create error:', error);
            throw error;
        }
    }
};

export default notificationService;