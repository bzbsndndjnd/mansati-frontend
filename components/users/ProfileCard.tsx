"use client";

// 👤 ProfileCard.tsx
// مسؤول: عرض بطاقة الملف الشخصي مع العدادات والمتابعة
// الإصدار: 4.1.0 | آخر تحديث: 2026
// المميزات:
// - عرض إحصائيات المستخدم (منشورات، متابعون، يتابع)
// - رفع الصور مع معاينة فورية
// - دعم كامل للمتابعة وإلغاء المتابعة
// - أمان عالي مع معالجة الأخطاء

import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { User } from "@/types/User";
import userService from "@/services/userService";
import followService from "@/services/followService"; // ✅ إضافة خدمة المتابعة
import styles from "./ProfileCard.module.css";
import { AuthContext } from "@/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUserCircle, 
  faCamera, 
  faUserPlus, 
  faUserCheck,
  faSpinner 
} from "@fortawesome/free-solid-svg-icons";

interface ProfileCardProps {
    user: User;
    isCurrentUser?: boolean;
    onAvatarUpdated?: (user: User) => void;
    onFollow?: (userId: string) => Promise<void>;
    onUnfollow?: (userId: string) => Promise<void>;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    isFollowing?: boolean;
}

export default function ProfileCard({ 
    user, 
    isCurrentUser, 
    onAvatarUpdated,
    onFollow,
    onUnfollow,
    followersCount = 0,
    followingCount = 0,
    postsCount = 0,
    isFollowing = false
}: ProfileCardProps) {
    const { setUser } = useContext(AuthContext)!;
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [fileName, setFileName] = useState<string>("لم يتم اختيار ملف");
    const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
    const [localFollowersCount, setLocalFollowersCount] = useState(followersCount);

    // تحديث الحالة المحلية عند تغير props
    useEffect(() => {
        setLocalIsFollowing(isFollowing);
        setLocalFollowersCount(followersCount);
    }, [isFollowing, followersCount]);

    // ✅ دالة محسنة لبناء الرابط الكامل للصورة
    const buildFullUrl = useCallback((path: string): string => {
        if (!path) return "";
        
        if (path.startsWith('http')) {
            return path;
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        
        let cleanPath = path;
        
        if (cleanPath.startsWith('/uploads/')) {
            cleanPath = cleanPath;
        }
        else if (cleanPath.startsWith('/')) {
            cleanPath = `/uploads${cleanPath}`;
        }
        else {
            cleanPath = `/uploads/${cleanPath}`;
        }
        
        return `${baseUrl}${cleanPath}?t=${Date.now()}`;
    }, []);

    // ✅ تحديث المعاينة عند تغير user prop
    useEffect(() => {
        console.log('🖼️ ProfileCard received user avatar:', user?.avatar);
        if (user?.avatar) {
            const fullUrl = buildFullUrl(user.avatar);
            console.log('🖼️ Setting preview to:', fullUrl);
            setPreview(fullUrl);
            setFileName(user.avatar.split("/").pop() || "");
        } else {
            setPreview(null);
            setFileName("لم يتم اختيار ملف");
        }
    }, [user, buildFullUrl]);

    // ✅ معالجة رفع الصورة
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) {
            setFileName("لم يتم اختيار ملف");
            return;
        }

        const file = e.target.files[0];
        
        // ✅ التحقق من حجم الملف (أقل من 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('الملف كبير جداً. الحد الأقصى 5 ميجابايت');
            return;
        }

        // ✅ التحقق من نوع الملف
        if (!file.type.startsWith('image/')) {
            alert('يرجى اختيار صورة فقط');
            return;
        }

        setFileName(file.name);

        // ✅ معاينة مؤقتة
        const tempPreview = URL.createObjectURL(file);
        setPreview(tempPreview);

        try {
            setLoading(true);

            console.log('📤 Uploading avatar for user:', user._id);
            const updatedUser = await userService.updateAvatar(user._id, file);
            console.log('✅ Avatar updated response:', updatedUser);

            // ✅ تحديث AuthContext
            setUser(updatedUser);

            // ✅ إعلام الصفحة الأم (ProfilePage) بالتحديث
            if (onAvatarUpdated) {
                onAvatarUpdated(updatedUser);
            }

            // ✅ تحديث المعاينة بالصورة الجديدة
            if (updatedUser.avatar) {
                const newPreview = buildFullUrl(updatedUser.avatar);
                setPreview(newPreview);
                setFileName(updatedUser.avatar.split("/").pop() || file.name);
            }

            // ✅ تنظيف المعاينة المؤقتة
            URL.revokeObjectURL(tempPreview);

        } catch (error) {
            console.error("❌ فشل رفع الصورة:", error);
            
            // ✅ العودة للصورة القديمة في حالة الخطأ
            if (user.avatar) {
                setPreview(buildFullUrl(user.avatar));
                setFileName(user.avatar.split("/").pop() || "لم يتم اختيار ملف");
            } else {
                setPreview(null);
                setFileName("لم يتم اختيار ملف");
            }
        } finally {
            setLoading(false);
        }
    }, [user, setUser, onAvatarUpdated, buildFullUrl]);

    // ✅ معالجة المتابعة/إلغاء المتابعة
    const handleFollowToggle = useCallback(async () => {
        if (!user?._id || followLoading || isCurrentUser) return;
        
        setFollowLoading(true);
        try {
            if (localIsFollowing) {
                // ✅ إلغاء المتابعة
                if (onUnfollow) {
                    await onUnfollow(user._id);
                } else {
                    await followService.unfollowUser(user._id);
                }
                setLocalIsFollowing(false);
                setLocalFollowersCount(prev => Math.max(0, prev - 1));
            } else {
                // ✅ متابعة
                if (onFollow) {
                    await onFollow(user._id);
                } else {
                    await followService.followUser(user._id);
                }
                setLocalIsFollowing(true);
                setLocalFollowersCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('❌ Follow toggle error:', error);
        } finally {
            setFollowLoading(false);
        }
    }, [user?._id, localIsFollowing, onFollow, onUnfollow, isCurrentUser, followLoading]);

    // ✅ قيم محسوبة
    const canFollow = useMemo(() => 
        !isCurrentUser && (onFollow || onUnfollow), 
        [isCurrentUser, onFollow, onUnfollow]
    );

    return (
        <div className={styles.profileCard}>
            {/* صورة الغلاف */}
            <div className={styles.coverPhoto}>
                {!isCurrentUser && canFollow && (
                    <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`${styles.coverFollowButton} ${localIsFollowing ? styles.following : ''}`}
                        aria-label={localIsFollowing ? "إلغاء المتابعة" : "متابعة"}
                    >
                        {followLoading ? (
                            <FontAwesomeIcon icon={faSpinner} spin />
                        ) : localIsFollowing ? (
                            <>
                                <FontAwesomeIcon icon={faUserCheck} />
                                <span>متابَع</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faUserPlus} />
                                <span>متابعة</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            
            <div className={styles.profileInfo}>
                {/* الصورة الرمزية */}
                <div className={styles.avatarContainer}>
                    {preview ? (
                        <img
                            src={preview}
                            alt={user.name}
                            className={styles.avatar}
                            loading="lazy"
                            onError={(e) => {
                                console.error('❌ Failed to load image:', preview);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                
                                const parent = target.parentElement;
                                if (parent) {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = styles.avatarPlaceholder;
                                    parent.appendChild(placeholder);
                                }
                            }}
                        />
                    ) : (
                        <div className={styles.avatarPlaceholder}>
                            <FontAwesomeIcon icon={faUserCircle} className={styles.avatarIcon} />
                        </div>
                    )}

                    {/* زر رفع الصورة - يظهر فقط للمستخدم الحالي */}
                    {isCurrentUser && (
                        <label className={`${styles.uploadLabel} ${loading ? styles.uploading : ''}`}>
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    <span>جاري الرفع...</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faCamera} />
                                    <span>تغيير الصورة</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={loading}
                                style={{ display: "none" }}
                            />
                        </label>
                    )}
                </div>

                {/* اسم المستخدم */}
                <h1 className={styles.userName}>{user.name}</h1>
                
                {/* البريد الإلكتروني */}
                {user.email && (
                    <p className={styles.userEmail}>{user.email}</p>
                )}

                {/* زر المتابعة للموبايل - يظهر فقط للمستخدمين الآخرين */}
                {!isCurrentUser && canFollow && (
                    <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`${styles.mobileFollowButton} ${localIsFollowing ? styles.following : ''}`}
                    >
                        {followLoading ? (
                            <FontAwesomeIcon icon={faSpinner} spin />
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

                {/* إحصائيات المستخدم */}
                <div className={styles.userStats}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{postsCount}</span>
                        <span className={styles.statLabel}>منشورات</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{localFollowersCount}</span>
                        <span className={styles.statLabel}>متابعون</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{followingCount}</span>
                        <span className={styles.statLabel}>يتابع</span>
                    </div>
                </div>

                {/* معلومات إضافية */}
                <div className={styles.userDetails}>
                    <p className={styles.userInfo}>
                        <strong>البريد الإلكتروني:</strong> {user.email}
                    </p>

                    <p className={styles.userInfo}>
                        <strong>تاريخ الانضمام:</strong>{" "}
                        {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("ar-EG", {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })
                            : "غير متوفر"}
                    </p>
                </div>

                {/* اسم الملف (للتشخيص) */}
                {isCurrentUser && (
                    <p className={styles.fileName}>
                        {fileName === "لم يتم اختيار ملف" ? (
                            <>
                                <FontAwesomeIcon icon={faUserCircle} style={{ marginRight: "6px", color: "#007bff" }} />
                                {fileName}
                            </>
                        ) : (
                            fileName
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}