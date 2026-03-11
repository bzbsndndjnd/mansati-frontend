/**
 * 🔔 خدمة الإشعارات - نسخة محسنة
 * @version 2.1.0
 * @lastUpdated 2026
 */

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
// خدمة الإشعارات
// ============================================================================

const notificationService = {
    /**
     * جلب الإشعارات مع دعم التصفح
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
        try {
            console.log(`🔔 [NotificationService] Fetching page ${page}`);
            
            const response = await api.get(
                `/notifications?page=${page}&limit=${limit}`
            );
            
            console.log('🔔 [NotificationService] Raw response:', response.data);

            // ✅ التأكد من وجود البيانات بالهيكل الصحيح
            if (!response.data || !response.data.data) {
                console.warn('🔔 [NotificationService] Unexpected response structure:', response.data);
                
                // إرجاع استجابة فارغة
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

            // ✅ استخراج البيانات مباشرة دون تغيير الهيكل
            const result: NotificationsResponse = {
                success: response.data.success || true,
                data: {
                    notifications: response.data.data.notifications || [],
                    stats: response.data.data.stats || { unreadCount: 0, total: 0 }
                },
                pagination: response.data.pagination || {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                    hasMore: false
                }
            };
            
            console.log(`🔔 [NotificationService] Processed ${result.data.notifications.length} notifications`);
            
            return result;
            
        } catch (error) {
            secureLog.error('❌ فشل جلب الإشعارات');
            console.error('🔔 [NotificationService] Error:', error);
            
            // إرجاع استجابة فارغة في حالة الخطأ
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
            const response = await api.get('/notifications/unread-count');
            
            console.log('🔔 [NotificationService] Unread count response:', response.data);
            
            // ✅ التعامل مع الهياكل المختلفة
            if (response.data?.data?.count !== undefined) {
                return response.data.data.count;
            } else if (response.data?.count !== undefined) {
                return response.data.count;
            }
            
            return 0;
            
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
            const response = await api.patch(`/notifications/${notificationId}/read`);
            
            console.log('🔔 [NotificationService] Mark as read response:', response.data);
            
            // ✅ استخراج الإشعار المحدث
            if (response.data?.data) {
                return response.data.data;
            }
            
            throw new Error('Invalid response structure');
            
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
            const response = await api.post('/notifications', data);
            
            console.log('🔔 [NotificationService] Notification created:', response.data);
            
            if (response.data?.data) {
                return response.data.data;
            }
            
            throw new Error('Invalid response structure');
            
        } catch (error) {
            secureLog.error('❌ فشل إنشاء الإشعار');
            console.error('🔔 [NotificationService] Create error:', error);
            throw error;
        }
    }
};

export default notificationService;