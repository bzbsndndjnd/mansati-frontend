// services/userService.ts
// 👤 مسؤول: إدارة المستخدمين مع طبقة أمان وتجديد التوكن - نسخة محدثة
// @version 4.2.0
// @lastUpdated 2026
// متوافق مع: Backend v4 (الكوكيز HttpOnly، دعم refreshToken)

import api from "./api";
import { User } from "@/types/User";
import { secureLog, sanitizeInput, decodeToken } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface LoginResponse {
    user: User;
    accessToken?: string;
    token?: string;
}

export interface SearchUserResult {
    _id: string;
    name: string;
    avatar?: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
}

interface RequestOptions {
    signal?: AbortSignal;
}

// ============================================================================
// دوال مساعدة
// ============================================================================

/**
 * استخراج البيانات من استجابة API
 */
const extractData = <T>(response: any): T => {
    // إذا كانت الاستجابة تحتوي على success → هيكل جديد
    if (response.data?.success === true) {
        return response.data.data;
    }
    // إذا كانت الاستجابة مباشرة → هيكل قديم
    return response.data;
};

/**
 * تخزين التوكن (لتوافق مع الإصدارات القديمة، لكن الأولوية للكوكيز)
 */
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

/**
 * تنظيف التخزين المحلي
 */
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

    /**
     * تسجيل الدخول
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            if (!email || !password) {
                throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
            }

            console.log('🔄 Attempting login...');
            const response = await api.post<LoginResponse>("/auth/login", {
                email: sanitizeInput(email),
                password
            });

            const data = extractData<LoginResponse>(response);
            secureLog.info('تسجيل دخول ناجح');

            // تخزين التوكن احتياطياً (الكوكيز هي الأساس)
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
            throw new Error(error.response?.data?.message || MESSAGES.ERRORS.LOGIN);
        }
    },

    /**
     * تسجيل مستخدم جديد
     */
    async register(userData: { name: string; email: string; password: string }): Promise<LoginResponse> {
        try {
            console.log('🟢 [userService] Registering user:', { email: userData.email });
            const response = await api.post<LoginResponse>("/auth/register", {
                name: sanitizeInput(userData.name),
                email: sanitizeInput(userData.email),
                password: userData.password,
            });

            const data = extractData<LoginResponse>(response);
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

            throw new Error(error.response?.data?.message || MESSAGES.ERRORS.REGISTER);
        }
    },

    /**
     * تسجيل الخروج
     */
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

    /**
     * تجديد التوكن (اختياري)
     */
    async refreshToken(): Promise<{ accessToken: string }> {
        try {
            console.log('🔄 Refreshing token...');
            const response = await api.post('/auth/refresh');
            const data = extractData<{ accessToken: string }>(response);
            
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
    // ✅ دوال جلب المستخدمين (متوافقة مع ProfilePage)
    // ========================================================================

    /**
     * جلب جميع المستخدمين
     */
    async getAllUsers(options?: RequestOptions): Promise<User[]> {
        try {
            console.log('📥 [userService] Fetching all users...');
            const response = await api.get('/users', { signal: options?.signal });
            console.log('📥 [userService] Response:', response.data);

            let users: User[] = [];

            if (response.data?.success === true && Array.isArray(response.data.data)) {
                users = response.data.data;
            } else if (Array.isArray(response.data)) {
                users = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                users = response.data.data;
            }

            console.log(`✅ [userService] Loaded ${users.length} users`);
            return users;
        } catch (error: any) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                console.log('🛑 [userService] Fetch aborted');
                throw error;
            }
            console.error('❌ [userService] Get all users error:', error);
            return [];
        }
    },

    /**
     * البحث عن مستخدمين
     */
    async searchUsers(query: string, options?: RequestOptions): Promise<SearchUserResult[]> {
        try {
            console.log(`🔍 [userService] Searching for: "${query}"`);
            const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`, {
                signal: options?.signal
            });

            let results: SearchUserResult[] = [];

            if (response.data?.success === true && Array.isArray(response.data.data)) {
                results = response.data.data;
            } else if (Array.isArray(response.data)) {
                results = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                results = response.data.data;
            }

            console.log(`✅ [userService] Found ${results.length} users for "${query}"`);
            return results;
        } catch (error: any) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                return [];
            }
            console.error('❌ [userService] Search error:', error);
            return [];
        }
    },

    /**
     * ✅ جلب مستخدم بالمعرف (الاسم المستخدم في ProfilePage: getById)
     */
    async getById(id: string, options?: RequestOptions): Promise<User> {
        try {
            if (!id) throw new Error('معرف المستخدم مطلوب');

            console.log('🔄 Fetching user by ID:', id);
            const response = await api.get(`/users/${id}`, {
                signal: options?.signal
            });

            const user = extractData<User>(response);
            console.log('✅ User fetched successfully:', user);
            return user;
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

    /**
     * ✅ alias لـ getById (احتياطي للتوافق)
     */
    async getUserById(id: string, options?: RequestOptions): Promise<User> {
        return this.getById(id, options);
    },

    // ========================================================================
    // عمليات المستخدمين الفردية
    // ========================================================================

    /**
     * تحديث بيانات المستخدم
     */
    async updateUser(id: string, updates: Partial<User>, options?: RequestOptions): Promise<User> {
        try {
            if (!id) throw new Error('معرف المستخدم مطلوب');

            const sanitizedUpdates: Partial<User> = {};
            if (updates.name) sanitizedUpdates.name = sanitizeInput(updates.name);
            if (updates.email) sanitizedUpdates.email = sanitizeInput(updates.email);
            // لا نسمح بتحديث الحقول الحساسة

            console.log('🔄 Updating user:', id);
            const response = await api.put(`/users/${id}`, sanitizedUpdates, {
                signal: options?.signal
            });

            const user = extractData<User>(response);

            // تحديث التخزين المحلي إذا كان هذا هو المستخدم الحالي
            const currentUser = this.getCurrentUser();
            if (currentUser?._id === id) {
                localStorage.setItem("user", JSON.stringify(user));
            }

            console.log('✅ User updated successfully');
            return user;
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

    /**
     * حذف المستخدم
     */
    async deleteUser(id: string): Promise<void> {
        try {
            if (!id) throw new Error('معرف المستخدم مطلوب');

            console.log('🔄 Deleting user:', id);
            await api.delete(`/users/${id}`);
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

    /**
     * تحديث الصورة الرمزية
     */
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
            const response = await api.put(`/users/${id}/avatar`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const user = extractData<User>(response);

            const currentUser = this.getCurrentUser();
            if (currentUser?._id === id) {
                localStorage.setItem("user", JSON.stringify(user));
            }

            console.log('✅ Avatar updated successfully');
            return user;
        } catch (error: any) {
            console.error('❌ Error updating avatar:', error.response?.data || error.message);
            secureLog.error('فشل تحديث الصورة');
            throw new Error(error.response?.data?.message || error.message || MESSAGES.ERRORS.DEFAULT);
        }
    },

    /**
     * الحصول على المستخدم الحالي من التخزين المحلي
     */
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