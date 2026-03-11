// services/followService.ts
// 👥 خدمة المتابعة - إدارة المتابعين
// الإصدار: 2.0.0 | آخر تحديث: 2026

import api from "./api";

export interface FollowStats {
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
}

export interface FollowResponse {
    success: boolean;
    data: FollowStats;
    message?: string;
}

const followService = {
    /**
     * متابعة مستخدم
     */
    async followUser(userId: string): Promise<FollowStats> {
        try {
            console.log('👥 [FollowService] Following user:', userId);
            
            const response = await api.post<FollowResponse>(`/users/${userId}/follow`);
            
            console.log('✅ [FollowService] Follow response:', response.data);
            
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
            
            const response = await api.delete<FollowResponse>(`/users/${userId}/follow`);
            
            console.log('✅ [FollowService] Unfollow response:', response.data);
            
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
            
            const response = await api.get<FollowResponse>(`/users/${userId}/follow/status`);
            
            return response.data.data;
        } catch (error) {
            console.error('❌ [FollowService] Get follow status error:', error);
            throw error;
        }
    },

    /**
     * جلب قائمة المتابعين
     */
    async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<any> {
        try {
            const response = await api.get(`/users/${userId}/followers?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('❌ [FollowService] Get followers error:', error);
            throw error;
        }
    },

    /**
     * جلب قائمة المتابَعين
     */
    async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<any> {
        try {
            const response = await api.get(`/users/${userId}/following?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('❌ [FollowService] Get following error:', error);
            throw error;
        }
    },

    /**
     * الحصول على إحصائيات المتابعة لمستخدم متعدد (دفعة واحدة)
     */
    async getBulkFollowStatus(userIds: string[]): Promise<Record<string, boolean>> {
        try {
            const response = await api.post('/users/follow/bulk-status', { userIds });
            return response.data.data;
        } catch (error) {
            console.error('❌ [FollowService] Bulk status error:', error);
            return {};
        }
    }
};

export default followService;