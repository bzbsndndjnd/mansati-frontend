// services/adminService.ts
// 👑 مسؤول: خدمة لوحة التحكم والمهام الإدارية - نسخة محسنة مع ApiResponse موحد
// @version 3.0.0
// @lastUpdated 2026-03-13

import api from "./api";
import { User } from "@/types/User";
import { secureLog, sanitizeInput, validateDateRange } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";

// ============================================================================
// أنواع البيانات العامة للاستجابة
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// أنواع البيانات الخاصة بالخدمة
// ============================================================================

export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalMessages: number;
  totalNotifications: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newPostsToday: number;
  adminsCount: number;
  usersGrowth: number;
  postsGrowth: number;
}

export interface SystemHealth {
  status: string;
  uptime: number;
  uptimeFormatted: string;
  timestamp: string;
  database: string;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  cpu: {
    user: number;
    system: number;
  };
  nodeVersion: string;
  platform: string;
}

export interface MessagesStats {
  totalMessages: number;
  totalConversations: number;
  unreadMessages: number;
  messagesToday: number;
  activeConversations: number;
}

export interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }>;
  lastMessage?: any;
  unreadCount: number;
  messagesCount: number;
  createdAt?: string;
  updatedAt: string;
}

export interface MessageDetail {
  _id: string;
  sender: { _id: string; name: string; avatar?: string; role: string };
  receiver: { _id: string; name: string; avatar?: string; role: string };
  content: string;
  read: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalMessages: number;
    totalNotifications: number;
    activeUsersToday: number;
    newUsersToday: number;
    newPostsToday: number;
  };
  trends: {
    usersGrowth: number;
    postsGrowth: number;
    messagesGrowth: number;
  };
  charts: {
    contentDistribution: Array<{ name: string; value: number }>;
    dailyActiveUsers: Array<{ date: string; count: number }>;
  };
  systemHealth: {
    status: string;
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

// ============================================================================
// أنواع الباراميترات للطلبات
// ============================================================================

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}

export interface GetConversationsParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================================================
// دوال مساعدة
// ============================================================================

/**
 * استخراج البيانات من استجابة API بشكل آمن
 */
const extractData = <T>(response: any, defaultValue: T): T => {
  if (!response) return defaultValue;

  // هيكل { success: true, data: [...] }
  if (response?.success === true && response.data !== undefined) {
    return response.data as T;
  }

  // استجابة مباشرة كمصفوفة أو كائن
  if (Array.isArray(response) || (typeof response === 'object' && response !== null)) {
    return response as T;
  }

  secureLog.warn('Unexpected response structure', response);
  return defaultValue;
};

const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

// ============================================================================
// خدمة الأدمن
// ============================================================================

