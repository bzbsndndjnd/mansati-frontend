// services/postService.ts
// 📝 خدمة المنشورات - نسخة محسنة مع ApiResponse واستخراج آمن
// @version 3.0.0
// @lastUpdated 2026

import api from "./api";
import { Post } from "@/types/Post";
import { SECURITY_CONFIG, MESSAGES } from "@/utils/constants";
import { sanitizeInput, secureLog } from "@/utils/security";

// ============================================================================
// أنواع البيانات العامة للاستجابة
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
}

// ============================================================================
// دوال مساعدة
// ============================================================================

/**
 * استخراج البيانات من استجابة API بشكل آمن
 */
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

const validatePostData = (formData: FormData): void => {
  const content = formData.get('content') as string;
  const media = formData.getAll('media') as File[];
  
  if (content && content.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
    throw new Error(`المحتوى يجب أن لا يتجاوز ${SECURITY_CONFIG.MAX_CONTENT_LENGTH} حرف`);
  }
  
  media.forEach(file => {
    if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
      throw new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت');
    }
    
    const isImage = SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = SECURITY_CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type);
    
    if (!isImage && !isVideo) {
      throw new Error('نوع الملف غير مسموح به');
    }
  });
};

// ============================================================================
// خدمة المنشورات
// ============================================================================

const postService = {
  /**
   * جلب جميع المنشورات
   */
  async getAll(): Promise<Post[]> {
    try {
      const response = await api.get<ApiResponse<Post[]>>("/posts");
      const posts = extractData<Post[]>(response.data, []);
      return posts;
    } catch (error: any) {
      secureLog.error('فشل جلب البوستات');
      console.error('❌ Error fetching posts:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: MESSAGES.ERRORS.DEFAULT
      };
    }
  },

  /**
   * جلب منشورات مستخدم محدد
   */
  async getByUser(userId: string): Promise<Post[]> {
    try {
      console.log('📥 Fetching posts for user:', userId);
      const response = await api.get<ApiResponse<Post[]>>(`/posts/user/${userId}`);
      const posts = extractData<Post[]>(response.data, []);
      console.log('✅ Posts fetched:', posts?.length || 0);
      return posts;
    } catch (error: any) {
      secureLog.error('فشل جلب بوستات المستخدم');
      console.error('❌ Error fetching user posts:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: MESSAGES.ERRORS.DEFAULT
      };
    }
  },

  /**
   * إنشاء منشور جديد
   */
  async create(formData: FormData): Promise<Post> {
    try {
      validatePostData(formData);
      
      const content = formData.get('content') as string;
      if (content) {
        formData.set('content', sanitizeInput(content));
      }

      console.log('📤 Creating new post');
      const response = await api.post<ApiResponse<Post>>("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const newPost = extractData<Post>(response.data, null as any);
      if (!newPost) throw new Error('فشل إنشاء المنشور');
      
      console.log('✅ Post created successfully');
      return newPost;
    } catch (error: any) {
      secureLog.error('فشل إنشاء البوست');
      console.error('❌ Error creating post:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: error.message || MESSAGES.ERRORS.DEFAULT
      };
    }
  },

  /**
   * حذف منشور
   */
  async delete(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting post:', id);
      const response = await api.delete<ApiResponse<null>>(`/posts/${id}`);
      if (!response.data?.success) {
        throw new Error('فشل حذف المنشور');
      }
      console.log('✅ Post deleted successfully');
    } catch (error: any) {
      secureLog.error('فشل حذف البوست');
      console.error('❌ Error deleting post:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: MESSAGES.ERRORS.DEFAULT
      };
    }
  },

  /**
   * إضافة تعليق
   */
  async addComment(postId: string, text: string): Promise<Post> {
    try {
      if (text.length > SECURITY_CONFIG.MAX_COMMENT_LENGTH) {
        throw new Error(`التعليق يجب أن لا يتجاوز ${SECURITY_CONFIG.MAX_COMMENT_LENGTH} حرف`);
      }

      console.log('💬 Adding comment to post:', postId);
      const response = await api.post<ApiResponse<Post>>(
        `/posts/${postId}/comment`,
        { text: sanitizeInput(text) }
      );
      
      const updatedPost = extractData<Post>(response.data, null as any);
      if (!updatedPost) throw new Error('فشل إضافة التعليق');
      console.log('✅ Comment added successfully');
      return updatedPost;
    } catch (error: any) {
      secureLog.error('فشل إضافة تعليق');
      console.error('❌ Error adding comment:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: error.message || MESSAGES.ERRORS.DEFAULT
      };
    }
  },

  /**
   * إضافة مشاركة
   */
  async addShare(postId: string): Promise<Post> {
    try {
      console.log('🔄 Sharing post:', postId);
      const response = await api.post<ApiResponse<Post>>(`/posts/${postId}/share`);
      
      const updatedPost = extractData<Post>(response.data, null as any);
      if (!updatedPost) throw new Error('فشل مشاركة المنشور');
      console.log('✅ Post shared successfully');
      return updatedPost;
    } catch (error: any) {
      secureLog.error('فشل مشاركة البوست');
      console.error('❌ Error sharing post:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: MESSAGES.ERRORS.DEFAULT
      };
    }
  },

  /**
   * إضافة تفاعل
   */
  async addReaction(postId: string, type: string): Promise<Post> {
    try {
      console.log('❤️ Adding reaction to post:', postId, 'type:', type);
      const response = await api.post<ApiResponse<Post>>(
        `/posts/${postId}/react`,
        { type }
      );
      
      const updatedPost = extractData<Post>(response.data, null as any);
      if (!updatedPost) throw new Error('فشل إضافة التفاعل');
      console.log('✅ Reaction added successfully');
      return updatedPost;
    } catch (error: any) {
      secureLog.error('فشل إضافة تفاعل');
      console.error('❌ Error adding reaction:', error.response?.data || error.message);
      throw {
        ...error,
        userMessage: MESSAGES.ERRORS.DEFAULT
      };
    }
  },
};

export default postService;