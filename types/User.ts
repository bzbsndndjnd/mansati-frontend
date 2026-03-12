// types/User.ts
// 👤 أنواع بيانات المستخدم - نسخة موحدة وكاملة
// @version 5.0.0
// @lastUpdated 2026

// ============================================================================
// الأنواع الأساسية
// ============================================================================

export type UserRole = 'user' | 'moderator' | 'admin';
export type Gender = 'male' | 'female' | 'other';

// ============================================================================
// واجهة المستخدم الرئيسية (كل الحقول إلزامية أو اختيارية بوضوح)
// ============================================================================

export interface User {
  _id: string;
  name: string;
  email: string;                // إلزامي
  role: UserRole;               // إلزامي
  isActive: boolean;            // إلزامي
  avatar?: string;
  coverPhoto?: string;
  avatarPublicId?: string;
  coverPublicId?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  gender?: Gender;
  birthDate?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  lastLogin?: string;
  lastIp?: string;
  loginAttempts?: number;
  lockUntil?: string;
  createdAt: string;            // إلزامي
  updatedAt?: string;
  deletedAt?: string;
}

// ============================================================================
// نوع المستخدم مع حالة المتابعة (يُستخدم في القوائم)
// ============================================================================

export interface UserWithFollow extends User {
  isFollowing: boolean;
  isOnline?: boolean;
}

// ============================================================================
// نتيجة البحث عن مستخدمين (قد يكون لها حقول أقل)
// ============================================================================

export interface SearchUserResult {
  _id: string;
  name: string;
  avatar?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  // يمكن إضافة email إذا كان متوفراً في البحث
  email?: string;
}

// ============================================================================
// دوال تحويل آمنة
// ============================================================================

/**
 * تحويل أي كائن قادم من API إلى كيان User صالح
 */
export function toUser(data: any): User {
  return {
    _id: data?._id || '',
    name: data?.name || '',
    email: data?.email || '',
    role: data?.role || 'user',
    isActive: data?.isActive ?? true,
    avatar: data?.avatar,
    coverPhoto: data?.coverPhoto,
    avatarPublicId: data?.avatarPublicId,
    coverPublicId: data?.coverPublicId,
    bio: data?.bio,
    location: data?.location,
    website: data?.website,
    phone: data?.phone,
    gender: data?.gender,
    birthDate: data?.birthDate,
    followersCount: data?.followersCount || 0,
    followingCount: data?.followingCount || 0,
    postsCount: data?.postsCount || 0,
    isVerified: data?.isVerified ?? false,
    lastLogin: data?.lastLogin,
    lastIp: data?.lastIp,
    loginAttempts: data?.loginAttempts,
    lockUntil: data?.lockUntil,
    createdAt: data?.createdAt || new Date().toISOString(),
    updatedAt: data?.updatedAt,
    deletedAt: data?.deletedAt,
  };
}

/**
 * تحويل مصفوفة من البيانات إلى مصفوفة User
 */
export function toUserArray(data: any[]): User[] {
  if (!Array.isArray(data)) return [];
  return data.map(item => toUser(item));
}

/**
 * تحويل كائن User إلى UserWithFollow (مع إضافة isFollowing و isOnline)
 */
export function toUserWithFollow(user: User, isFollowing: boolean, isOnline: boolean = false): UserWithFollow {
  return {
    ...user,
    isFollowing,
    isOnline,
  };
}

/**
 * تحويل SearchUserResult إلى UserWithFollow (باستخدام بيانات إضافية من User كاملة إذا وجدت)
 */
export function searchResultToUserWithFollow(
  result: SearchUserResult,
  fullUser?: User,
  isFollowing: boolean = false,
  isOnline: boolean = false
): UserWithFollow {
  const base = fullUser || result;
  return {
    _id: result._id,
    name: result.name,
    email: fullUser?.email || result.email || '',
    role: fullUser?.role || 'user',
    isActive: fullUser?.isActive ?? true,
    avatar: result.avatar || fullUser?.avatar,
    coverPhoto: fullUser?.coverPhoto,
    bio: fullUser?.bio,
    location: fullUser?.location,
    website: fullUser?.website,
    phone: fullUser?.phone,
    gender: fullUser?.gender,
    birthDate: fullUser?.birthDate,
    followersCount: result.followersCount ?? fullUser?.followersCount ?? 0,
    followingCount: result.followingCount ?? fullUser?.followingCount ?? 0,
    postsCount: result.postsCount ?? fullUser?.postsCount ?? 0,
    isVerified: fullUser?.isVerified ?? false,
    lastLogin: fullUser?.lastLogin,
    lastIp: fullUser?.lastIp,
    loginAttempts: fullUser?.loginAttempts,
    lockUntil: fullUser?.lockUntil,
    createdAt: fullUser?.createdAt || new Date().toISOString(),
    updatedAt: fullUser?.updatedAt,
    deletedAt: fullUser?.deletedAt,
    isFollowing,
    isOnline,
  };
}