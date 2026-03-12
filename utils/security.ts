// utils/security.ts
// 🛡️ مسؤول: أدوات الأمان والتحقق - محدث ومتوافق مع الاستخدامات الحالية
// @version 2.1.0
// @lastUpdated 2026

/**
 * تنظيف المدخلات النصية من الأكواد الخبيثة
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .trim();
};

/**
 * تنظيف وتعقيم روابط الصور والملفات
 */
export const sanitizeImageUrl = (path: string): string => {
  if (!path) return '';
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov'];
  
  try {
    if (path.startsWith('http')) {
      const url = new URL(path);
      const allowedDomains = ['localhost', '127.0.0.1', 'yourdomain.com'];
      if (!allowedDomains.includes(url.hostname)) {
        console.warn('⚠️ محاولة استخدام رابط خارجي غير مسموح');
        return '/default-avatar.png';
      }
      
      const ext = url.pathname.substring(url.pathname.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return '/default-avatar.png';
      }
      
      return url.toString();
    }
    
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return '/default-avatar.png';
    }
    
    const cleanPath = path.startsWith('/') ? path : `/uploads/${path}`;
    return `${baseUrl}${cleanPath}`;
    
  } catch {
    return '/default-avatar.png';
  }
};

/**
 * فك تشفير JWT token
 */
export const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('❌ Error decoding token:', error);
    return null;
  }
};

/**
 * التحقق من صلاحية التوكن
 */
export const isTokenValid = (token: string): boolean => {
  try {
    const payload = decodeToken(token);
    if (!payload?.exp) return false;
    
    const exp = payload.exp * 1000; // تحويل إلى ملي ثانية
    return Date.now() < exp;
  } catch {
    return false;
  }
};

/**
 * تسجيل آمن (بدون كشف معلومات حساسة) - متوافق مع الاستخدامات الحالية
 */
export const secureLog = {
  log: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LOG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`ℹ️ ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️ ${message}`, ...args);
  }
};

/**
 * التحقق من صيغة JWT
 */
export const isValidToken = (token: string): boolean => {
  if (!token) return false;
  if (token.length < 10) return false;
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * إنشاء CSRF Token
 */
export const generateCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * التحقق من صحة نطاق التواريخ
 * @param startDate تاريخ البداية
 * @param endDate تاريخ النهاية
 * @returns boolean صحيح إذا كان النطاق صالحاً
 */
export const validateDateRange = (startDate: string, endDate: string): boolean => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // التحقق من صحة التاريخين
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    // تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية
    if (start > end) {
      return false;
    }
    
    // منع النطاقات الكبيرة جداً (أكثر من سنة واحدة)
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYearInMs) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};