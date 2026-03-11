// app/posts/page.tsx
// 📝 صفحة عرض جميع المنشورات مع دعم التمرير إلى منشور محدد
// @version 3.2.0
// @lastUpdated 2026
// المميزات:
// - عرض المنشورات للمستخدمين المسجلين وغير المسجلين
// - دعم التمرير التلقائي إلى منشور محدد (highlight)
// - تفاعلات متاحة فقط للمستخدمين المسجلين مع توجيه لطيف لتسجيل الدخول
// - معالجة متقدمة لأخطاء الشبكة والاتصال

"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import postService from "@/services/postService";
import { Post } from "@/types/Post";
import PostsList from "@/components/posts/PostsList";
import styles from "./posts.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faSpinner,
  faExclamationTriangle,
  faLock,
  faWifi,
  faArrowRight,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

/**
 * المكون الرئيسي لصفحة المنشورات
 */
function PostsPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get('highlight');

  // تنظيف highlightId
  const highlightId = highlightParam && highlightParam !== 'undefined' && highlightParam.length > 0
    ? highlightParam
    : undefined;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  // جلب المنشورات – متاح للجميع
  useEffect(() => {
    if (authLoading) return; // انتظار تحميل حالة المصادقة

    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        setConnectionError(false);
        const data = await postService.getAll();
        setPosts(data);
      } catch (err: any) {
        console.error("فشل جلب البوستات:", err);

        if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
          setConnectionError(true);
          setError("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت أو المحاولة لاحقاً.");
        } else if (err.response?.status === 401) {
          // في حال كان الخطأ 401، يمكن التعامل معه كجلسة منتهية – نوجه لتسجيل الدخول مع redirect
          router.push('/login?redirect=/posts');
        } else {
          setError(err.message || "حدث خطأ أثناء تحميل المنشورات");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [authLoading, router]);

  // حالة التحميل
  if (authLoading || loading) {
    return (
      <div className={styles.loading}>
        <FontAwesomeIcon icon={faSpinner} spin size="lg" />
        <p>جاري تحميل المنشورات...</p>
      </div>
    );
  }

  // حالة خطأ الاتصال بالخادم
  if (connectionError) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>
          <FontAwesomeIcon icon={faWifi} />
        </div>
        <h3>خطأ في الاتصال</h3>
        <p>{error}</p>
        <div className={styles.errorActions}>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryBtn}
          >
            إعادة المحاولة
          </button>
          <button
            onClick={() => router.push('/')}
            className={styles.homeBtn}
          >
            <FontAwesomeIcon icon={faArrowRight} /> العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // حالة خطأ عام
  if (error) {
    return (
      <div className={styles.error}>
        <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryBtn}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // عرض المنشورات للجميع
  return (
    <main className={styles.postsPage}>
      <h2>
        <FontAwesomeIcon icon={faBullhorn} /> المنشورات العامة
      </h2>

      {/* رسالة تشجيعية للمستخدمين غير المسجلين */}
      {!user && (
        <div className={styles.infoBanner}>
          <FontAwesomeIcon icon={faInfoCircle} />
          <p>
            يمكنك مشاهدة المنشورات، لكن للتفاعل (إعجاب، تعليق، مشاركة) يرجى{" "}
            <button
              onClick={() => router.push('/login?redirect=/posts')}
              className={styles.loginLink}
            >
              تسجيل الدخول
            </button>
            {" "}أو{" "}
            <button
              onClick={() => router.push('/register?redirect=/posts')}
              className={styles.registerLink}
            >
              إنشاء حساب
            </button>
          </p>
        </div>
      )}

      <PostsList
        posts={posts}
        currentUserId={user?._id}
        onDelete={async (id) => {
          if (!user) return; // غير مسجل لا يمكنه الحذف
          try {
            await postService.delete(id);
            setPosts((prev) => prev.filter((p) => p._id !== id));
          } catch (err) {
            console.error("فشل حذف البوست:", err);
          }
        }}
        onReact={async (postId, reaction) => {
          if (!user) {
            router.push('/login?redirect=/posts');
            return;
          }
          try {
            const updated = await postService.addReaction(postId, reaction);
            setPosts((prev) =>
              prev.map((p) => (p._id === postId ? updated : p))
            );
          } catch (err) {
            console.error("فشل إضافة التفاعل:", err);
          }
        }}
        onComment={async (postId, comment) => {
          if (!user) {
            router.push('/login?redirect=/posts');
            return;
          }
          try {
            const updated = await postService.addComment(postId, comment);
            setPosts((prev) =>
              prev.map((p) => (p._id === postId ? updated : p))
            );
          } catch (err) {
            console.error("فشل إضافة التعليق:", err);
          }
        }}
        onShare={async (postId) => {
          if (!user) {
            router.push('/login?redirect=/posts');
            return;
          }
          try {
            const updated = await postService.addShare(postId);
            setPosts((prev) =>
              prev.map((p) => (p._id === postId ? updated : p))
            );
          } catch (err) {
            console.error("فشل مشاركة البوست:", err);
          }
        }}
        highlightId={highlightId}
      />
    </main>
  );
}

/**
 * الصفحة الرئيسية للمنشورات ملفوفة بـ Suspense
 * لضمان توافق useSearchParams مع Next.js App Router
 */
export default function PostsPage() {
  return (
    <Suspense fallback={
      <div className={styles.loading}>
        <FontAwesomeIcon icon={faSpinner} spin size="lg" />
        <p>جاري تحميل الصفحة...</p>
      </div>
    }>
      <PostsPageContent />
    </Suspense>
  );
}