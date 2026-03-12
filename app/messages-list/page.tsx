"use client";

// app/messages-list/page.tsx
// 💬 قائمة المحادثات - نسخة محسنة مع معالجة الأنواع
// @version 2.1.0
// @lastUpdated 2026

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import messageService from "@/services/messageService";
import { socketService } from "@/services/socketService";
import { sanitizeImageUrl } from "@/utils/security";
import { Conversation } from "@/types/Message"; // ✅ استيراد النوع الموحد
import styles from "./page.module.css";
import { FaUserCircle } from "react-icons/fa";

export default function MessagesListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        const data = await messageService.getUserConversations();
        setConversations(data); // ✅ البيانات الآن آمنة تماماً
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    const handleNewMessage = () => {
      loadConversations();
    };

    socketService.on("new_message", handleNewMessage);

    return () => {
      socketService.off("new_message", handleNewMessage);
    };
  }, [user]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diff / (1000 * 60));
      const diffHours = Math.floor(diff / (1000 * 60 * 60));
      const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (diffMinutes < 60) {
        return `منذ ${diffMinutes} دقيقة`;
      } else if (diffHours < 24) {
        return `منذ ${diffHours} ساعة`;
      } else {
        return `منذ ${diffDays} يوم`;
      }
    } catch {
      return 'تاريخ غير معروف';
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل المحادثات...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>المحادثات</h1>
      
      {conversations.length === 0 ? (
        <div className={styles.emptyState}>
          <p>لا توجد محادثات بعد</p>
          <button 
            onClick={() => router.push(`/profile/${user?._id}`)}
            className={styles.startButton}
          >
            ابدأ محادثة جديدة
          </button>
        </div>
      ) : (
        <div className={styles.conversationsList}>
          {conversations.map((conv) => {
            const isLastMessageFromMe = conv.lastMessage.sender._id === user?._id;
            
            return (
              <div
                key={conv.user._id}
                className={styles.conversationItem}
                onClick={() => router.push(`/messages/${conv.user._id}`)}
              >
                <div className={styles.avatar}>
                  {conv.user.avatar ? (
                    <img 
                      src={sanitizeImageUrl(conv.user.avatar)} 
                      alt={conv.user.name} 
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      <FaUserCircle size={40} />
                    </div>
                  )}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <h3>{conv.user.name}</h3>
                    <span className={styles.messageTime}>
                      {formatTime(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <div className={styles.messagePreview}>
                    <span className={styles.senderName}>
                      {isLastMessageFromMe ? 'أنت: ' : ''}
                    </span>
                    <p className={styles.lastMessage}>
                      {conv.lastMessage.text}
                    </p>
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className={styles.unreadBadge}>{conv.unreadCount}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}