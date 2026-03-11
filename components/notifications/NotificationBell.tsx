"use client";

// 🔔 NotificationBell.tsx
// مسؤول: عرض وإدارة الإشعارات بشكل آمن - نسخة محسنة بالكامل
// الإصدار: 3.1.0 | آخر تحديث: 2026

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { socketService, useSocket } from "@/services/socketService";
import notificationService from "@/services/notificationService";
import type { Notification } from "@/types/Notification";
import { secureLog, sanitizeImageUrl } from "@/utils/security";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import styles from "./NotificationBell.module.css";
import { FaUserCircle, FaBell, FaCheckDouble } from "react-icons/fa";

// ============================================================================
// دوال مساعدة
// ============================================================================

/**
 * الحصول على اسم المرسل بشكل آمن
 */
const getSenderName = (notification: Notification): string => {
    if (notification.sender?.name) {
        return notification.sender.name;
    }
    if (notification.senderInfo?.name) {
        return notification.senderInfo.name;
    }
    return 'مستخدم';
};

/**
 * الحصول على صورة المرسل بشكل آمن
 */
const getSenderAvatar = (notification: Notification): string | null => {
    if (notification.sender?.avatar) {
        return notification.sender.avatar;
    }
    if (notification.senderInfo?.avatar) {
        return notification.senderInfo.avatar;
    }
    return null;
};

/**
 * تنسيق وقت الإشعار
 */
const formatNotificationTime = (dateString: string): string => {
    try {
        return formatDistanceToNow(new Date(dateString), {
            addSuffix: true,
            locale: ar
        });
    } catch {
        return 'تاريخ غير معروف';
    }
};

// ============================================================================
// المكون الرئيسي
// ============================================================================

