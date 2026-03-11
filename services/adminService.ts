// services/adminService.ts
// 👑 مسؤول: خدمة لوحة التحكم والمهام الإدارية
// @version 1.0.0
// @lastUpdated 2026

import api from "./api";
import { User } from "@/types/User";
import { secureLog, sanitizeInput } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";

// ============================================================================
// أنواع البيانات
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
// دوال مساعدة
// ============================================================================

const extractData = <T>(response: any): T => {
  if (response.data?.success === true) {
    return response.data.data;
  }
  return response.data;
};

// ============================================================================
// خدمة الأدمن
// ============================================================================

const adminService = {
  // ========================================================================
  // ✅ بيانات المدير الحالي
  // ========================================================================

  /**
   * جلب بيانات المدير الحالي (الملف الشخصي)
   */
  async getCurrentAdmin(): Promise<User> {
    try {
      console.log('👑 [adminService] Fetching current admin profile...');
      const response = await api.get('/admin/profile');
      const admin = extractData<User>(response);
      console.log('✅ Admin profile loaded:', admin.email);
      return admin;
    } catch (error: any) {
      console.error('❌ [adminService] Get current admin error:', error);
      secureLog.error('فشل جلب بيانات المدير');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ إحصائيات لوحة التحكم
  // ========================================================================

  /**
   * جلب إحصائيات الموقع
   */
  async getStats(): Promise<DashboardStats> {
    try {
      console.log('📊 [adminService] Fetching stats...');
      const response = await api.get('/admin/stats');
      const stats = extractData<DashboardStats>(response);
      console.log('✅ Stats loaded');
      return stats;
    } catch (error: any) {
      console.error('❌ [adminService] Get stats error:', error);
      secureLog.error('فشل جلب الإحصائيات');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  /**
   * جلب التحليلات المتقدمة
   */
  async getAnalytics(): Promise<AnalyticsData> {
    try {
      console.log('📈 [adminService] Fetching analytics...');
      const response = await api.get('/admin/analytics');
      const analytics = extractData<AnalyticsData>(response);
      console.log('✅ Analytics loaded');
      return analytics;
    } catch (error: any) {
      console.error('❌ [adminService] Get analytics error:', error);
      secureLog.error('فشل جلب التحليلات');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ المستخدمين (إداري)
  // ========================================================================

  /**
   * جلب آخر المستخدمين
   */
  async getRecentUsers(limit: number = 5): Promise<User[]> {
    try {
      console.log(`👥 [adminService] Fetching recent ${limit} users...`);
      const response = await api.get(`/admin/users/recent?limit=${limit}`);
      const users = extractData<User[]>(response);
      console.log(`✅ Loaded ${users.length} recent users`);
      return users;
    } catch (error: any) {
      console.error('❌ [adminService] Get recent users error:', error);
      secureLog.error('فشل جلب المستخدمين');
      return [];
    }
  },

  /**
   * جلب جميع المستخدمين (مع فلترة)
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<{ data: User[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', sanitizeInput(params.search));
      if (params.role) queryParams.append('role', params.role);
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      console.log('📋 [adminService] Fetching users...');
      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      
      if (response.data?.success === true) {
        return {
          data: response.data.data || [],
          pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
        };
      }
      return { data: response.data?.data || [], pagination: {} };
    } catch (error: any) {
      console.error('❌ [adminService] Get users error:', error);
      secureLog.error('فشل جلب المستخدمين');
      return { data: [], pagination: {} };
    }
  },

  /**
   * تحديث مستخدم (دور/حالة)
   */
  async updateUser(userId: string, updates: { role?: string; isActive?: boolean }): Promise<User> {
    try {
      if (!userId) throw new Error('معرف المستخدم مطلوب');
      console.log(`✏️ [adminService] Updating user ${userId}...`);
      const response = await api.put(`/admin/users/${userId}`, updates);
      const user = extractData<User>(response);
      console.log('✅ User updated');
      return user;
    } catch (error: any) {
      console.error('❌ [adminService] Update user error:', error);
      secureLog.error('فشل تحديث المستخدم');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  /**
   * حذف مستخدم
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId) throw new Error('معرف المستخدم مطلوب');
      console.log(`🗑️ [adminService] Deleting user ${userId}...`);
      await api.delete(`/admin/users/${userId}`);
      console.log('✅ User deleted');
    } catch (error: any) {
      console.error('❌ [adminService] Delete user error:', error);
      secureLog.error('فشل حذف المستخدم');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ المنشورات (إداري)
  // ========================================================================

  /**
   * جلب آخر المنشورات
   */
  async getRecentPosts(limit: number = 5): Promise<any[]> {
    try {
      console.log(`📝 [adminService] Fetching recent ${limit} posts...`);
      const response = await api.get(`/admin/posts/recent?limit=${limit}`);
      const posts = extractData<any[]>(response);
      console.log(`✅ Loaded ${posts.length} recent posts`);
      return posts;
    } catch (error: any) {
      console.error('❌ [adminService] Get recent posts error:', error);
      secureLog.error('فشل جلب المنشورات');
      return [];
    }
  },

  /**
   * جلب جميع المنشورات
   */
  async getPosts(params: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
  } = {}): Promise<{ data: any[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', sanitizeInput(params.search));
      if (params.userId) queryParams.append('userId', params.userId);

      console.log('📋 [adminService] Fetching posts...');
      const response = await api.get(`/admin/posts?${queryParams.toString()}`);
      
      if (response.data?.success === true) {
        return {
          data: response.data.data || [],
          pagination: response.data.pagination || {}
        };
      }
      return { data: response.data?.data || [], pagination: {} };
    } catch (error: any) {
      console.error('❌ [adminService] Get posts error:', error);
      secureLog.error('فشل جلب المنشورات');
      return { data: [], pagination: {} };
    }
  },

  /**
   * حذف منشور
   */
  async deletePost(postId: string): Promise<void> {
    try {
      if (!postId) throw new Error('معرف المنشور مطلوب');
      console.log(`🗑️ [adminService] Deleting post ${postId}...`);
      await api.delete(`/admin/posts/${postId}`);
      console.log('✅ Post deleted');
    } catch (error: any) {
      console.error('❌ [adminService] Delete post error:', error);
      secureLog.error('فشل حذف المنشور');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ حالة النظام
  // ========================================================================

  /**
   * جلب حالة النظام
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      console.log('💻 [adminService] Fetching system health...');
      const response = await api.get('/admin/system/health');
      const health = extractData<SystemHealth>(response);
      console.log('✅ System health loaded');
      return health;
    } catch (error: any) {
      console.error('❌ [adminService] Get system health error:', error);
      secureLog.error('فشل جلب حالة النظام');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  // ========================================================================
  // ✅ الرسائل (إداري)
  // ========================================================================

  /**
   * إحصائيات الرسائل
   */
  async getMessagesStats(): Promise<MessagesStats> {
    try {
      console.log('📊 [adminService] Fetching messages stats...');
      const response = await api.get('/admin/messages/stats');
      const stats = extractData<MessagesStats>(response);
      console.log('✅ Messages stats loaded');
      return stats;
    } catch (error: any) {
      console.error('❌ [adminService] Get messages stats error:', error);
      secureLog.error('فشل جلب إحصائيات الرسائل');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  /**
   * جلب جميع المحادثات
   */
  async getAllConversations(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ data: Conversation[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', sanitizeInput(params.search));

      console.log('💬 [adminService] Fetching conversations...');
      const response = await api.get(`/admin/conversations?${queryParams.toString()}`);
      
      if (response.data?.success === true) {
        return {
          data: response.data.data || [],
          pagination: response.data.pagination || {}
        };
      }
      return { data: response.data?.data || [], pagination: {} };
    } catch (error: any) {
      console.error('❌ [adminService] Get conversations error:', error);
      secureLog.error('فشل جلب المحادثات');
      return { data: [], pagination: {} };
    }
  },

  /**
   * جلب رسائل محادثة محددة
   */
  async getConversationMessages(conversationId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: MessageDetail[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      console.log(`💬 [adminService] Fetching messages for conversation ${conversationId}...`);
      const response = await api.get(`/admin/conversations/${conversationId}/messages?${queryParams.toString()}`);
      
      if (response.data?.success === true) {
        return {
          data: response.data.data || [],
          pagination: response.data.pagination || {}
        };
      }
      return { data: response.data?.data || [], pagination: {} };
    } catch (error: any) {
      console.error('❌ [adminService] Get conversation messages error:', error);
      secureLog.error('فشل جلب رسائل المحادثة');
      return { data: [], pagination: {} };
    }
  },

  /**
   * حذف رسالة
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      if (!messageId) throw new Error('معرف الرسالة مطلوب');
      console.log(`🗑️ [adminService] Deleting message ${messageId}...`);
      await api.delete(`/admin/messages/${messageId}`);
      console.log('✅ Message deleted');
    } catch (error: any) {
      console.error('❌ [adminService] Delete message error:', error);
      secureLog.error('فشل حذف الرسالة');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  },

  /**
   * حذف محادثة كاملة
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      if (!conversationId) throw new Error('معرف المحادثة مطلوب');
      console.log(`🗑️ [adminService] Deleting conversation ${conversationId}...`);
      await api.delete(`/admin/conversations/${conversationId}`);
      console.log('✅ Conversation deleted');
    } catch (error: any) {
      console.error('❌ [adminService] Delete conversation error:', error);
      secureLog.error('فشل حذف المحادثة');
      throw new Error(error.response?.data?.message || MESSAGES.ERRORS.DEFAULT);
    }
  }
};

export default adminService;