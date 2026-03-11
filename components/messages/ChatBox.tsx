// 💬 ChatBox.tsx
// مسؤول: صندوق المحادثة مع دعم كامل للرسائل والإشعارات والروابط التشعبية (بدون مكتبات)
// الإصدار: 5.2.0 | آخر تحديث: 2026

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Message } from "@/types/Message";
import { socketService } from "@/services/socketService";
import { sanitizeInput, secureLog, sanitizeImageUrl } from "@/utils/security";
import { SECURITY_CONFIG } from "@/utils/constants";
import "@/styles/chat.css";
import { FaUserCircle, FaPaperPlane, FaSearch } from "react-icons/fa";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface ChatBoxProps {
    messages?: Message[];
    currentUserId: string;
    receiverId: string;
    onSend: (text: string, receiverId: string) => Promise<void>;
    onSearchUser: (query: string) => Promise<Array<{ _id: string; name: string; avatar?: string }>>;
    onSelectReceiver: (id: string) => void;
    onRefreshConversation?: (receiverId: string) => Promise<void>;
}

interface SearchUserResult {
    _id: string;
    name: string;
    avatar?: string;
}

// ============================================================================
// دوال مساعدة ثابتة
// ============================================================================

const getSenderInfo = (msg: Message) => {
    if (typeof msg.sender === "object") {
        return {
            id: msg.sender._id,
            name: msg.sender.name || "مستخدم",
            avatar: msg.sender.avatar
        };
    }
    return {
        id: msg.sender,
        name: "مستخدم",
        avatar: null
    };
};

const formatMessageTime = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
};

/**
 * ✅ إنشاء مفتاح فريد للرسالة (حل نهائي لمشكلة التكرار)
 */
const generateUniqueMessageKey = (msg: Message, index: number): string => {
    const timestamp = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const prefix = msg._id.startsWith('temp-') ? 'temp' : 'msg';
    return `${prefix}-${msg._id}-${index}-${timestamp}-${random}`;
};

// ============================================================================
// المكون الرئيسي
// ============================================================================

