"use client";

// 👤 ProfilePage.tsx
// مسؤول: عرض الملف الشخصي مع جميع التفاصيل - نسخة محسنة بالكامل ومتوافقة مع نظام الكوكيز
// الإصدار: 9.0.1 | آخر تحديث: 2026
// المميزات:
// - دعم كامل للمتابعة وإلغاء المتابعة مع تحديث فوري للعدادات
// - تكامل مع نظام المصادقة عبر HttpOnly Cookies
// - معالجة أخطاء routing (404) بشكل صحيح
// - أمان عالي مع sanitize و secureLog
// - أداء محسن مع useCallback و useMemo
// - دعم البحث عن المستخدمين والمحادثة الفورية عبر Socket.io

import { useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import userService from "@/services/userService";
import postService from "@/services/postService";
import messageService from "@/services/messageService";
import followService from "@/services/followService";
import { socketService } from "@/services/socketService";
import ProfileCard from "@/components/users/ProfileCard";
import PostForm from "@/components/posts/PostForm";
import PostsList from "@/components/posts/PostsList";
import ChatBox from "@/components/messages/ChatBox";
import { Post } from "@/types/Post";
import { Message } from "@/types/Message";
import { User } from "@/types/User";
import { secureLog, sanitizeInput } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات المحسنة
// ============================================================================

interface OtherUser {
    _id: string;
    name: string;
    avatar?: string;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const profileUserId = params?.id as string;

    // ==========================================================================
    // التحقق من صحة المعرّف – إذا لم يكن موجوداً نعيد 404
    // ==========================================================================
    if (!profileUserId || profileUserId === "undefined") {
        notFound(); // يعرض صفحة 404 المخصصة
    }

    // ==========================================================================
    // مراجع (Refs) لمنع التحميل المتكرر
    // ==========================================================================
    const mounted = useRef(true);
    const initialLoadDone = useRef(false);
    const fetchInProgress = useRef(false);
    // ✅ التعديل: استخدام ReturnType<typeof setTimeout> بدلاً من NodeJS.Timeout
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ==========================================================================
    // السياق (Context)
    // ==========================================================================
    const {
        user: currentUser,
        setUser,
        posts,
        fetchUserPosts,
        createPost,
        deletePost,
        setPosts,
        loading: authLoading,
        refreshUser,
    } = useContext(AuthContext)!;

    // ==========================================================================
    // حالات (State) المكون
    // ==========================================================================
    const [messages, setMessages] = useState<Message[]>([]);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [postsCount, setPostsCount] = useState(0);
    const [followLoading, setFollowLoading] = useState(false);

    // حالات البحث الذكي
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<OtherUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // حالات إضافية للمحادثة
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    // ==========================================================================
    // تأثيرات (Effects) جانبية
    // ==========================================================================

    // تنظيف عند إلغاء تثبيت المكون
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    // تحقق من المصادقة – إذا لم يكن المستخدم مسجلاً نوجه إلى تسجيل الدخول
    useEffect(() => {
        if (!authLoading && !currentUser && mounted.current) {
            router.replace("/login");
        }
    }, [currentUser, authLoading, router]);

    // الاستماع للمستخدمين المتصلين عبر Socket
    useEffect(() => {
        const handleOnlineUsers = (users: { id: string; name: string }[]) => {
            if (!mounted.current) return;
            setOnlineUsers(new Set(users.map(u => u.id)));
        };

        socketService.on("online_users", handleOnlineUsers);
        socketService.emit("get_online_users", {});

        return () => {
            socketService.off("online_users", handleOnlineUsers);
        };
    }, []);

    // الاستماع لحالة الكتابة
    useEffect(() => {
        const handleUserTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
            if (!mounted.current) return;
            if (userId === profileUserId) {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    isTyping ? newSet.add(userId) : newSet.delete(userId);
                    return newSet;
                });
            }
        };

        socketService.on("user_typing", handleUserTyping);
        return () => {
            socketService.off("user_typing", handleUserTyping);
        };
    }, [profileUserId]);

    // تحميل بيانات البروفايل
    useEffect(() => {
        const fetchProfile = async () => {
            if (!currentUser || !profileUserId) return;
            if (fetchInProgress.current) return;
            if (initialLoadDone.current && profileUser?._id === profileUserId) return;

            fetchInProgress.current = true;
            if (mounted.current) {
                setLoading(true);
                setError(null);
            }

            try {
                // جلب بيانات المستخدم المعروض
                const userData = await userService.getById(profileUserId);
                if (!mounted.current) return;

                setProfileUser(userData);

                // إذا كان هذا هو المستخدم الحالي، نقوم بتحديث الـ Context
                if (profileUserId === currentUser._id) {
                    setUser(userData);
                }

                // جلب منشورات المستخدم
                await fetchUserPosts(profileUserId, true);

                // إذا لم يكن المستخدم الحالي، نجلب المحادثة
                if (profileUserId !== currentUser._id) {
                    const conversation = await messageService.getConversation(profileUserId);
                    if (mounted.current) setMessages(conversation);
                }

                initialLoadDone.current = true;
            } catch (err: any) {
                console.error("❌ Error fetching profile:", err);
                secureLog.error("فشل تحميل البروفايل");
                if (mounted.current) {
                    // إذا كان الخطأ 404 نعرض صفحة غير موجودة
                    if (err.response?.status === 404) {
                        notFound();
                    } else {
                        setError(MESSAGES.ERRORS.DEFAULT);
                    }
                }
            } finally {
                if (mounted.current) setLoading(false);
                fetchInProgress.current = false;
            }
        };

        fetchProfile();
    }, [profileUserId, currentUser, setUser, fetchUserPosts]);

    // تحميل بيانات المتابعة بعد تحميل البروفايل
    useEffect(() => {
        const loadFollowData = async () => {
            if (!profileUser || !currentUser) return;

            setFollowersCount(profileUser.followersCount || 0);
            setFollowingCount(profileUser.followingCount || 0);
            setPostsCount(profileUser.postsCount || 0);

            if (currentUser._id !== profileUser._id) {
                try {
                    const followStatus = await followService.getFollowStatus(profileUser._id);
                    if (mounted.current) {
                        setFollowing(prev => {
                            const newSet = new Set(prev);
                            followStatus.isFollowing ? newSet.add(profileUser._id) : newSet.delete(profileUser._id);
                            return newSet;
                        });
                    }
                } catch (error) {
                    secureLog.error("فشل تحميل حالة المتابعة");
                }
            }
        };
        loadFollowData();
    }, [profileUser, currentUser]);

    // الاستماع للرسائل الجديدة
    useEffect(() => {
        if (!currentUser || !profileUserId || profileUserId === currentUser._id) return;

        const handleNewMessage = (message: Message) => {
            if (!mounted.current) return;
            const senderId = typeof message.sender === "object" ? message.sender._id : message.sender;
            if (senderId === profileUserId) {
                setMessages(prev => [...prev, message]);
            }
        };

        socketService.on("new_message", handleNewMessage);
        return () => {
            socketService.off("new_message", handleNewMessage);
        };
    }, [profileUserId, currentUser]);

    // تحديث عداد المنشورات
    useEffect(() => {
        setPostsCount(posts.length);
    }, [posts]);

    // ==========================================================================
    // دوال المتابعة
    // ==========================================================================

    const handleFollow = useCallback(async (userId: string) => {
        if (!mounted.current || followLoading) return;
        setFollowLoading(true);
        try {
            await followService.followUser(userId);
            if (mounted.current) {
                setFollowing(prev => new Set(prev).add(userId));
                setFollowersCount(prev => prev + 1);
                if (profileUser && profileUser._id === userId) {
                    setProfileUser(prev => prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : null);
                }
                secureLog.info("تمت المتابعة بنجاح");
            }
        } catch (error) {
            secureLog.error("فشل المتابعة");
        } finally {
            setFollowLoading(false);
        }
    }, [profileUser, followLoading]);

    const handleUnfollow = useCallback(async (userId: string) => {
        if (!mounted.current || followLoading) return;
        setFollowLoading(true);
        try {
            await followService.unfollowUser(userId);
            if (mounted.current) {
                setFollowing(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
                setFollowersCount(prev => Math.max(0, prev - 1));
                if (profileUser && profileUser._id === userId) {
                    setProfileUser(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1) } : null);
                }
                secureLog.info("تم إلغاء المتابعة بنجاح");
            }
        } catch (error) {
            secureLog.error("فشل إلغاء المتابعة");
        } finally {
            setFollowLoading(false);
        }
    }, [profileUser, followLoading]);

    // ==========================================================================
    // دوال البحث الذكي
    // ==========================================================================

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await messageService.searchUsers(query);
            if (!mounted.current) return;
            const filtered = results.filter(u => u._id !== currentUser?._id);
            setSearchResults(filtered);
        } catch (error) {
            secureLog.error("فشل البحث عن مستخدمين");
        } finally {
            if (mounted.current) setIsSearching(false);
        }
    }, [currentUser?._id]);

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => performSearch(value), 500);
    }, [performSearch]);

    const loadAllUsers = useCallback(async () => {
        setIsSearching(true);
        try {
            const users = await messageService.searchUsers('');
            if (!mounted.current) return;
            const filtered = users.filter(u => u._id !== currentUser?._id);
            setSearchResults(filtered);
            setSearchQuery('');
        } catch (error) {
            secureLog.error("فشل تحميل المستخدمين");
        } finally {
            if (mounted.current) setIsSearching(false);
        }
    }, [currentUser?._id]);

    const toggleSearch = useCallback(async () => {
        if (!showSearch) {
            setShowSearch(true);
            await loadAllUsers();
        } else {
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [showSearch, loadAllUsers]);

    // ==========================================================================
    // دوال المعالجة الأخرى
    // ==========================================================================

    const handleAvatarUpdated = useCallback(async (updatedUser: User) => {
        if (!mounted.current) return;
        if (profileUserId === currentUser?._id) {
            setProfileUser(updatedUser);
        }
        await refreshUser();
    }, [profileUserId, currentUser?._id, refreshUser]);

    const handleSendMessage = useCallback(async (text: string, receiverId: string) => {
        if (!text.trim() || !mounted.current) return;
        try {
            await messageService.sendMessage(sanitizeInput(text), receiverId);
            const conv = await messageService.getConversation(receiverId);
            if (mounted.current) setMessages(conv);
            await messageService.markMessagesAsRead(receiverId);
        } catch (error) {
            secureLog.error("فشل إرسال الرسالة");
        }
    }, []);

    const handleSearchUser = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) return [];
        try {
            return await messageService.searchUsers(sanitizeInput(query));
        } catch (error) {
            return [];
        }
    }, []);

    const handleSelectUser = useCallback((userId: string) => {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        router.push(`/profile/${userId}`);
    }, [router]);

    const goToFullChat = useCallback(() => {
        if (profileUser?._id) router.push(`/messages/${profileUser._id}`);
    }, [profileUser?._id, router]);

    const goToMessagesList = useCallback(() => {
        router.push('/messages-list');
    }, [router]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!profileUserId || profileUserId === currentUser?._id) return;
        socketService.emit("typing", { receiverId: profileUserId, isTyping });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
                socketService.emit("typing", { receiverId: profileUserId, isTyping: false });
            }, 2000);
        }
    }, [profileUserId, currentUser?._id]);

    const handleRefreshConversation = useCallback(async (receiverId: string) => {
        try {
            const conversation = await messageService.getConversation(receiverId);
            if (mounted.current) setMessages(conversation);
        } catch (error) {
            secureLog.error("فشل تحديث المحادثة");
        }
    }, []);

    const handleCreatePost = useCallback(async (formData: FormData) => {
        await createPost(formData);
    }, [createPost]);

    const handleDeletePost = useCallback(async (id: string) => {
        await deletePost(id);
    }, [deletePost]);

    const handleReact = useCallback(async (postId: string, reaction: string) => {
        try {
            const updatedPost = await postService.addReaction(postId, reaction);
            if (mounted.current) {
                setPosts((prev: Post[]) => prev.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            secureLog.error("فشل إضافة التفاعل");
        }
    }, [setPosts]);

    const handleComment = useCallback(async (postId: string, text: string) => {
        if (!text.trim()) return;
        try {
            const updatedPost = await postService.addComment(postId, sanitizeInput(text));
            if (mounted.current) {
                setPosts((prev: Post[]) => prev.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            secureLog.error("فشل إضافة التعليق");
        }
    }, [setPosts]);

    const handleShare = useCallback(async (postId: string) => {
        try {
            const updatedPost = await postService.addShare(postId);
            if (mounted.current) {
                setPosts((prev: Post[]) => prev.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            secureLog.error("فشل مشاركة البوست");
        }
    }, [setPosts]);

    // ==========================================================================
    // قيم محسوبة (Memoized)
    // ==========================================================================

    const isOwnProfile = useMemo(() => profileUserId === currentUser?._id, [profileUserId, currentUser?._id]);
    const isOnline = useMemo(() => onlineUsers.has(profileUser?._id || ''), [onlineUsers, profileUser?._id]);
    const shouldShowMessages = useMemo(() => !isOwnProfile && profileUser !== null, [isOwnProfile, profileUser]);
    const isReceiverTyping = useMemo(() => typingUsers.has(profileUserId || ''), [typingUsers, profileUserId]);
    const isFollowing = useMemo(() => following.has(profileUser?._id || ''), [following, profileUser?._id]);

    // ==========================================================================
    // حالات التحميل والخطأ
    // ==========================================================================

    if (authLoading || loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>جاري تحميل البروفايل...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <h2>حدث خطأ</h2>
                <p>{error}</p>
                <button onClick={() => router.replace("/")}>العودة للرئيسية</button>
            </div>
        );
    }

    if (!currentUser || !profileUser) {
        // هذا السيناريو لن يحدث عادة لأننا نستدعي notFound() عند عدم وجود المستخدم
        return null;
    }

    // ==========================================================================
    // التصيير (Render)
    // ==========================================================================

    return (
        <main className={styles.profilePage}>
            <div className={styles.container}>
                {/* ================================================================== */}
                {/* الشريط الجانبي - بطاقة البروفايل */}
                {/* ================================================================== */}
                <aside className={styles.profileSidebar}>
                    <ProfileCard
                        user={profileUser}
                        isCurrentUser={isOwnProfile}
                        onAvatarUpdated={handleAvatarUpdated}
                        onFollow={!isOwnProfile ? handleFollow : undefined}
                        onUnfollow={!isOwnProfile ? handleUnfollow : undefined}
                        followersCount={followersCount}
                        followingCount={followingCount}
                        postsCount={postsCount}
                        isFollowing={isFollowing}
                    />

                    {!isOwnProfile && (
                        <div className={`${styles.statusBadge} ${isOnline ? styles.online : styles.offline}`}>
                            {isOnline ? "🟢 متصل الآن" : "⚫ غير متصل"}
                        </div>
                    )}

                    <div className={styles.navigationButtons}>
                        <button onClick={goToMessagesList} className={styles.navButton} aria-label="كل المحادثات">
                            <span>💬</span>
                            <span>كل المحادثات</span>
                        </button>
                        <button
                            onClick={toggleSearch}
                            className={`${styles.navButton} ${showSearch ? styles.active : ''}`}
                            aria-label="ابحث عن مستخدمين"
                        >
                            <span>🔍</span>
                            <span>{showSearch ? 'إغلاق البحث' : 'ابحث عن مستخدمين'}</span>
                        </button>
                    </div>

                    {showSearch && (
                        <div className={styles.searchSection}>
                            <div className={styles.searchInputContainer}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="ابحث باسم المستخدم..."
                                    className={styles.searchInput}
                                    autoFocus
                                    dir="rtl"
                                />
                                {isSearching && <span className={styles.searchSpinner}></span>}
                            </div>
                            <div className={styles.searchResults}>
                                {searchResults.length === 0 ? (
                                    <div className={styles.noResults}>
                                        {searchQuery ? (
                                            <>
                                                <p>لا توجد نتائج لـ "{searchQuery}"</p>
                                                <p className={styles.suggestion}>جرب كتابة اسم آخر</p>
                                            </>
                                        ) : (
                                            <>
                                                <p>📝 اكتب لبدء البحث</p>
                                                <p className={styles.suggestion}>يمكنك البحث بأي جزء من الاسم</p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <p className={styles.resultsCount}>{searchResults.length} مستخدم</p>
                                        {searchResults.map(user => (
                                            <button
                                                key={user._id}
                                                className={styles.userItem}
                                                onClick={() => handleSelectUser(user._id)}
                                            >
                                                <div className={styles.userInfo}>
                                                    <div className={styles.userAvatar}>
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt={user.name} />
                                                        ) : (
                                                            <div className={styles.avatarPlaceholder}>
                                                                {user.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={styles.userDetails}>
                                                        <span className={styles.userName}>{user.name}</span>
                                                        <span className={styles.userStatus}>
                                                            {onlineUsers.has(user._id) ? '🟢 متصل' : '⚫ غير متصل'}
                                                        </span>
                                                    </div>
                                                    {onlineUsers.has(user._id) && (
                                                        <span className={styles.onlineBadge} title="متصل الآن">●</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                            <button onClick={toggleSearch} className={styles.closeButton}>إغلاق</button>
                        </div>
                    )}
                </aside>

                {/* ================================================================== */}
                {/* المحتوى الرئيسي */}
                {/* ================================================================== */}
                <div className={styles.mainContent}>
                    <section className={styles.postsSection}>
                        <div className={styles.sectionHeader}>
                            <h2>{isOwnProfile ? "منشوراتي" : `منشورات ${profileUser.name}`}</h2>
                            <span className={styles.postsCount}>({postsCount})</span>
                        </div>

                        {isOwnProfile && (
                            <div className={styles.createPost}>
                                <PostForm onCreate={handleCreatePost} />
                            </div>
                        )}

                        <PostsList
                            posts={posts}
                            onDelete={isOwnProfile ? handleDeletePost : undefined}
                            onReact={handleReact}
                            onComment={handleComment}
                            onShare={handleShare}
                            onFollow={!isOwnProfile ? handleFollow : undefined}
                            onUnfollow={!isOwnProfile ? handleUnfollow : undefined}
                            following={following}
                            currentUserId={currentUser._id}
                        />
                    </section>

                    {shouldShowMessages && (
                        <section className={styles.messagesSection}>
                            <div className={styles.messagesHeader}>
                                <div className={styles.messagesTitle}>
                                    <h2>المحادثة مع {profileUser.name}</h2>
                                    <div className={styles.userStatus}>
                                        {isOnline && <span className={styles.onlineDot} title="متصل الآن"></span>}
                                        {isReceiverTyping && (
                                            <span className={styles.typingIndicator}>يكتب...</span>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.messagesActions}>
                                    <button
                                        className={styles.fullscreenButton}
                                        onClick={goToFullChat}
                                        title="فتح المحادثة في وضع ملء الشاشة"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20">
                                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                        </svg>
                                        <span>شاشة كاملة</span>
                                    </button>
                                </div>
                            </div>

                            <ChatBox
                                messages={messages}
                                currentUserId={currentUser._id}
                                receiverId={profileUser._id}
                                onSend={handleSendMessage}
                                onSearchUser={handleSearchUser}
                                onSelectReceiver={handleSelectUser}
                                onRefreshConversation={handleRefreshConversation}
                                onTyping={handleTyping}
                            />
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}