const NotificationBell = memo(() => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mounted = useRef(true);
    const loadingRef = useRef(false);
    
    const router = useRouter();
    const { user } = useAuth();
    const { isConnected } = useSocket(); // ✅ استخدام hook مخصص

    // ==========================================================================
    // Effects
    // ==========================================================================

    // تنظيف عند إلغاء التثبيت
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // تحديث حالة اتصال Socket
    useEffect(() => {
        setSocketConnected(isConnected);
    }, [isConnected]);

    // طلب صلاحية الإشعارات
    useEffect(() => {
        if (typeof window !== 'undefined' && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                secureLog.info('🔔 صلاحية الإشعارات', { permission });
            });
        }
    }, []);

    // تحميل الإشعارات عند تسجيل الدخول
    useEffect(() => {
        if (!user || !mounted.current) return;
        
        loadNotifications(true);
        
        // تحديث دوري (كل دقيقة)
        const interval = setInterval(() => {
            if (mounted.current) {
                loadUnreadCount();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [user]);

    // ✅ الاستماع للإشعارات الجديدة عبر Socket - نسخة محسنة
    useEffect(() => {
        if (!user || !mounted.current) return;

        console.log('🔔 [NotificationBell] Setting up notification listener...');

        const handleNewNotification = (notification: Notification) => {
            if (!mounted.current) {
                console.log('🔔 [NotificationBell] Component unmounted, ignoring notification');
                return;
            }

            console.log('📨 [NotificationBell] New notification received:', {
                id: notification._id,
                type: notification.type,
                message: notification.message
            });
            
            // معالجة الإشعار لضمان وجود البيانات
            const processedNotification = {
                ...notification,
                sender: {
                    _id: notification.sender?._id || notification.senderId,
                    name: getSenderName(notification),
                    avatar: getSenderAvatar(notification)
                }
            };

            // ✅ منع التكرار
            setNotifications(prev => {
                // التحقق من عدم وجود الإشعار مسبقاً
                if (prev.some(n => n._id === notification._id)) {
                    console.log('🔔 [NotificationBell] Duplicate notification prevented:', notification._id);
                    return prev;
                }
                return [processedNotification, ...prev];
            });
            
            setUnreadCount(prev => prev + 1);

            // إظهار إشعار في المتصفح
            if (Notification.permission === "granted") {
                try {
                    new Notification(processedNotification.title || "إشعار جديد", {
                        body: `${getSenderName(processedNotification)}: ${processedNotification.message}`,
                        icon: getSenderAvatar(processedNotification) || "/default-avatar.png",
                        tag: notification._id,
                        silent: false,
                    });
                } catch (error) {
                    secureLog.error('❌ فشل عرض إشعار المتصفح');
                }
            }
        };

        // ✅ إضافة المستمع
        const unsubscribe = socketService.on("new_notification", handleNewNotification);
        
        // ✅ التحقق من اتصال Socket
        if (socketService.isConnected()) {
            console.log('🔔 [NotificationBell] Socket is connected, listener active');
        } else {
            console.warn('🔔 [NotificationBell] Socket is not connected, notifications may be delayed');
        }

        // تنظيف المستمع
        return () => {
            console.log('🔔 [NotificationBell] Cleaning up notification listener');
            unsubscribe();
        };
    }, [user]); // ✅ إزالة الاعتماد على isConnected لمنع إعادة التسجيل

    // إغلاق القائمة عند النقر خارجها
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ==========================================================================
    // دوال تحميل البيانات
    // ==========================================================================

    /**
     * تحميل الإشعارات
     */
    const loadNotifications = async (reset = false) => {
        if (!mounted.current || loadingRef.current) return;
        
        loadingRef.current = true;
        setLoading(true);
        
        try {
            const currentPage = reset ? 1 : page;
            console.log(`🔔 [NotificationBell] Loading notifications page ${currentPage}`);
            
            const data = await notificationService.getNotifications(currentPage);
            
            if (!mounted.current) return;
            
            console.log(`🔔 [NotificationBell] Loaded ${data.data.notifications.length} notifications`);
            
            setNotifications(prev => 
                reset ? data.data.notifications : [...prev, ...data.data.notifications]
            );
            setUnreadCount(data.data.stats.unreadCount);
            setPage(currentPage + 1);
            setHasMore(data.pagination.hasMore);
            
        } catch (error) {
            secureLog.error('❌ فشل تحميل الإشعارات');
            console.error('🔔 [NotificationBell] Error loading notifications:', error);
        } finally {
            if (mounted.current) {
                setLoading(false);
                loadingRef.current = false;
            }
        }
    };

    /**
     * تحميل عدد الإشعارات غير المقروءة فقط
     */
    const loadUnreadCount = async () => {
        try {
            const count = await notificationService.getUnreadCount();
            if (mounted.current) {
                setUnreadCount(count);
            }
        } catch (error) {
            secureLog.error('❌ فشل تحميل عدد الإشعارات');
        }
    };

    /**
     * تحميل المزيد من الإشعارات (للسكرفلة اللانهائية)
     */
    const loadMore = useCallback(() => {
        if (!loading && hasMore && mounted.current) {
            loadNotifications();
        }
    }, [loading, hasMore]);

    // ==========================================================================
    // دوال التفاعل مع الإشعارات
    // ==========================================================================

    /**
     * النقر على إشعار
     */
    const handleNotificationClick = useCallback(async (notification: Notification) => {
        if (!mounted.current) return;
        
        try {
            console.log('🔔 [NotificationBell] Clicked notification:', notification._id);
            
            // تحديث حالة القراءة إذا لم يكن مقروءاً
            if (!notification.read) {
                await notificationService.markAsRead(notification._id);
                if (mounted.current) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                    setNotifications(prev =>
                        prev.map(n =>
                            n._id === notification._id ? { ...n, read: true } : n
                        )
                    );
                }
            }

            // التوجيه بناءً على نوع الإشعار
            if (notification.type === "message" && notification.sender?._id) {
                router.push(`/messages/${notification.sender._id}`);
            } else if (notification.type === "friend_request") {
                router.push('/friends');
            } else if (notification.data?.postId) {
                router.push(`/posts/${notification.data.postId}`);
            } else if (notification.actionUrl) {
                router.push(notification.actionUrl);
            }

            setShowDropdown(false);
            
        } catch (error) {
            secureLog.error('❌ خطأ في معالجة الإشعار');
        }
    }, [router]);

    /**
     * تحديد الكل كمقروء
     */
    const handleMarkAllAsRead = useCallback(async () => {
        if (!mounted.current) return;
        
        try {
            console.log('🔔 [NotificationBell] Marking all as read');
            await notificationService.markAllAsRead();
            if (mounted.current) {
                setUnreadCount(0);
                setNotifications(prev =>
                    prev.map(n => ({ ...n, read: true }))
                );
            }
        } catch (error) {
            secureLog.error('❌ فشل تحديث الإشعارات');
        }
    }, []);

    // ==========================================================================
    // Render
    // ==========================================================================

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={styles.bellButton}
                onClick={() => setShowDropdown(prev => !prev)}
                aria-label="الإشعارات"
                aria-expanded={showDropdown}
            >
                <FaBell className={styles.bellIcon} />
                
                {unreadCount > 0 && (
                    <span className={styles.badge} aria-label={`${unreadCount} إشعارات غير مقروءة`}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
                
                {/* ✅ مؤشر حالة الاتصال (للتصحيح) */}
                {!socketConnected && (
                    <span className={styles.connectionWarning} title="جاري إعادة الاتصال">●</span>
                )}
            </button>

            {showDropdown && (
                <div className={styles.dropdown} role="dialog" aria-label="قائمة الإشعارات">
                    <div className={styles.header}>
                        <h3 id="notification-title">الإشعارات</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className={styles.markAllButton}
                                aria-label="تحديد الكل كمقروء"
                            >
                                <FaCheckDouble />
                                <span>تحديد الكل</span>
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationList} role="list" aria-labelledby="notification-title">
                        {loading && notifications.length === 0 ? (
                            <div className={styles.loading} role="status">
                                <div className={styles.spinner}></div>
                                <span>جاري التحميل...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.empty} role="status">
                                <span className={styles.emptyIcon}>🔔</span>
                                <p>لا توجد إشعارات جديدة</p>
                            </div>
                        ) : (
                            <>
                                {notifications.map((notification) => {
                                    const senderName = getSenderName(notification);
                                    const senderAvatar = getSenderAvatar(notification);
                                    const timeAgo = formatNotificationTime(notification.createdAt);

                                    return (
                                        <div
                                            key={notification._id}
                                            className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                            role="listitem"
                                            tabIndex={0}
                                            onKeyPress={(e) => e.key === "Enter" && handleNotificationClick(notification)}
                                            aria-label={`إشعار من ${senderName}: ${notification.message}`}
                                        >
                                            <div className={styles.avatar}>
                                                {senderAvatar ? (
                                                    <img
                                                        src={sanitizeImageUrl(senderAvatar)}
                                                        alt=""
                                                        className={styles.avatarImage}
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className={styles.avatarPlaceholder}>
                                                        <FaUserCircle size={24} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className={styles.content}>
                                                <div className={styles.message}>
                                                    <strong>{senderName}</strong> {notification.message}
                                                </div>
                                                <time className={styles.time} dateTime={notification.createdAt}>
                                                    {timeAgo}
                                                </time>
                                            </div>

                                            {!notification.read && <span className={styles.unreadDot} aria-hidden="true" />}
                                        </div>
                                    );
                                })}
                                
                                {hasMore && (
                                    <button
                                        className={styles.loadMoreButton}
                                        onClick={loadMore}
                                        disabled={loading}
                                    >
                                        {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;