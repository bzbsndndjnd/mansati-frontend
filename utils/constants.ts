// utils/constants.ts
// ⚙️ مسؤول: الثوابت والإعدادات العامة
// @version 2.0.0
// @lastUpdated 2026

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

export const SECURITY_CONFIG = {
  MAX_CONTENT_LENGTH: 5000,
  MAX_COMMENT_LENGTH: 500,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  RATE_LIMIT: {
    LOGIN: 5,
    REGISTER: 3,
    POST: 10,
    COMMENT: 20,
  },
};

export const MESSAGES = {
  ERRORS: {
    NETWORK: 'حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت',
    UNAUTHORIZED: 'يجب تسجيل الدخول أولاً',
    FORBIDDEN: 'لا تملك صلاحية للقيام بهذا الإجراء',
    NOT_FOUND: 'العنصر المطلوب غير موجود',
    VALIDATION: 'البيانات المدخلة غير صالحة',
    SERVER: 'حدث خطأ في الخادم. حاول مرة أخرى لاحقاً',
    DEFAULT: 'حدث خطأ غير متوقع',
    LOGIN: 'فشل تسجيل الدخول. تحقق من بريدك الإلكتروني وكلمة المرور', // ✅ إضافة
    REGISTER: 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى', // ✅ إضافة
  },
  SUCCESS: {
    LOGIN: 'تم تسجيل الدخول بنجاح',
    REGISTER: 'تم إنشاء الحساب بنجاح',
    POST_CREATED: 'تم إنشاء المنشور بنجاح',
    POST_DELETED: 'تم حذف المنشور بنجاح',
    COMMENT_ADDED: 'تم إضافة التعليق بنجاح',
  },
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};