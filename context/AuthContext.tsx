/* cSpell:disable */
"use client";

// 🔐 AuthContext.tsx
// مسؤول: إدارة حالة المصادقة بشكل آمن بالكامل عبر HttpOnly Cookies
// @version 7.0.0 - متوافق تماماً مع backend الآمن
/* cSpell:enable */

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { User } from "@/types/User";
import { Post } from "@/types/Post";
import postService from "@/services/postService";
import userService from "@/services/userService";
import followService from "@/services/followService";
import { useRouter } from "next/navigation";
import { MESSAGES, SECURITY_CONFIG } from "@/utils/constants";
import { secureLog } from "@/utils/security";
import api from "@/services/api";

// ============================================================================
// Types
// ============================================================================

interface AuthResponse {
  user: User;
  // لا نستقبل توكن في الرد، لأنه مخزن في HttpOnly cookies
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;

  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  loading: boolean;
  initialized: boolean;
  error: string | null;
  isAuthenticated: boolean;

  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  fetchUserPosts: (userId: string, force?: boolean) => Promise<void>;
  createPost: (formData: FormData) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  reactToPost: (postId: string, type: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  addShare: (postId: string) => Promise<void>;

  following: Set<string>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  checkFollowStatus: (userId: string) => Promise<boolean>;
  getFollowersCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Provider
// ============================================================================

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const router = useRouter();
  const fetchInProgress = useRef<Set<string>>(new Set());
  const mounted = useRef(true);

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // التحقق من حالة المصادقة عند بدء التشغيل
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // محاولة تجديد التوكن (إذا كان موجوداً) والحصول على المستخدم
        // يمكن استبدال هذا بطلب /api/users/me إذا كان متاحاً
        const refreshResponse = await api.post('/auth/refresh');
        if (refreshResponse.status === 200) {
          // نجح التجديد، لدينا جلسة نشطة
          // الآن نحتاج لجلب المستخدم (قد يكون الرد من refresh لا يعيد المستخدم)
          // نفترض وجود نقطة نهاية /api/users/me
          try {
            const meResponse = await api.get('/users/me');
            if (meResponse.data?.success && meResponse.data.data) {
              const userData = meResponse.data.data;
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData)); // تخزين مؤقت
              await fetchUserPosts(userData._id);
              await loadFollowingStatus(userData._id);
            }
          } catch (meError) {
            secureLog.warn('تعذر جلب المستخدم بعد التجديد', meError);
            // قد لا تكون نقطة /users/me موجودة، نحاول الحصول من الـ localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                await fetchUserPosts(parsedUser._id);
                await loadFollowingStatus(parsedUser._id);
              } catch (e) {
                // تجاهل
              }
            }
          }
        }
      } catch (error) {
        secureLog.log('لا توجد جلسة نشطة');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    if (!initialized) {
      checkAuth();
    }
  }, [initialized]);

  // تحميل حالة المتابعة
  const loadFollowingStatus = async (userId: string) => {
    if (!userId) return;
    try {
      const response = await followService.getFollowing(userId, 1, 100);
      const followingIds = new Set(response.data.map((u: any) => u._id));
      if (mounted.current) setFollowing(followingIds);
    } catch (error) {
      secureLog.error('❌ فشل تحميل حالة المتابعة:', error);
    }
  };

  // ==========================================================================
  // المصادقة
  // ==========================================================================

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      secureLog.log('🔵 محاولة تسجيل الدخول...');
      const response = await api.post('/auth/login', { email, password });
      const { user: userData } = response.data;

      if (!userData) {
        throw new Error('لم يتم استلام بيانات المستخدم');
      }

      // تخزين بيانات المستخدم فقط (لا يوجد توكن)
      localStorage.setItem('user', JSON.stringify(userData));

      if (mounted.current) {
        setUser(userData);
        await fetchUserPosts(userData._id);
        await loadFollowingStatus(userData._id);
        secureLog.log('✅ تم تسجيل الدخول بنجاح:', userData.email);
      }

      return { user: userData };
    } catch (error: any) {
      secureLog.error('❌ فشل تسجيل الدخول:', error);
      const message = error.response?.data?.message || error.message || 'فشل تسجيل الدخول';
      setError(message);
      throw error;
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      secureLog.log('🔵 محاولة إنشاء حساب...');
      const response = await api.post('/auth/register', { name, email, password });
      const { user: userData } = response.data;

      if (!userData) {
        throw new Error('لم يتم استلام بيانات المستخدم');
      }

      localStorage.setItem('user', JSON.stringify(userData));

      if (mounted.current) {
        setUser(userData);
        await fetchUserPosts(userData._id);
        secureLog.log('✅ تم إنشاء الحساب بنجاح:', userData.email);
      }

      return { user: userData };
    } catch (error: any) {
      secureLog.error('❌ فشل إنشاء الحساب:', error);
      setError(error.response?.data?.message || error.message || 'فشل إنشاء الحساب');
      throw error;
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      secureLog.error('❌ خطأ في تسجيل الخروج', error);
    } finally {
      localStorage.removeItem('user');
      if (mounted.current) {
        setUser(null);
        setPosts([]);
        setFollowing(new Set());
        router.push('/login');
      }
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!user?._id || !mounted.current) return;
    try {
      const updatedUser = await userService.getById(user._id);
      if (mounted.current) {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      secureLog.error('❌ فشل تحديث بيانات المستخدم', error);
    }
  }, [user?._id]);

  // ==========================================================================
  // المنشورات (بدون تغيير)
  // ==========================================================================

  const fetchUserPosts = useCallback(async (userId: string, force = false) => {
    if (!userId || !mounted.current) return;
    const key = `posts-${userId}`;
    if (fetchInProgress.current.has(key) && !force) return;
    fetchInProgress.current.add(key);
    try {
      const userPosts = await postService.getByUser(userId);
      if (mounted.current) setPosts(userPosts);
    } catch (error) {
      secureLog.error('❌ فشل جلب المنشورات:', error);
    } finally {
      fetchInProgress.current.delete(key);
    }
  }, []);

  const createPost = useCallback(async (formData: FormData): Promise<Post> => {
    if (!user) throw new Error(MESSAGES.ERRORS.UNAUTHORIZED);
    try {
      const newPost = await postService.create(formData);
      if (mounted.current) setPosts(prev => [newPost, ...prev]);
      return newPost;
    } catch (error: any) {
      secureLog.error('❌ فشل إنشاء المنشور:', error);
      throw new Error(error.userMessage || MESSAGES.ERRORS.DEFAULT);
    }
  }, [user]);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) throw new Error(MESSAGES.ERRORS.UNAUTHORIZED);
    try {
      await postService.delete(postId);
      if (mounted.current) setPosts(prev => prev.filter(p => p._id !== postId));
    } catch (error: any) {
      secureLog.error('❌ فشل حذف المنشور:', error);
      throw new Error(error.userMessage || MESSAGES.ERRORS.DEFAULT);
    }
  }, [user]);

  const reactToPost = useCallback(async (postId: string, type: string) => {
    try {
      const updatedPost = await postService.addReaction(postId, type);
      if (mounted.current) setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
    } catch (error: any) {
      secureLog.error('❌ فشل التفاعل مع المنشور:', error);
      throw new Error(error.userMessage || MESSAGES.ERRORS.DEFAULT);
    }
  }, []);

  const addComment = useCallback(async (postId: string, text: string) => {
    if (text.length > SECURITY_CONFIG.MAX_COMMENT_LENGTH) {
      throw new Error(`التعليق يجب أن لا يتجاوز ${SECURITY_CONFIG.MAX_COMMENT_LENGTH} حرف`);
    }
    try {
      const updatedPost = await postService.addComment(postId, text);
      if (mounted.current) setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
    } catch (error: any) {
      secureLog.error('❌ فشل إضافة التعليق:', error);
      throw new Error(error.userMessage || MESSAGES.ERRORS.DEFAULT);
    }
  }, []);

  const addShare = useCallback(async (postId: string) => {
    try {
      const updatedPost = await postService.addShare(postId);
      if (mounted.current) setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
    } catch (error: any) {
      secureLog.error('❌ فشل مشاركة المنشور:', error);
      throw new Error(error.userMessage || MESSAGES.ERRORS.DEFAULT);
    }
  }, []);

  // ==========================================================================
  // المتابعة (بدون تغيير)
  // ==========================================================================

  const followUser = useCallback(async (userId: string) => {
    if (!user) throw new Error(MESSAGES.ERRORS.UNAUTHORIZED);
    try {
      await followService.followUser(userId);
      setFollowing(prev => new Set(prev).add(userId));
      if (user._id === userId) {
        setUser(prev => prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : null);
      }
    } catch (error) {
      secureLog.error('❌ فشل متابعة المستخدم:', error);
      throw error;
    }
  }, [user]);

  const unfollowUser = useCallback(async (userId: string) => {
    if (!user) throw new Error(MESSAGES.ERRORS.UNAUTHORIZED);
    try {
      await followService.unfollowUser(userId);
      setFollowing(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      if (user._id === userId) {
        setUser(prev => prev ? {
          ...prev,
          followersCount: Math.max(0, (prev.followersCount || 0) - 1)
        } : null);
      }
    } catch (error) {
      secureLog.error('❌ فشل إلغاء المتابعة:', error);
      throw error;
    }
  }, [user]);

  const checkFollowStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const status = await followService.getFollowStatus(userId);
      return status.isFollowing;
    } catch (error) {
      secureLog.error('❌ خطأ في التحقق من حالة المتابعة:', error);
      return false;
    }
  }, []);

  const getFollowersCount = useCallback(async (userId: string): Promise<number> => {
    try {
      const userData = await userService.getById(userId);
      return userData.followersCount || 0;
    } catch (error) {
      secureLog.error('❌ خطأ في جلب عدد المتابعين:', error);
      return 0;
    }
  }, []);

  const getFollowingCount = useCallback(async (userId: string): Promise<number> => {
    try {
      const userData = await userService.getById(userId);
      return userData.followingCount || 0;
    } catch (error) {
      secureLog.error('❌ خطأ في جلب عدد المتابَعين:', error);
      return 0;
    }
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  const contextValue: AuthContextType = {
    user,
    setUser,
    login,
    register,
    logout,
    refreshUser,
    loading,
    initialized,
    error,
    isAuthenticated: !!user,
    posts,
    setPosts,
    fetchUserPosts,
    createPost,
    deletePost,
    reactToPost,
    addComment,
    addShare,
    following,
    followUser,
    unfollowUser,
    checkFollowStatus,
    getFollowersCount,
    getFollowingCount,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}