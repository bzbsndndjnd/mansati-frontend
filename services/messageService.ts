// services/messageService.ts
// 💬 مسؤول: إدارة الرسائل مع طبقة أمان - نسخة محدثة
// @version 4.1.0
// @lastUpdated 2026

import api from "@/services/api";
import { Message } from "@/types/Message";
import { SECURITY_CONFIG, MESSAGES } from "@/utils/constants";
import { sanitizeInput, secureLog } from "@/utils/security";

// ============================================================================
// أنواع البيانات (Types)
// ============================================================================

export interface Conversation {
    user: {
        _id: string;
        name: string;
        avatar?: string;
    };
    lastMessage: Message;
    unreadCount: number;
    messagesCount?: number;
}

export interface SearchUserResult {
    _id: string;
    name: string;
    avatar?: string;
}

// ============================================================================
// دوال مساعدة (Helper Functions)
// ============================================================================

/**
 * استخراج البيانات من استجابة API بشكل آمن
 * يدعم الهياكل المختلفة للاستجابة
 */
const extractData = <T>(response: any): T => {
    if (!response) return [] as unknown as T;

    // هيكل { success: true, data: [...] }
    if (response?.success === true && Array.isArray(response.data)) {
        return response.data;
    }

    // استجابة مباشرة كمصفوفة
    if (Array.isArray(response)) {
        return response;
    }

    // هيكل { data: [...] }
    if (response?.data && Array.isArray(response.data)) {
        return response.data;
    }

    // هيكل { conversations: [...] }
    if (response?.conversations && Array.isArray(response.conversations)) {
        return response.conversations;
    }

    secureLog.warn('Unexpected response structure', response);
    return [] as unknown as T;
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
    async getConversation(receiverId: string, options?: { signal?: AbortSignal }): Promise<Message[]> {
        try {
            secureLog.info('📥 جلب المحادثة', { receiverId });

            const response = await api.get(`/messages/conversation/${receiverId}`, {
                signal: options?.signal
            });

            const messages = extractData<Message[]>(response.data);

            // معالجة الرسائل للتأكد من أن المرسل والمستقبل كائنات
            const processedMessages = messages.map(msg => ({
                ...msg,
                sender: typeof msg.sender === 'object'
                    ? msg.sender
                    : { _id: msg.sender, name: 'مستخدم', avatar: null },
                receiver: typeof msg.receiver === 'object'
                    ? msg.receiver
                    : { _id: msg.receiver, name: 'مستخدم', avatar: null }
            }));

            return processedMessages;
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

            const response = await api.get(`/messages/user`);
            let conversations = extractData<Conversation[]>(response.data);

            // إذا كانت البيانات فارغة، نحاول استخراجها من response.data.data
            if (conversations.length === 0 && response.data?.data && Array.isArray(response.data.data)) {
                conversations = response.data.data;
            }

            secureLog.info(`✅ تم جلب ${conversations.length} محادثة`);

            // التأكد من وجود الخصائص المطلوبة
            const processedConversations = conversations.map(conv => ({
                ...conv,
                messagesCount: conv.messagesCount || 0,
                unreadCount: conv.unreadCount || 0
            }));

            return processedConversations;
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

            const response = await api.post(`/messages`, {
                receiver: receiverId,
                text: sanitizeInput(text),
            });

            const message = extractData<Message>(response.data);
            secureLog.info('✅ تم إرسال الرسالة بنجاح');
            return message;
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
    async searchUsers(query: string, options?: { signal?: AbortSignal }): Promise<SearchUserResult[]> {
        try {
            secureLog.info('📥 البحث عن مستخدمين', { query });

            if (query.length < 2) return [];

            const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`, {
                signal: options?.signal
            });

            let users: SearchUserResult[] = [];

            if (response.data?.success === true && Array.isArray(response.data.data)) {
                users = response.data.data;
            } else if (Array.isArray(response.data)) {
                users = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                users = response.data.data;
            }

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
                conversations: conversations.length
            };
        } catch (error) {
            secureLog.error('❌ فشل جلب إحصائيات الرسائل', error);
            return { total: 0, unread: 0, conversations: 0 };
        }
    }
};

export default messageService;