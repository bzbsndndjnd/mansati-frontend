// services/messageService.ts
// 💬 مسؤول: إدارة الرسائل مع طبقة أمان - نسخة محسنة بالكامل
// @version 5.3.1
// @lastUpdated 2026

import api from "@/services/api";
import {
  Message,
  Conversation,
  SearchUserResult,
  SendMessageData,
  toMessageArray,
  toConversationArray,
  toMessage,
} from "@/types/Message";
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
// دوال مساعدة للاستجابة
// ============================================================================

/**
 * استخراج البيانات من استجابة API بشكل آمن
 * @param response - الاستجابة الخام
 * @param defaultValue - القيمة الافتراضية إذا فشل الاستخراج
 * @returns البيانات المستخرجة من النوع T
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

// ============================================================================
// خدمة الرسائل (Message Service)
// ============================================================================

const messageService = {
  // ========================================================================
  // المحادثات (Conversations)
  // ========================================================================

  /**
   * جلب محادثة مع مستخدم محدد
   * @param receiverId - معرف المستخدم المستقبل
   * @param options - خيارات إضافية (مثل AbortSignal)
   */
  async getConversation(
    receiverId: string,
    options?: { signal?: AbortSignal }
  ): Promise<Message[]> {
    try {
      secureLog.info('📥 جلب المحادثة', { receiverId });

      // تمرير signal بشكل صحيح إلى Axios مع تحويل النوع (آمن لأن الخاصية signal فقط هي المستخدمة)
      const config = options?.signal ? { signal: options.signal } as any : {};
      const response = await api.get<ApiResponse<Message[]>>(`/messages/conversation/${receiverId}`, config);

      const messages = extractData<Message[]>(response.data, []);
      const safeMessages = toMessageArray(messages);

      return safeMessages;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        throw error;
      }
      secureLog.error('❌ فشل جلب المحادثة');
      return [];
    }
  },

  /**
   * جلب جميع محادثات المستخدم الحالي
   */
  async getUserConversations(): Promise<Conversation[]> {
    try {
      secureLog.info('📥 جلب المحادثات');

      const response = await api.get<ApiResponse<Conversation[]>>(`/messages/user`);

      let rawConversations = extractData<Conversation[]>(response.data, []);

      if (rawConversations.length === 0 && response.data?.data && Array.isArray(response.data.data)) {
        rawConversations = response.data.data;
      }

      const safeConversations = toConversationArray(rawConversations);

      secureLog.info(`✅ تم جلب ${safeConversations.length} محادثة`);
      return safeConversations;
    } catch (error: any) {
      secureLog.error('❌ فشل جلب المحادثات', error);
      return [];
    }
  },

  // ========================================================================
  // الرسائل (Messages)
  // ========================================================================

  /**
   * إرسال رسالة جديدة
   * @param text - نص الرسالة
   * @param receiverId - معرف المستلم
   */
  async sendMessage(text: string, receiverId: string): Promise<Message> {
    try {
      secureLog.info('📤 إرسال رسالة', { receiverId });

      if (text.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
        throw new Error('الرسالة طويلة جداً');
      }

      const payload: SendMessageData = {
        receiver: receiverId,
        text: sanitizeInput(text),
      };

      const response = await api.post<ApiResponse<Message>>(`/messages`, payload);
      const rawMessage = extractData<Message>(response.data, {} as Message);
      const safeMessage = toMessage(rawMessage);

      secureLog.info('✅ تم إرسال الرسالة بنجاح');
      return safeMessage;
    } catch (error: any) {
      secureLog.error('❌ فشل إرسال الرسالة', error);
      throw error;
    }
  },

  /**
   * تحديث حالة قراءة الرسائل من مرسل معين
   * @param senderId - معرف المرسل
   */
  async markMessagesAsRead(senderId: string): Promise<void> {
    try {
      secureLog.info('📥 تحديث حالة القراءة', { senderId });
      await api.patch(`/messages/read/${senderId}`);
    } catch (error: any) {
      secureLog.error('❌ فشل تحديث حالة القراءة', error);
    }
  },

  /**
   * حذف رسالة محددة
   * @param messageId - معرف الرسالة
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      secureLog.info('🗑️ حذف رسالة', { messageId });
      await api.delete(`/messages/${messageId}`);
      secureLog.info('✅ تم حذف الرسالة بنجاح');
    } catch (error: any) {
      secureLog.error('❌ فشل حذف الرسالة', error);
      throw error;
    }
  },

  // ========================================================================
  // البحث (Search)
  // ========================================================================

  /**
   * البحث عن مستخدمين (لإرسال رسالة جديدة)
   * @param query - نص البحث
   * @param options - خيارات إضافية (مثل AbortSignal)
   */
  async searchUsers(
    query: string,
    options?: { signal?: AbortSignal }
  ): Promise<SearchUserResult[]> {
    try {
      secureLog.info('📥 البحث عن مستخدمين', { query });

      if (query.length < 2) return [];

      const config = options?.signal ? { signal: options.signal } as any : {};
      const response = await api.get<ApiResponse<SearchUserResult[]>>(`/users/search?q=${encodeURIComponent(query)}`, config);

      const users = extractData<SearchUserResult[]>(response.data, []);

      secureLog.info(`✅ تم العثور على ${users.length} مستخدم`);
      return users;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        throw error;
      }
      secureLog.error('❌ فشل البحث عن مستخدمين', error);
      return [];
    }
  },

  // ========================================================================
  // إحصائيات (Stats) - للأدمن
  // ========================================================================

  /**
   * جلب إحصائيات الرسائل (للوحة تحكم الأدمن)
   */
  async getMessagesStats(): Promise<{ total: number; unread: number; conversations: number }> {
    try {
      const conversations = await this.getUserConversations();

      const total = conversations.reduce((acc, conv) => acc + (conv.messagesCount || 0), 0);
      const unread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

      return {
        total,
        unread,
        conversations: conversations.length,
      };
    } catch (error) {
      secureLog.error('❌ فشل جلب إحصائيات الرسائل', error);
      return { total: 0, unread: 0, conversations: 0 };
    }
  },
};

export default messageService;