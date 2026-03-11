// config/constants.ts
// ⚙️ مسؤول: الثوابت والإعدادات العامة

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
    LOGIN: 5, // 5 محاولات
    REGISTER: 3, // 3 محاولات
    POST: 10, // 10 منشورات في الساعة
    COMMENT: 20, // 20 تعليق في الساعة
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
  },
  SUCCESS: {
    LOGIN: 'تم تسجيل الدخول بنجاح',
    REGISTER: 'تم إنشاء الحساب بنجاح',
    POST_CREATED: 'تم إنشاء المنشور بنجاح',
    POST_DELETED: 'تم حذف المنشور بنجاح',
    COMMENT_ADDED: 'تم إضافة التعليق بنجاح',
  },
};