const ChatBox = memo(({
    messages = [],
    currentUserId,
    receiverId,
    onSend,
    onSearchUser,
    onSelectReceiver,
}: ChatBoxProps) => {
    // ==========================================================================
    // State
    // ==========================================================================

    const [text, setText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
    const [selectedReceiverName, setSelectedReceiverName] = useState("");
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [localMessages, setLocalMessages] = useState<Message[]>(messages);
    const [isSearching, setIsSearching] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // ==========================================================================
    // Refs
    // ==========================================================================

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();
    const mounted = useRef(true);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const messageIdsRef = useRef<Set<string>>(new Set());
    const messageKeysRef = useRef<Map<string, string>>(new Map());

    // ==========================================================================
    // Effects
    // ==========================================================================

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (mounted.current) {
            setLocalMessages(messages);
            messageIdsRef.current = new Set(messages.map(m => m._id));
            messages.forEach((msg, index) => {
                const uniqueKey = generateUniqueMessageKey(msg, index);
                messageKeysRef.current.set(msg._id, uniqueKey);
            });
        }
    }, [messages]);

    // الاستماع للمستخدمين المتصلين
    useEffect(() => {
        const handleOnlineUsers = (users: { id: string; name: string }[]) => {
            if (!mounted.current) return;
            setOnlineUsers(new Set(users.map(u => u.id)));
        };
        const unsubscribe = socketService.on("online_users", handleOnlineUsers);
        socketService.emit("get_online_users", {});
        return unsubscribe;
    }, []);

    // الاستماع لحالة الكتابة
    useEffect(() => {
        const handleUserTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
            if (!mounted.current || userId !== receiverId) return;
            setTypingUsers(prev => {
                const newSet = new Set(prev);
                if (isTyping) newSet.add(userId);
                else newSet.delete(userId);
                return newSet;
            });
        };
        const unsubscribe = socketService.on("user_typing", handleUserTyping);
        return unsubscribe;
    }, [receiverId]);

    // الاستماع للرسائل الجديدة
    useEffect(() => {
        const handleNewMessage = (message: Message) => {
            if (!mounted.current) return;
            const senderId = typeof message.sender === "object" ? message.sender._id : message.sender;
            const msgReceiverId = typeof message.receiver === "object" ? message.receiver._id : message.receiver;
            if (
                (senderId === receiverId && msgReceiverId === currentUserId) ||
                (senderId === currentUserId && msgReceiverId === receiverId)
            ) {
                setLocalMessages(prev => {
                    if (messageIdsRef.current.has(message._id)) return prev;
                    messageIdsRef.current.add(message._id);
                    const newMessages = [...prev, message];
                    const uniqueKey = generateUniqueMessageKey(message, newMessages.length - 1);
                    messageKeysRef.current.set(message._id, uniqueKey);
                    return newMessages;
                });
                setTimeout(scrollToBottom, 100);
            }
        };
        const unsubscribe = socketService.on("new_message", handleNewMessage);
        return unsubscribe;
    }, [receiverId, currentUserId]);

    // الاستماع لتأكيد إرسال الرسالة
    useEffect(() => {
        const handleMessageSent = (message: Message) => {
            if (!mounted.current) return;
            const senderId = typeof message.sender === "object" ? message.sender._id : message.sender;
            const msgReceiverId = typeof message.receiver === "object" ? message.receiver._id : message.receiver;
            if (senderId === currentUserId && msgReceiverId === receiverId) {
                setLocalMessages(prev => {
                    const tempMessageIndex = prev.findIndex(m => m._id.startsWith('temp-'));
                    if (tempMessageIndex !== -1) {
                        const newMessages = [...prev];
                        newMessages[tempMessageIndex] = message;
                        messageIdsRef.current.delete(prev[tempMessageIndex]._id);
                        messageIdsRef.current.add(message._id);
                        const uniqueKey = generateUniqueMessageKey(message, tempMessageIndex);
                        messageKeysRef.current.set(message._id, uniqueKey);
                        return newMessages;
                    }
                    return prev;
                });
            }
        };
        const unsubscribe = socketService.on("message_sent", handleMessageSent);
        return unsubscribe;
    }, [receiverId, currentUserId]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [localMessages, scrollToBottom]);

    // ==========================================================================
    // دوال المعالجة
    // ==========================================================================

    const handleSend = useCallback(async () => {
        if (!text.trim() || !receiverId || isSending) return;
        if (text.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
            alert(`الرسالة طويلة جداً. الحد الأقصى ${SECURITY_CONFIG.MAX_CONTENT_LENGTH} حرف`);
            return;
        }

        const sanitizedText = sanitizeInput(text);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const tempId = `temp-${timestamp}-${random}`;
        messageIdsRef.current.add(tempId);

        const tempMessage: Message = {
            _id: tempId,
            text: sanitizedText,
            sender: currentUserId,
            receiver: receiverId,
            createdAt: new Date().toISOString(),
            read: false
        };

        const tempIndex = localMessages.length;
        const tempKey = generateUniqueMessageKey(tempMessage, tempIndex);
        messageKeysRef.current.set(tempId, tempKey);

        setLocalMessages(prev => [...prev, tempMessage]);
        setText("");
        setIsSending(true);

        try {
            socketService.sendMessage(receiverId, tempMessage);
            await onSend(sanitizedText, receiverId);
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            setLocalMessages(prev => {
                const filtered = prev.filter(m => m._id !== tempId);
                messageIdsRef.current.delete(tempId);
                messageKeysRef.current.delete(tempId);
                return filtered;
            });
        } finally {
            setIsSending(false);
            socketService.emit("typing", { receiverId, isTyping: false });
        }
    }, [text, receiverId, currentUserId, onSend, isSending, localMessages.length]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!receiverId) return;
        socketService.emit("typing", { receiverId, isTyping });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
                socketService.emit("typing", { receiverId, isTyping: false });
            }, 2000);
        }
    }, [receiverId]);

    const handleSearchChange = useCallback(async (value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (value.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await onSearchUser(sanitizeInput(value));
                if (mounted.current) setSearchResults(Array.isArray(results) ? results : []);
            } catch (err) {
                console.error('Search error:', err);
                if (mounted.current) setSearchResults([]);
            } finally {
                if (mounted.current) setIsSearching(false);
            }
        }, 500);
    }, [onSearchUser]);

    const handleSelectReceiver = useCallback((userId: string, userName: string) => {
        onSelectReceiver(userId);
        setSelectedReceiverName(userName);
        setSearchQuery("");
        setSearchResults([]);
        messageIdsRef.current.clear();
        messageKeysRef.current.clear();
    }, [onSelectReceiver]);

    // ==========================================================================
    // دوال مساعدة للـ rendering
    // ==========================================================================

    /**
     * دالة لعرض النص مع تحويل الروابط إلى عناصر <a> قابلة للنقر
     * تستخدم regex بسيط وآمن ولا تحتاج لمكتبات خارجية
     */
    const renderMessageWithLinks = useCallback((content: string) => {
        if (!content) return null;
        
        // تعبير منتظم للبحث عن الروابط (http, https)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        // تقسيم النص حسب الروابط
        const parts = content.split(urlRegex);
        
        // إعادة تجميع القطع مع تحويل الروابط إلى عناصر <a>
        return parts.map((part, index) => {
            // التحقق مما إذا كانت هذه القطعة تطابق نمط الرابط
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="message-link"
                        onClick={(e) => e.stopPropagation()} // منع تأثيرات غير مرغوب فيها
                    >
                        {part}
                    </a>
                );
            }
            // النص العادي
            return <span key={index}>{part}</span>;
        });
    }, []);

    // ==========================================================================
    // Memoized Values
    // ==========================================================================

    const isReceiverOnline = onlineUsers.has(receiverId);
    const isReceiverTyping = typingUsers.has(receiverId);

    // ==========================================================================
    // Render
    // ==========================================================================

    return (
        <div className="chat-box" dir="rtl">
            {/* 🔍 Search Bar */}
            <div className="chat-search">
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="ابحث عن مستخدم..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        aria-label="بحث عن مستخدم"
                        className="search-input"
                    />
                </div>
                {isSearching && <span className="search-spinner">جاري البحث...</span>}
            </div>

            {/* 📋 Search Results */}
            {searchResults.length > 0 && (
                <div className="search-results" role="listbox">
                    {searchResults.map((user) => (
                        <button
                            key={`search-${user._id}`}
                            className={`search-item ${
                                receiverId === user._id ? "active" : ""
                            } ${onlineUsers.has(user._id) ? "online" : ""}`}
                            onClick={() => handleSelectReceiver(user._id, user.name)}
                            role="option"
                            aria-selected={receiverId === user._id}
                        >
                            <div className="search-item-avatar">
                                {user.avatar ? (
                                    <img
                                        src={sanitizeImageUrl(user.avatar)}
                                        alt={user.name}
                                        className="avatar-img"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <span className="user-name">{user.name}</span>
                            {onlineUsers.has(user._id) && (
                                <span className="online-dot" title="متصل الآن">●</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* 💬 Chat Header */}
            {receiverId && (
                <div className="chat-header">
                    <div className="receiver-info">
                        <h3>{selectedReceiverName || "المحادثة"}</h3>
                        <div className="receiver-status">
                            <span className={`online-status ${isReceiverOnline ? "online" : "offline"}`}>
                                <span className="status-dot"></span>
                                {isReceiverOnline ? "متصل" : "غير متصل"}
                            </span>
                            {isReceiverTyping && (
                                <span className="typing-indicator">يكتب...</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 💬 Messages Area */}
            <div className="chat-messages-container">
                <div className="chat-messages">
                    {localMessages.length === 0 ? (
                        <div className="no-messages">
                            {receiverId ? (
                                <>
                                    <p>لا توجد رسائل بعد</p>
                                    <p className="no-messages-hint">اكتب رسالة لبدء المحادثة</p>
                                </>
                            ) : (
                                <p>ابحث عن مستخدم لبدء المحادثة</p>
                            )}
                        </div>
                    ) : (
                        localMessages.map((msg, index) => {
                            const senderInfo = getSenderInfo(msg);
                            const isOwn = senderInfo.id === currentUserId;
                            const isPending = msg._id.startsWith('temp-');
                            
                            let messageKey = messageKeysRef.current.get(msg._id);
                            if (!messageKey) {
                                messageKey = generateUniqueMessageKey(msg, index);
                                messageKeysRef.current.set(msg._id, messageKey);
                            }
                            
                            const showAvatar = index === 0 ||
                                getSenderInfo(localMessages[index - 1]).id !== senderInfo.id;

                            return (
                                <div
                                    key={messageKey}
                                    className={`message-wrapper ${isOwn ? "own" : "other"} ${isPending ? "pending" : ""}`}
                                >
                                    {!isOwn && showAvatar && (
                                        <div className="message-avatar">
                                            {senderInfo.avatar ? (
                                                <img
                                                    src={sanitizeImageUrl(senderInfo.avatar)}
                                                    alt={senderInfo.name}
                                                    className="avatar-img"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    <FaUserCircle size={32} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="message-content">
                                        {!isOwn && showAvatar && (
                                            <span className="message-sender-name">
                                                {senderInfo.name}
                                            </span>
                                        )}

                                        <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
                                            {/* ✅ عرض النص مع تحويل الروابط إلى عناصر قابلة للنقر */}
                                            <div className="message-text">
                                                {renderMessageWithLinks(msg.text)}
                                            </div>
                                            <div className="message-metadata">
                                                <time className="message-time" dateTime={msg.createdAt}>
                                                    {formatMessageTime(msg.createdAt)}
                                                </time>
                                                {isPending && (
                                                    <span className="sending-indicator">جاري الإرسال...</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {isOwn && showAvatar && (
                                        <div className="message-avatar own">
                                            <div className="avatar-placeholder">
                                                <FaUserCircle size={32} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ✍️ Input Area */}
            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        className="chat-input-field"
                        placeholder={
                            receiverId
                                ? selectedReceiverName
                                    ? `اكتب رسالة إلى ${selectedReceiverName}...`
                                    : "اكتب رسالة..."
                                : "اختر مستخدم لبدء المحادثة"
                        }
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            handleTyping(e.target.value.length > 0);
                        }}
                        onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={!receiverId || isSending}
                        maxLength={SECURITY_CONFIG.MAX_CONTENT_LENGTH}
                        aria-label="كتابة رسالة"
                    />
                    <button
                        className={`send-btn ${text.trim() && receiverId && !isSending ? "active" : ""}`}
                        onClick={handleSend}
                        disabled={!receiverId || !text.trim() || isSending}
                        aria-label="إرسال"
                    >
                        <FaPaperPlane />
                    </button>
                </div>
                {text.length > 0 && (
                    <div className="input-counter">
                        <span className={text.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH * 0.9 ? "warning" : ""}>
                            {text.length}/{SECURITY_CONFIG.MAX_CONTENT_LENGTH}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
});

ChatBox.displayName = 'ChatBox';

export default ChatBox;