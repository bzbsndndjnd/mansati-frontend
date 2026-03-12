// app/messages/[userId]/page.tsx
// 💬 صفحة المحادثة الكاملة - نسخة محسنة مع معالجة الأنواع
// @version 2.0.0
// @lastUpdated 2026

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { socketService } from "@/services/socketService";
import messageService from "@/services/messageService";
import userService from "@/services/userService";
import ChatBox from "@/components/messages/ChatBox";
import { Message } from "@/types/Message";
import { Notification } from "@/types/Notification";
import styles from "./page.module.css";

export default function FullChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [receiver, setReceiver] = useState<{ _id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const userId = params?.userId as string;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !userId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const receiverData = await userService.getById(userId);
        setReceiver(receiverData);

        const conversation = await messageService.getConversation(userId);
        setMessages(conversation);

        await messageService.markMessagesAsRead(userId);
      } catch (error) {
        console.error("Failed to load conversation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const handleNewMessage = (message: Message) => {
      console.log("📨 New message received:", message);
      const senderId = message.sender._id;
      if (senderId === userId) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleNewNotification = (notification: Notification) => {
      console.log("🔔 New notification received:", notification);
      setNotifications(prev => [notification, ...prev]);
      
      if (notification.type === "message" && notification.sender?._id === userId) {
        messageService.getConversation(userId).then(conversation => {
          setMessages(conversation);
        });
      }
    };

    socketService.on("new_message", handleNewMessage);
    socketService.on("new_notification", handleNewNotification);

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("new_notification", handleNewNotification);
    };
  }, [user, userId]);

  const handleSendMessage = async (text: string, receiverId: string) => {
    try {
      await messageService.sendMessage(text, receiverId);
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  const handleSearchUser = async (query: string) => {
    try {
      return await messageService.searchUsers(query);
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  };

  const handleSelectReceiver = (id: string) => {
    router.push(`/messages/${id}`);
  };

  const handleRefreshConversation = async (receiverId: string) => {
    try {
      const conversation = await messageService.getConversation(receiverId);
      setMessages(conversation);
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.fullChatPage}>
      <div className={styles.chatHeader}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← رجوع
        </button>
        <h2>{receiver?.name || "المحادثة"}</h2>
        {notifications.length > 0 && (
          <span className={styles.notificationBadge}>
            {notifications.length}
          </span>
        )}
      </div>
      
      <ChatBox
        messages={messages}
        currentUserId={user._id}
        receiverId={userId}
        onSend={handleSendMessage}
        onSearchUser={handleSearchUser}
        onSelectReceiver={handleSelectReceiver}
        onRefreshConversation={handleRefreshConversation}
      />
    </div>
  );
}