const adminService = {
  // ========================================================================
  // ✅ بيانات المدير الحالي
  // ========================================================================

  async getCurrentAdmin(): Promise<User> {
    try {
      secureLog.info('👑 [adminService] Fetching current admin profile...');
      const response = await api.get<ApiResponse<User>>('/admin/profile');
      const admin = extractData<User>(response.data, null as any);
      if (!admin) throw new Error('استجابة غير صالحة من الخادم');
      secureLog.info(`✅ Admin profile loaded: ${admin.email}`);
      return admin;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get current admin error', { message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ إحصائيات لوحة التحكم
  // ========================================================================

  async getStats(): Promise<DashboardStats> {
    try {
      secureLog.info('📊 [adminService] Fetching stats...');
      const response = await api.get<ApiResponse<DashboardStats>>('/admin/stats');
      const stats = extractData<DashboardStats>(response.data, null as any);
      if (!stats) throw new Error('استجابة غير صالحة من الخادم');
      secureLog.info('✅ Stats loaded');
      return stats;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get stats error', { message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  async getAnalytics(params?: AnalyticsParams): Promise<AnalyticsData> {
    try {
      secureLog.info('📈 [adminService] Fetching analytics...');
      
      if (params?.startDate && params?.endDate) {
        if (!validateDateRange(params.startDate, params.endDate)) {
          throw new Error('نطاق التواريخ غير صالح');
        }
      }

      const queryString = buildQueryString({
        startDate: params?.startDate,
        endDate: params?.endDate
      });

      const response = await api.get<ApiResponse<AnalyticsData>>(`/admin/analytics${queryString}`);
      const analytics = extractData<AnalyticsData>(response.data, null as any);
      if (!analytics) throw new Error('استجابة غير صالحة من الخادم');
      secureLog.info('✅ Analytics loaded');
      return analytics;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get analytics error', { message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ المستخدمين (إداري)
  // ========================================================================

  async getRecentUsers(limit: number = 5): Promise<User[]> {
    try {
      secureLog.info(`👥 [adminService] Fetching recent ${limit} users...`);
      const response = await api.get<ApiResponse<User[]>>(`/admin/users/recent?limit=${limit}`);
      const users = extractData<User[]>(response.data, []);
      secureLog.info(`✅ Loaded ${users.length} recent users`);
      return users;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get recent users error', { message: error.message });
      return [];
    }
  },

  async getUsers(params: GetUsersParams = {}): Promise<{ data: User[]; pagination: any }> {
    try {
      const queryString = buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search ? sanitizeInput(params.search) : undefined,
        role: params.role,
        isActive: params.isActive
      });

      secureLog.info('📋 [adminService] Fetching users...');
      const response = await api.get<ApiResponse<User[]>>(`/admin/users${queryString}`);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        return {
          data: response.data.data,
          pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
        };
      }
      return { data: [], pagination: {} };
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get users error', { message: error.message });
      return { data: [], pagination: {} };
    }
  },

  async updateUser(userId: string, updates: { role?: string; isActive?: boolean }): Promise<User> {
    try {
      if (!userId) throw new Error('معرف المستخدم مطلوب');
      secureLog.info(`✏️ [adminService] Updating user ${userId}...`);
      const response = await api.put<ApiResponse<User>>(`/admin/users/${userId}`, updates);
      const user = extractData<User>(response.data, null as any);
      if (!user) throw new Error('استجابة غير صالحة من الخادم');
      secureLog.info('✅ User updated');
      return user;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Update user error', { userId, message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId) throw new Error('معرف المستخدم مطلوب');
      secureLog.info(`🗑️ [adminService] Deleting user ${userId}...`);
      const response = await api.delete<ApiResponse<null>>(`/admin/users/${userId}`);
      if (!response.data?.success) {
        throw new Error('فشل حذف المستخدم');
      }
      secureLog.info('✅ User deleted');
    } catch (error: any) {
      secureLog.error('❌ [adminService] Delete user error', { userId, message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ المنشورات (إداري)
  // ========================================================================

  async getRecentPosts(limit: number = 5): Promise<any[]> {
    try {
      secureLog.info(`📝 [adminService] Fetching recent ${limit} posts...`);
      const response = await api.get<ApiResponse<any[]>>(`/admin/posts/recent?limit=${limit}`);
      const posts = extractData<any[]>(response.data, []);
      secureLog.info(`✅ Loaded ${posts.length} recent posts`);
      return posts;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get recent posts error', { message: error.message });
      return [];
    }
  },

  async getPosts(params: GetPostsParams = {}): Promise<{ data: any[]; pagination: any }> {
    try {
      const queryString = buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search ? sanitizeInput(params.search) : undefined,
        userId: params.userId
      });

      secureLog.info('📋 [adminService] Fetching posts...');
      const response = await api.get<ApiResponse<any[]>>(`/admin/posts${queryString}`);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        return {
          data: response.data.data,
          pagination: response.data.pagination || {}
        };
      }
      return { data: [], pagination: {} };
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get posts error', { message: error.message });
      return { data: [], pagination: {} };
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
      if (!postId) throw new Error('معرف المنشور مطلوب');
      secureLog.info(`🗑️ [adminService] Deleting post ${postId}...`);
      const response = await api.delete<ApiResponse<null>>(`/admin/posts/${postId}`);
      if (!response.data?.success) {
        throw new Error('فشل حذف المنشور');
      }
      secureLog.info('✅ Post deleted');
    } catch (error: any) {
      secureLog.error('❌ [adminService] Delete post error', { postId, message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ حالة النظام
  // ========================================================================

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      secureLog.info('💻 [adminService] Fetching system health...');
      const response = await api.get<ApiResponse<SystemHealth>>('/admin/system/health');
      const health = extractData<SystemHealth>(response.data, null as any);
      if (!health) throw new Error('استجابة غير صالحة من الخادم');
      secureLog.info('✅ System health loaded');
      return health;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get system health error', { message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ الرسائل (إداري)
  // ========================================================================

  async getMessagesStats(): Promise<MessagesStats> {
    try {
      secureLog.info('📊 [adminService] Fetching messages stats...');
      const response = await api.get<ApiResponse<MessagesStats>>('/admin/messages/stats');
      const stats = extractData<MessagesStats>(response.data, null as any);
      if (!stats) throw new Error('استجابة غير صالحة من الخادم');
      secureLog.info('✅ Messages stats loaded');
      return stats;
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get messages stats error', { message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  async getAllConversations(params: GetConversationsParams = {}): Promise<{ data: Conversation[]; pagination: any }> {
    try {
      const queryString = buildQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search ? sanitizeInput(params.search) : undefined
      });

      secureLog.info('💬 [adminService] Fetching conversations...');
      const response = await api.get<ApiResponse<Conversation[]>>(`/admin/conversations${queryString}`);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        return {
          data: response.data.data,
          pagination: response.data.pagination || {}
        };
      }
      return { data: [], pagination: {} };
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get conversations error', { message: error.message });
      return { data: [], pagination: {} };
    }
  },

  async getConversationMessages(conversationId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: MessageDetail[]; pagination: any }> {
    try {
      const queryString = buildQueryString({
        page: params.page,
        limit: params.limit
      });

      secureLog.info(`💬 [adminService] Fetching messages for conversation ${conversationId}...`);
      const response = await api.get<ApiResponse<MessageDetail[]>>(`/admin/conversations/${conversationId}/messages${queryString}`);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        return {
          data: response.data.data,
          pagination: response.data.pagination || {}
        };
      }
      return { data: [], pagination: {} };
    } catch (error: any) {
      secureLog.error('❌ [adminService] Get conversation messages error', { conversationId, message: error.message });
      return { data: [], pagination: {} };
    }
  },

  async deleteMessage(messageId: string): Promise<void> {
    try {
      if (!messageId) throw new Error('معرف الرسالة مطلوب');
      secureLog.info(`🗑️ [adminService] Deleting message ${messageId}...`);
      const response = await api.delete<ApiResponse<null>>(`/admin/messages/${messageId}`);
      if (!response.data?.success) {
        throw new Error('فشل حذف الرسالة');
      }
      secureLog.info('✅ Message deleted');
    } catch (error: any) {
      secureLog.error('❌ [adminService] Delete message error', { messageId, message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      if (!conversationId) throw new Error('معرف المحادثة مطلوب');
      secureLog.info(`🗑️ [adminService] Deleting conversation ${conversationId}...`);
      const response = await api.delete<ApiResponse<null>>(`/admin/conversations/${conversationId}`);
      if (!response.data?.success) {
        throw new Error('فشل حذف المحادثة');
      }
      secureLog.info('✅ Conversation deleted');
    } catch (error: any) {
      secureLog.error('❌ [adminService] Delete conversation error', { conversationId, message: error.message });
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  }
};

export default adminService;