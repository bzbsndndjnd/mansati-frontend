"use client";

// app/users/page.tsx
// 👥 صفحة عرض جميع المستخدمين مع إمكانية المتابعة
// الإصدار: 3.0.0 | آخر تحديث: 2026

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import userService from "@/services/userService";
import followService from "@/services/followService";
import { socketService } from "@/services/socketService";
import UserList from "@/components/users/UserList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faUserPlus, faSync, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface UserWithFollow {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isOnline?: boolean;
  lastLogin?: string;
  role?: 'user' | 'admin' | 'moderator';
  createdAt?: string;
}

// ============================================================================
// الصفحة الرئيسية للمستخدمين
// ============================================================================

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  
  // ==========================================================================
  // حالات (State) المكون
  // ==========================================================================

  const [users, setUsers] = useState<UserWithFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // حالات البحث
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserWithFollow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // حالات المتابعة
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  
  // حالات المستخدمين المتصلين
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // ==========================================================================
  // قيم محسوبة
  // ==========================================================================

  const displayUsers = useMemo(() => 
    searchQuery ? searchResults : users,
    [searchQuery, searchResults, users]
  );

  const stats = useMemo(() => ({
    totalUsers: users.length,
    onlineCount: users.filter(u => u.isOnline).length,
    followingCount: following.size
  }), [users, following]);

  // ==========================================================================
  // التحقق من المصادقة
  // ==========================================================================

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, authLoading, router]);

  // ==========================================================================
  // تحميل جميع المستخدمين
  // ==========================================================================

  useEffect(() => {
    if (!currentUser) return;

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📥 [UsersPage] Loading all users...');
        
        // جلب جميع المستخدمين
        const allUsers = await userService.getAllUsers();
        console.log(`📥 [UsersPage] Loaded ${allUsers.length} users`);
        
        // استبعاد المستخدم الحالي من القائمة
        const otherUsers = allUsers.filter(u => u._id !== currentUser._id);
        
        // جلب حالة المتابعة دفعة واحدة
        const userIds = otherUsers.map(u => u._id);
        const bulkStatus = await followService.getBulkFollowStatus(userIds);
        
        // تجهيز البيانات
        const usersWithFollowStatus = otherUsers.map(user => ({
          ...user,
          isFollowing: bulkStatus[user._id] || false,
          followersCount: user.followersCount || 0,
          followingCount: user.followingCount || 0,
          postsCount: user.postsCount || 0,
          isOnline: onlineUsers.has(user._id)
        }));
        
        setUsers(usersWithFollowStatus);
        
        // تحديث قائمة المتابعين
        const followingSet = new Set(
          usersWithFollowStatus
            .filter(u => u.isFollowing)
            .map(u => u._id)
        );
        setFollowing(followingSet);
        
      } catch (error) {
        console.error('❌ [UsersPage] Error loading users:', error);
        setError('فشل تحميل المستخدمين. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [currentUser, onlineUsers]);

  // ==========================================================================
  // الاستماع للمستخدمين المتصلين عبر Socket
  // ==========================================================================

  useEffect(() => {
    const handleOnlineUsers = (onlineUsersList: { id: string; name: string }[]) => {
      setOnlineUsers(new Set(onlineUsersList.map(u => u.id)));
      
      // تحديث حالة الاتصال في قائمة المستخدمين
      setUsers(prev => prev.map(u => ({
        ...u,
        isOnline: onlineUsersList.some(ou => ou.id === u._id)
      })));
    };

    socketService.on("online_users", handleOnlineUsers);
    socketService.emit("get_online_users", {});

    return () => {
      socketService.off("online_users", handleOnlineUsers);
    };
  }, []);

  // ==========================================================================
  // البحث عن مستخدمين
  // ==========================================================================

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log(`🔍 [UsersPage] Searching for: ${query}`);
      
      const results = await userService.searchUsers(query);
      
      // استبعاد المستخدم الحالي
      const filtered = results.filter(u => u._id !== currentUser?._id);
      
      // التحقق من حالة المتابعة
      const withFollowStatus = await Promise.all(
        filtered.map(async (user) => ({
          ...user,
          isFollowing: following.has(user._id),
          followersCount: user.followersCount || 0,
          followingCount: user.followingCount || 0,
          postsCount: user.postsCount || 0,
          isOnline: onlineUsers.has(user._id)
        }))
      );
      
      setSearchResults(withFollowStatus);
      
    } catch (error) {
      console.error('❌ [UsersPage] Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser, following, onlineUsers]);

  // ==========================================================================
  // دوال المتابعة - متطابقة مع ProfilePage
  // ==========================================================================

  const handleFollow = useCallback(async (userId: string) => {
    if (followLoading.has(userId)) return;

    setFollowLoading(prev => new Set(prev).add(userId));

    try {
      console.log(`👥 [UsersPage] Following user: ${userId}`);
      
      const result = await followService.followUser(userId);

      // تحديث القوائم
      const updateUser = (user: UserWithFollow) => 
        user._id === userId 
          ? { ...user, isFollowing: true, followersCount: (user.followersCount || 0) + 1 }
          : user;

      setUsers(prev => prev.map(updateUser));
      setSearchResults(prev => prev.map(updateUser));
      setFollowing(prev => new Set(prev).add(userId));

      console.log(`✅ [UsersPage] Successfully followed user: ${userId}`);

    } catch (error) {
      console.error('❌ [UsersPage] Follow error:', error);
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [followLoading]);

  const handleUnfollow = useCallback(async (userId: string) => {
    if (followLoading.has(userId)) return;

    setFollowLoading(prev => new Set(prev).add(userId));

    try {
      console.log(`👥 [UsersPage] Unfollowing user: ${userId}`);
      
      const result = await followService.unfollowUser(userId);

      // تحديث القوائم
      const updateUser = (user: UserWithFollow) => 
        user._id === userId 
          ? { ...user, isFollowing: false, followersCount: Math.max(0, (user.followersCount || 0) - 1) }
          : user;

      setUsers(prev => prev.map(updateUser));
      setSearchResults(prev => prev.map(updateUser));
      setFollowing(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      console.log(`✅ [UsersPage] Successfully unfollowed user: ${userId}`);

    } catch (error) {
      console.error('❌ [UsersPage] Unfollow error:', error);
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [followLoading]);

  // ==========================================================================
  // معالجة النقر على مستخدم
  // ==========================================================================

  const handleUserClick = useCallback((userId: string) => {
    router.push(`/profile/${userId}`);
  }, [router]);

  // ==========================================================================
  // إعادة تحميل البيانات
  // ==========================================================================

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const allUsers = await userService.getAllUsers();
      const otherUsers = allUsers.filter(u => u._id !== currentUser?._id);
      
      const usersWithFollowStatus = otherUsers.map(user => ({
        ...user,
        isFollowing: following.has(user._id),
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        postsCount: user.postsCount || 0,
        isOnline: onlineUsers.has(user._id)
      }));
      
      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, following, onlineUsers]);

  // ==========================================================================
  // عرض التحميل
  // ==========================================================================

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري التحقق من المصادقة...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // ==========================================================================
  // التصيير الرئيسي
  // ==========================================================================

  return (
    <div className={styles.container}>
      {/* الهيدر */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button 
            onClick={() => router.back()} 
            className={styles.backButton}
            aria-label="رجوع"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 className={styles.title}>
              <FontAwesomeIcon icon={faUserPlus} className={styles.titleIcon} />
              المستخدمين
            </h1>
            <p className={styles.subtitle}>
              اكتشف مستخدمين جدد وتابعهم للتواصل
            </p>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <strong>{stats.totalUsers}</strong> مستخدم
            </span>
            <span className={styles.stat}>
              <strong>{stats.onlineCount}</strong> متصل
            </span>
            <span className={styles.stat}>
              <strong>{stats.followingCount}</strong> متابَع
            </span>
          </div>
          <button 
            onClick={handleRefresh}
            className={styles.refreshButton}
            disabled={loading}
            aria-label="تحديث"
          >
            <FontAwesomeIcon icon={faSync} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </header>

      {/* شريط البحث */}
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="ابحث باسم المستخدم..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className={styles.searchInput}
            dir="rtl"
          />
          {isSearching && <div className={styles.searchSpinner}></div>}
        </div>
        {searchQuery && (
          <div className={styles.searchStats}>
            {searchResults.length} نتيجة لـ "{searchQuery}"
          </div>
        )}
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button onClick={handleRefresh}>إعادة المحاولة</button>
        </div>
      )}

      {/* قائمة المستخدمين */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>جاري تحميل المستخدمين...</p>
        </div>
      ) : (
        <UserList
          users={displayUsers}
          currentUserId={currentUser._id}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          following={following}
          followLoading={followLoading}
          onUserClick={handleUserClick}
          emptyMessage={searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد مستخدمين آخرين"}
          showStats={true}
        />
      )}
    </div>
  );
}