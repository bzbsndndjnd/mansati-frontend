// services/api.ts
// 🌐 مسؤول: تكوين API مع طبقة أمان وتجديد التوكن
// @version 4.2.0 - تعتمد كلياً على HttpOnly Cookies

import axios from 'axios';
import { API_CONFIG, MESSAGES } from '@/utils/constants';
import { secureLog } from '@/utils/security';

// ============================================================================
// واجهة الاستجابة الموحدة لجميع الخدمات
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore?: boolean;
  };
}

// ============================================================================
// إنشاء كائن axios
// ============================================================================

const api = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/api`,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true, // ✅ ضروري لإرسال واستقبال الكوكيز
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ============================================================================
// إدارة طلبات التجديد المعلقة
// ============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ============================================================================
// Interceptors
// ============================================================================

api.interceptors.request.use(
  (config) => {
    secureLog.info(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    secureLog.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      secureLog.error('🌐 Network error:', error);
      return Promise.reject({
        message: error.message,
        userMessage: MESSAGES.ERRORS.NETWORK,
        isNetworkError: true,
      });
    }

    if (error.response.status !== 401) {
      let userMessage = MESSAGES.ERRORS.DEFAULT;
      switch (error.response.status) {
        case 400:
          userMessage = error.response.data?.message || MESSAGES.ERRORS.VALIDATION;
          break;
        case 403:
          userMessage = MESSAGES.ERRORS.FORBIDDEN;
          break;
        case 404:
          userMessage = MESSAGES.ERRORS.NOT_FOUND;
          break;
        case 429:
          userMessage = 'محاولات كثيرة جداً. حاول بعد قليل';
          break;
        case 500:
          userMessage = MESSAGES.ERRORS.SERVER;
          break;
      }
      return Promise.reject({
        status: error.response.status,
        data: error.response.data,
        userMessage,
      });
    }

    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject({
        message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
        userMessage: MESSAGES.ERRORS.UNAUTHORIZED,
      });
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        secureLog.log('🔄 محاولة تجديد التوكن عبر /auth/refresh...');
        await axios.post(
          `${API_CONFIG.BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        secureLog.log('✅ تم تجديد التوكن بنجاح');
        processQueue(null, null);

        return api(originalRequest);
      } catch (refreshError) {
        secureLog.error('❌ فشل تجديد التوكن', refreshError);
        processQueue(refreshError, null);

        return Promise.reject({
          message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
          userMessage: MESSAGES.ERRORS.UNAUTHORIZED,
          requiresLogin: true,
        });
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;