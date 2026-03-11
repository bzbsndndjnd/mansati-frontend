// types/User.ts
// 👤 أنواع بيانات المستخدم - نسخة محسنة بالكامل
// الإصدار: 3.0.0 | آخر تحديث: 2026

export interface User {
  // ========================================================================
  // الحقول الأساسية (Required)
  // ========================================================================
  _id: string;           // معرف فريد للمستخدم
  name: string;          // اسم المستخدم
  email: string;         // البريد الإلكتروني

  // ========================================================================
  // الصور والوسائط (Optional)
  // ========================================================================
  avatar?: string;       // الصورة الرمزية
  coverPhoto?: string;   // ✅ صورة الغلاف (جديد)
  avatarPublicId?: string; // ✅ معرف الصورة في Cloudinary (للحذف)

  // ========================================================================
  // المصادقة والأمان (Optional)
  // ========================================================================
  token?: string;        // توكن المصادقة
  role?: 'user' | 'admin' | 'moderator'; // صلاحيات المستخدم
  isActive?: boolean;    // حالة الحساب (نشط/معطل)
  isVerified?: boolean;  // ✅ هل البريد الإلكتروني مؤكد؟ (جديد)
  lastLogin?: string;    // آخر تسجيل دخول
  lastIp?: string;       // ✅ آخر IP (جديد)

  // ========================================================================
  // إحصائيات المتابعة (NEW) - مهمة جداً للمتابعة
  // ========================================================================
  followersCount?: number;   // ✅ عدد المتابعين
  followingCount?: number;   // ✅ عدد الذين يتابعهم
  postsCount?: number;       // ✅ عدد المنشورات
  friendsCount?: number;     // ✅ عدد الأصدقاء (اختياري)

  // ========================================================================
  // العلاقات (Relations)
  // ========================================================================
  followers?: User[];        // ✅ قائمة المتابعين (للـ populate)
  following?: User[];        // ✅ قائمة المتابَعين (للـ populate)
  
  // ========================================================================
  // معلومات إضافية (Optional)
  // ========================================================================
  bio?: string;           // ✅ نبذة عن المستخدم
  location?: string;      // ✅ الموقع
  website?: string;       // ✅ الموقع الشخصي
  phone?: string;         // ✅ رقم الهاتف
  gender?: 'male' | 'female' | 'other'; // ✅ الجنس
  birthDate?: string;     // ✅ تاريخ الميلاد

  // ========================================================================
  // التواريخ (Timestamps)
  // ========================================================================
  createdAt?: string;     // تاريخ الإنشاء
  updatedAt?: string;     // آخر تحديث
  deletedAt?: string;     // ✅ تاريخ الحذف (للحسابات المحذوفة)
}

// ========================================================================
// أنواع مساعدة (Utility Types)
// ========================================================================

/**
 * بيانات المستخدم للتحديث (كل الحقول اختيارية)
 */
export interface UserUpdateData {
  name?: string;
  email?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
}

/**
 * بيانات المستخدم للتسجيل
 */
export interface UserRegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

/**
 * بيانات تسجيل الدخول
 */
export interface UserLoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * حالة المتابعة
 */
export interface FollowStatus {
  isFollowing: boolean;      // هل يتابع المستخدم الحالي هذا المستخدم؟
  followersCount: number;    // عدد المتابعين
  followingCount: number;    // عدد المتابَعين
}

/**
 * إحصائيات المستخدم
 */
export interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  friendsCount?: number;
}

/**
 * نتائج البحث عن مستخدمين
 */
export interface UserSearchResult {
  _id: string;
  name: string;
  avatar?: string;
  email?: string;
  followersCount?: number;
  isFollowing?: boolean;
}

// ========================================================================
// دوال مساعدة (Helper Functions)
// ========================================================================

/**
 * التحقق من أن المستخدم هو مسؤول
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * التحقق من أن المستخدم هو مشرف
 */
export function isModerator(user: User | null): boolean {
  return user?.role === 'moderator' || user?.role === 'admin';
}

/**
 * التحقق من أن المستخدم نشط
 */
export function isActiveUser(user: User | null): boolean {
  return user?.isActive !== false;
}

/**
 * الحصول على اسم المستخدم للعرض (معالجة القيم الفارغة)
 */
export function getDisplayName(user: User | null): string {
  if (!user) return 'مستخدم';
  return user.name || 'مستخدم';
}

/**
 * الحصول على الصورة الرمزية للمستخدم (معالجة القيم الفارغة)
 */
export function getUserAvatar(user: User | null): string | null {
  if (!user) return null;
  return user.avatar || null;
}

/**
 * تنسيق تاريخ انضمام المستخدم
 */
export function formatJoinDate(user: User | null): string {
  if (!user?.createdAt) return 'غير معروف';
  
  try {
    const date = new Date(user.createdAt);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'غير معروف';
  }
}

/**
 * التحقق من اكتمال ملف المستخدم
 */
export function isProfileComplete(user: User | null): boolean {
  if (!user) return false;
  
  // الحقول الأساسية المطلوبة
  const requiredFields = {
    hasName: !!user.name,
    hasEmail: !!user.email,
    hasAvatar: !!user.avatar,
    hasBio: !!user.bio,
    hasLocation: !!user.location
  };
  
  // يمكن تعديل هذه النسبة حسب متطلبات التطبيق
  const completedFields = Object.values(requiredFields).filter(Boolean).length;
  const totalFields = Object.keys(requiredFields).length;
  
  return completedFields >= Math.ceil(totalFields / 2); // 50% على الأقل
}

// ========================================================================
// ثوابت (Constants)
// ========================================================================

/**
 * صلاحيات المستخدم المتاحة
 */
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
} as const;

/**
 * أنواع المستخدمين للفلترة
 */
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * ألوان الصلاحيات (للواجهة)
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  user: '#6b7280',      // رمادي
  moderator: '#f59e0b',  // برتقالي
  admin: '#ef4444'       // أحمر
};

/**
 * أسماء الصلاحيات بالعربية
 */
export const ROLE_NAMES: Record<UserRole, string> = {
  user: 'مستخدم',
  moderator: 'مشرف',
  admin: 'مسؤول'
};