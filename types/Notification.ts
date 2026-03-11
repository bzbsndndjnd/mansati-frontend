/**
 * 🔔 أنواع بيانات الإشعارات - نسخة محسنة
 * @version 2.0.0
 * @lastUpdated 2026
 */

// ============================================================================
// الأنواع الأساسية
// ============================================================================

/**
 * أنواع الإشعارات الممكنة
 */
export type NotificationType = 
    | "message"      // رسالة جديدة
    | "reaction"     // تفاعل على منشور
    | "comment"      // تعليق جديد
    | "mention"      // ذكر في منشور أو تعليق
    | "friend_request" // طلب صداقة
    | "friend_accept" // قبول طلب صداقة
    | "system"       // إشعار نظام
    | "post"         // منشور جديد
    | "share";       // مشاركة

/**
 * أولوية الإشعار
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// ============================================================================
// واجهات البيانات
// ============================================================================

/**
 * معلومات المرسل (نسخة مصغرة)
 */
export interface SenderInfo {
    _id: string;
    name: string;
    avatar?: string;
}

/**
 * بيانات إضافية للإشعار (حسب النوع)
 */
export interface NotificationData {
    messageId?: string;      // معرف الرسالة
    postId?: string;         // معرف المنشور
    commentId?: string;      // معرف التعليق
    reactionType?: string;   // نوع التفاعل
    textPreview?: string;    // نص مختصر
    [key: string]: any;      // بيانات إضافية
}

/**
 * هيكل الإشعار الرئيسي
 */
export interface Notification {
    /** معرف الإشعار (فريد) */
    _id: string;
    
    /** معرف المستلم */
    recipient: string;
    
    /** معلومات المرسل (قد تكون كاملة أو جزئية) */
    sender: {
        _id: string;
        name: string;
        avatar?: string;
    };
    
    /** ✅ معلومات المرسل محفوظة (نسخة احتياطية) */
    senderInfo?: {
        name: string;
        avatar?: string;
    };
    
    /** ✅ اسم المرسل (نسخة احتياطية) */
    senderName?: string;
    
    /** ✅ صورة المرسل (نسخة احتياطية) */
    senderAvatar?: string;
    
    /** نوع الإشعار */
    type: NotificationType;
    
    /** عنوان الإشعار */
    title?: string;
    
    /** نص الإشعار */
    message: string;
    
    /** معرف المحادثة (للرسائل) */
    conversationId?: string;
    
    /** بيانات إضافية */
    data?: NotificationData;
    
    /** حالة القراءة */
    read: boolean;
    
    /** وقت القراءة */
    readAt?: Date;
    
    /** أولوية الإشعار */
    priority: NotificationPriority;
    
    /** رابط الإجراء */
    actionUrl?: string;
    
    /** وقت الإنشاء */
    createdAt: string;
    
    /** وقت التحديث */
    updatedAt?: string;
}

// ============================================================================
// دوال مساعدة للتحقق من الأنواع
// ============================================================================

/**
 * التحقق من أن الإشعار من نوع رسالة
 */
export function isMessageNotification(notification: Notification): boolean {
    return notification.type === 'message' && !!notification.conversationId;
}

/**
 * التحقق من أن الإشعار من نوع تفاعل
 */
export function isReactionNotification(notification: Notification): boolean {
    return notification.type === 'reaction' && !!notification.data?.postId;
}

/**
 * التحقق من أن الإشعار من نوع تعليق
 */
export function isCommentNotification(notification: Notification): boolean {
    return notification.type === 'comment' && !!notification.data?.postId;
}

/**
 * التحقق من أن الإشعار من نوع ذكر
 */
export function isMentionNotification(notification: Notification): boolean {
    return notification.type === 'mention' && !!notification.data?.postId;
}

/**
 * التحقق من أن الإشعار من نوع طلب صداقة
 */
export function isFriendRequestNotification(notification: Notification): boolean {
    return notification.type === 'friend_request' || notification.type === 'friend_accept';
}

// ============================================================================
// استجابة API للإشعارات
// ============================================================================

/**
 * استجابة جلب الإشعارات
 */
export interface NotificationsResponse {
    success: boolean;
    data: {
        notifications: Notification[];
        stats: {
            unreadCount: number;
            total: number;
        };
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasMore: boolean;
    };
}

/**
 * استجابة عدد الإشعارات غير المقروءة
 */
export interface UnreadCountResponse {
    success: boolean;
    data: {
        count: number;
    };
}

// ============================================================================
// دوال مساعدة لمعالجة الإشعارات
// ============================================================================

/**
 * الحصول على اسم المرسل بشكل آمن
 */
export function getSenderName(notification: Notification): string {
    // محاولة الحصول من sender
    if (notification.sender?.name) {
        return notification.sender.name;
    }
    
    // محاولة الحصول من senderInfo
    if (notification.senderInfo?.name) {
        return notification.senderInfo.name;
    }
    
    // محاولة الحصول من senderName (نسخة احتياطية)
    if (notification.senderName) {
        return notification.senderName;
    }
    
    // القيمة الافتراضية
    return 'مستخدم';
}

/**
 * الحصول على صورة المرسل بشكل آمن
 */
export function getSenderAvatar(notification: Notification): string | null {
    // محاولة الحصول من sender
    if (notification.sender?.avatar) {
        return notification.sender.avatar;
    }
    
    // محاولة الحصول من senderInfo
    if (notification.senderInfo?.avatar) {
        return notification.senderInfo.avatar;
    }
    
    // محاولة الحصول من senderAvatar (نسخة احتياطية)
    if (notification.senderAvatar) {
        return notification.senderAvatar;
    }
    
    return null;
}

/**
 * الحصول على نص مختصر للإشعار
 */
export function getNotificationPreview(notification: Notification, maxLength: number = 50): string {
    if (notification.message.length <= maxLength) {
        return notification.message;
    }
    return notification.message.substring(0, maxLength) + '...';
}

/**
 * تنسيق وقت الإشعار
 */
export function formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ============================================================================
// ثوابت الإشعارات
// ============================================================================

/**
 * رسائل افتراضية حسب نوع الإشعار
 */
export const DEFAULT_NOTIFICATION_MESSAGES: Record<NotificationType, string> = {
    message: 'أرسل لك رسالة جديدة',
    reaction: 'تفاعل مع منشورك',
    comment: 'علق على منشورك',
    mention: 'ذكرك في منشور',
    friend_request: 'أرسل لك طلب صداقة',
    friend_accept: 'قبل طلب الصداقة',
    system: 'إشعار من النظام',
    post: 'نشر منشوراً جديداً',
    share: 'شارك منشورك'
};

/**
 * أيقونات الإشعارات حسب النوع
 */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    message: '💬',
    reaction: '❤️',
    comment: '💭',
    mention: '@',
    friend_request: '👥',
    friend_accept: '✅',
    system: '🔔',
    post: '📝',
    share: '🔄'
};

/**
 * ألوان الإشعارات حسب النوع
 */
export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
    message: '#3b82f6',
    reaction: '#ef4444',
    comment: '#10b981',
    mention: '#8b5cf6',
    friend_request: '#f59e0b',
    friend_accept: '#10b981',
    system: '#6b7280',
    post: '#3b82f6',
    share: '#8b5cf6'
};