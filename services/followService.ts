// services/followService.ts
// 👥 خدمة المتابعة - إدارة المتابعين - نسخة محسنة مع ApiResponse
// الإصدار: 2.1.0 | آخر تحديث: 2026

import api from "./api";

// ============================================================================
// أنواع البيانات
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

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface FollowUser {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface FollowListResponse {
  data: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// الخدمة
// ============================================================================

const followService = {
  /**
   * متابعة مستخدم
   */
  async followUser(userId: string): Promise<FollowStats> {
    try {
      console.log('👥 [FollowService] Following user:', userId);
      
      const response = await api.post<ApiResponse<FollowStats>>(`/users/${userId}/follow`);
      
      console.log('✅ [FollowService] Follow response:', response.data);
      
      if (!response.data?.success || !response.data.data) {
        throw new Error(response.data?.message || 'فشلت عملية المتابعة');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('❌ [FollowService] Follow error:', error);
      throw error;
    }
  },

  /**
   * إلغاء متابعة مستخدم
   */
  async unfollowUser(userId: string): Promise<FollowStats> {
    try {
      console.log('👥 [FollowService] Unfollowing user:', userId);
      
      const response = await api.delete<ApiResponse<FollowStats>>(`/users/${userId}/follow`);
      
      console.log('✅ [FollowService] Unfollow response:', response.data);
      
      if (!response.data?.success || !response.data.data) {
        throw new Error(response.data?.message || 'فشلت عملية إلغاء المتابعة');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('❌ [FollowService] Unfollow error:', error);
      throw error;
    }
  },

  /**
   * التحقق من حالة المتابعة
   */
  async getFollowStatus(userId: string): Promise<FollowStats> {
    try {
      console.log('👥 [FollowService] Getting follow status for:', userId);
      
      const response = await api.get<ApiResponse<FollowStats>>(`/users/${userId}/follow/status`);
      
      if (!response.data?.success || !response.data.data) {
        throw new Error(response.data?.message || 'فشل في الحصول على حالة المتابعة');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('❌ [FollowService] Get follow status error:', error);
      throw error;
    }
  },

  /**
   * جلب قائمة المتابعين
   */
  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<FollowListResponse> {
    try {
      const response = await api.get<ApiResponse<FollowUser[]>>(`/users/${userId}/followers?page=${page}&limit=${limit}`);
      
      if (!response.data?.success) {
        return { data: [], pagination: { page, limit, total: 0, pages: 0 } };
      }
      
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || { page, limit, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('❌ [FollowService] Get followers error:', error);
      return { data: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  },

  /**
   * جلب قائمة المتابَعين
   */
  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<FollowListResponse> {
    try {
      const response = await api.get<ApiResponse<FollowUser[]>>(`/users/${userId}/following?page=${page}&limit=${limit}`);
      
      if (!response.data?.success) {
        return { data: [], pagination: { page, limit, total: 0, pages: 0 } };
      }
      
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || { page, limit, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('❌ [FollowService] Get following error:', error);
      return { data: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  },

  /**
   * الحصول على حالة المتابعة لمجموعة من المستخدمين دفعة واحدة
   */
  async getBulkFollowStatus(userIds: string[]): Promise<Record<string, boolean>> {
    try {
      const response = await api.post<ApiResponse<Record<string, boolean>>>('/users/follow/bulk-status', { userIds });
      
      if (!response.data?.success || !response.data.data) {
        console.warn('⚠️ [FollowService] Bulk status returned no data');
        return {};
      }
      
      return response.data.data;
    } catch (error) {
      console.error('❌ [FollowService] Bulk status error:', error);
      return {};
    }
  }
};

export default followService;