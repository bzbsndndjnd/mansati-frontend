// services/userService.ts
// 👤 مسؤول: إدارة المستخدمين مع طبقة أمان وتجديد التوكن - نسخة محدثة
// @version 4.4.1
// @lastUpdated 2026

import api from "./api";
import { User, SearchUserResult, toUser, toUserArray } from "@/types/User";
import { secureLog, sanitizeInput, decodeToken } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";

// ============================================================================
// أنواع البيانات (نستخدم الأنواع المستوردة فقط)
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
}

interface LoginResponse {
  user: User;
  accessToken?: string;
  token?: string;
}

interface RequestOptions {
  signal?: AbortSignal;
}

// ============================================================================
// دوال مساعدة
// ============================================================================

const extractData = <T>(response: any, defaultValue: T): T => {
  if (!response) return defaultValue;
  if (response?.success === true && response.data !== undefined) {
    return response.data as T;
  }
  if (Array.isArray(response) || (typeof response === 'object' && response !== null)) {
    return response as T;
  }
  secureLog.warn('Unexpected response structure', response);
  return defaultValue;
};

const storeToken = (token: string) => {
  try {
    sessionStorage.setItem("accessToken", token);
    const payload = decodeToken(token);
    if (payload?.exp) {
      sessionStorage.setItem("token_exp", payload.exp.toString());
    }
    secureLog.info('Token stored in sessionStorage');
  } catch (error) {
    console.error('❌ Error storing token:', error);
  }
};

const clearStorage = () => {
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("token_exp");
  localStorage.removeItem("user");
};

// ============================================================================
// خدمة المستخدمين
// ============================================================================

