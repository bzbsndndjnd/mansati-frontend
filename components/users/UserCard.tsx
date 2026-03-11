"use client";

// components/users/UserCard.tsx
// 🃏 بطاقة المستخدم - نسخة محسنة مع دعم التحميل
// الإصدار: 3.0.0 | آخر تحديث: 2026

import { useState, useCallback, memo } from "react";
import { User } from "@/types/User";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUserCircle, 
  faUserPlus, 
  faUserCheck,
  faEnvelope,
  faCalendarAlt,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";
import styles from "./UserCard.module.css";

interface UserCardProps {
  user: User;
  currentUserId?: string;
  onFollow?: (userId: string) => Promise<void>;
  onUnfollow?: (userId: string) => Promise<void>;
  isFollowing?: boolean;
  isLoading?: boolean; // ✅ إضافة خاصية التحميل
  onClick?: () => void;
  showStats?: boolean;
  showEmail?: boolean;
  showJoinDate?: boolean;
}

const UserCard = memo(({
  user,
  currentUserId,
  onFollow,
  onUnfollow,
  isFollowing = false,
  isLoading = false, // ✅ قيمة افتراضية
  onClick,
  showStats = true,
  showEmail = true,
  showJoinDate = true
}: UserCardProps) => {
  const [followLoading, setFollowLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);

  // تحديث الحالة المحلية عند تغير prop
  useState(() => {
    setLocalIsFollowing(isFollowing);
  }, [isFollowing]);

  // معالجة المتابعة/إلغاء المتابعة
  const handleFollowToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // منع تفعيل onClick للبطاقة
    
    if (!user?._id || followLoading || user._id === currentUserId) return;
    
    setFollowLoading(true);
    try {
      if (localIsFollowing) {
        await onUnfollow?.(user._id);
        setLocalIsFollowing(false);
      } else {
        await onFollow?.(user._id);
        setLocalIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [user?._id, localIsFollowing, onFollow, onUnfollow, currentUserId, followLoading]);

  // تنسيق تاريخ الانضمام
  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return "غير متوفر";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ar-EG", {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "غير متوفر";
    }
  };

  // تحديد ما إذا كان يمكن متابعة هذا المستخدم
  const canFollow = !currentUserId || user._id !== currentUserId;
  const showLoading = isLoading || followLoading;

  return (
    <div 
      className={`${styles.userCard} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      role="article"
      aria-label={`بطاقة المستخدم ${user.name}`}
    >
      {/* صورة الغلاف */}
      <div className={styles.coverPhoto}>
        {user.coverPhoto && !imageError ? (
          <img 
            src={user.coverPhoto} 
            alt=""
            className={styles.coverImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
      </div>

      {/* الصورة الرمزية */}
      <div className={styles.avatarContainer}>
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name}
            className={styles.avatar}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement?.classList.add(styles.avatarError);
            }}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <FontAwesomeIcon icon={faUserCircle} />
          </div>
        )}
      </div>

      {/* محتوى البطاقة */}
      <div className={styles.content}>
        {/* اسم المستخدم */}
        <h3 className={styles.userName}>{user.name}</h3>

        {/* البريد الإلكتروني */}
        {showEmail && user.email && (
          <div className={styles.userEmail}>
            <FontAwesomeIcon icon={faEnvelope} className={styles.icon} />
            <span>{user.email}</span>
          </div>
        )}

        {/* تاريخ الانضمام */}
        {showJoinDate && user.createdAt && (
          <div className={styles.joinDate}>
            <FontAwesomeIcon icon={faCalendarAlt} className={styles.icon} />
            <span>انضم في {formatJoinDate(user.createdAt)}</span>
          </div>
        )}

        {/* إحصائيات المستخدم */}
        {showStats && (
          <div className={styles.userStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{user.postsCount || 0}</span>
              <span className={styles.statLabel}>منشورات</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{user.followersCount || 0}</span>
              <span className={styles.statLabel}>متابعون</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{user.followingCount || 0}</span>
              <span className={styles.statLabel}>يتابع</span>
            </div>
          </div>
        )}

        {/* زر المتابعة */}
        {canFollow && (onFollow || onUnfollow) && (
          <button
            onClick={handleFollowToggle}
            disabled={showLoading}
            className={`${styles.followButton} ${localIsFollowing ? styles.following : ''}`}
            aria-label={localIsFollowing ? "إلغاء المتابعة" : "متابعة"}
          >
            {showLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>جاري...</span>
              </>
            ) : localIsFollowing ? (
              <>
                <FontAwesomeIcon icon={faUserCheck} />
                <span>إلغاء المتابعة</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faUserPlus} />
                <span>متابعة</span>
              </>
            )}
          </button>
        )}

        {/* رسالة إذا كان هذا هو المستخدم الحالي */}
        {user._id === currentUserId && (
          <div className={styles.currentUserBadge}>
            هذا أنت
          </div>
        )}
      </div>
    </div>
  );
});

UserCard.displayName = 'UserCard';

export default UserCard;