const userService = {
  // ========================================================================
  // المصادقة
  // ========================================================================

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      if (!email || !password) {
        throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
      }

      console.log('🔄 Attempting login...');
      const response = await api.post<ApiResponse<LoginResponse>>("/auth/login", {
        email: sanitizeInput(email),
        password
      });

      const data = extractData<LoginResponse>(response.data, null as any);
      if (!data) throw new Error('استجابة غير صالحة من الخادم');
      
      secureLog.info('تسجيل دخول ناجح');

      const token = data.accessToken || data.token;
      if (token) {
        storeToken(token);
      } else {
        console.warn('⚠️ No token received from server (cookies will be used)');
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      return data;

    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data || error.message);
      secureLog.error('فشل تسجيل الدخول');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.LOGIN); // ✅ الآن LOGIN موجود
    }
  },

  async register(userData: { name: string; email: string; password: string }): Promise<LoginResponse> {
    try {
      console.log('🟢 [userService] Registering user:', { email: userData.email });
      const response = await api.post<ApiResponse<LoginResponse>>("/auth/register", {
        name: sanitizeInput(userData.name),
        email: sanitizeInput(userData.email),
        password: userData.password,
      });

      const data = extractData<LoginResponse>(response.data, null as any);
      if (!data) throw new Error('استجابة غير صالحة من الخادم');
      
      console.log('🟢 [userService] Register success:', data);

      const token = data.accessToken || data.token;
      if (token) {
        storeToken(token);
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      return data;

    } catch (error: any) {
      console.error('🔴 [userService] Register error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 409) {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      }

      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.REGISTER); // ✅ الآن REGISTER موجود
    }
  },

  async logout(): Promise<void> {
    try {
      console.log('🔄 Attempting logout...');
      await api.post("/auth/logout");
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      secureLog.error('خطأ في تسجيل الخروج');
    } finally {
      clearStorage();
      secureLog.info('تم تسجيل الخروج بنجاح');
    }
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    try {
      console.log('🔄 Refreshing token...');
      const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
      const data = extractData<{ accessToken: string }>(response.data, null as any);
      if (!data) throw new Error('استجابة غير صالحة');
      
      if (data.accessToken) {
        storeToken(data.accessToken);
        console.log('✅ Token refreshed');
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ Refresh token error:', error);
      throw new Error(error.response?.data?.message || 'فشل تجديد التوكن');
    }
  },

  // ========================================================================
  // ✅ دوال جلب المستخدمين
  // ========================================================================

  async getAllUsers(options?: RequestOptions): Promise<User[]> {
    try {
      console.log('📥 [userService] Fetching all users...');
      const config = options?.signal ? { signal: options.signal } as any : {};
      const response = await api.get<ApiResponse<User[]>>('/users', config);
      console.log('📥 [userService] Response:', response.data);

      const users = extractData<User[]>(response.data, []);
      const safeUsers = toUserArray(users);
      console.log(`✅ [userService] Loaded ${safeUsers.length} users`);
      return safeUsers;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('🛑 [userService] Fetch aborted');
        throw error;
      }
      console.error('❌ [userService] Get all users error:', error);
      return [];
    }
  },

  async searchUsers(query: string, options?: RequestOptions): Promise<SearchUserResult[]> {
    try {
      console.log(`🔍 [userService] Searching for: "${query}"`);
      const config = options?.signal ? { signal: options.signal } as any : {};
      const response = await api.get<ApiResponse<SearchUserResult[]>>(`/users/search?q=${encodeURIComponent(query)}`, config);

      const results = extractData<SearchUserResult[]>(response.data, []);

      const safeResults: SearchUserResult[] = results.map(item => ({
        _id: item._id || '',
        name: item.name || '',
        avatar: item.avatar,
        followersCount: item.followersCount || 0,
        followingCount: item.followingCount || 0,
        postsCount: item.postsCount || 0,
        email: item.email,
      }));

      console.log(`✅ [userService] Found ${safeResults.length} users for "${query}"`);
      return safeResults;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return [];
      }
      console.error('❌ [userService] Search error:', error);
      return [];
    }
  },

  async getById(id: string, options?: RequestOptions): Promise<User> {
    try {
      if (!id) throw new Error('معرف المستخدم مطلوب');

      console.log('🔄 Fetching user by ID:', id);
      const config = options?.signal ? { signal: options.signal } as any : {};
      const response = await api.get<ApiResponse<User>>(`/users/${id}`, config);

      const userData = extractData<any>(response.data, null);
      const safeUser = toUser(userData);
      console.log('✅ User fetched successfully:', safeUser.email);
      return safeUser;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('🛑 Fetch aborted for user:', id);
        throw error;
      }

      console.error('❌ Error fetching user:', error.response?.data || error.message);
      secureLog.error('فشل جلب المستخدم');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.NOT_FOUND);
    }
  },

  async getUserById(id: string, options?: RequestOptions): Promise<User> {
    return this.getById(id, options);
  },

  // ========================================================================
  // عمليات المستخدمين الفردية
  // ========================================================================

  async updateUser(id: string, updates: Partial<User>, options?: RequestOptions): Promise<User> {
    try {
      if (!id) throw new Error('معرف المستخدم مطلوب');

      const sanitizedUpdates: Partial<User> = {};
      if (updates.name) sanitizedUpdates.name = sanitizeInput(updates.name);
      if (updates.email) sanitizedUpdates.email = sanitizeInput(updates.email);

      console.log('🔄 Updating user:', id);
      const config = options?.signal ? { signal: options.signal } as any : {};
      const response = await api.put<ApiResponse<User>>(`/users/${id}`, sanitizedUpdates, config);

      const userData = extractData<any>(response.data, null);
      const safeUser = toUser(userData);

      const currentUser = this.getCurrentUser();
      if (currentUser?._id === id) {
        localStorage.setItem("user", JSON.stringify(safeUser));
      }

      console.log('✅ User updated successfully');
      return safeUser;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('🛑 Update aborted for user:', id);
        throw error;
      }
      console.error('❌ Error updating user:', error.response?.data || error.message);
      secureLog.error('فشل تحديث المستخدم');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      if (!id) throw new Error('معرف المستخدم مطلوب');

      console.log('🔄 Deleting user:', id);
      const response = await api.delete<ApiResponse<null>>(`/users/${id}`);
      if (!response.data?.success) {
        throw new Error('فشل حذف المستخدم');
      }
      console.log('✅ User deleted successfully');

      const currentUser = this.getCurrentUser();
      if (currentUser?._id === id) {
        clearStorage();
      }
    } catch (error: any) {
      console.error('❌ Error deleting user:', error.response?.data || error.message);
      secureLog.error('فشل حذف المستخدم');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  async updateAvatar(id: string, file: File): Promise<User> {
    try {
      if (!id) throw new Error('معرف المستخدم مطلوب');
      if (!file) throw new Error('الملف مطلوب');

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مسموح به');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      }

      const formData = new FormData();
      formData.append("avatar", file);

      console.log('🔄 Updating avatar for user:', id);
      const response = await api.put<ApiResponse<User>>(`/users/${id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const userData = extractData<any>(response.data, null);
      const safeUser = toUser(userData);

      const currentUser = this.getCurrentUser();
      if (currentUser?._id === id) {
        localStorage.setItem("user", JSON.stringify(safeUser));
      }

      console.log('✅ Avatar updated successfully');
      return safeUser;
    } catch (error: any) {
      console.error('❌ Error updating avatar:', error.response?.data || error.message);
      secureLog.error('فشل تحديث الصورة');
      throw new Error(error.response?.data?.message || error.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },
};

export default userService;