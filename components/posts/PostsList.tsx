// components/posts/PostsList.tsx
// 📋 قائمة المنشورات مع دعم التمرير إلى منشور محدد
// @version 2.1.0
// @lastUpdated 2026

"use client";

import { useEffect, useRef, useState } from "react";
import { Post } from "@/types/Post";
import PostCard from "./PostCard";
import styles from "./PostsList.module.css";

interface PostsListProps {
  posts: Post[];
  onDelete?: (id: string) => Promise<void>;
  onReact: (postId: string, reaction: string) => void;
  onComment: (postId: string, comment: string) => void;
  onShare: (postId: string) => void;
  onFollow?: (userId: string) => Promise<void>;
  onUnfollow?: (userId: string) => Promise<void>;
  following?: Set<string>;
  currentUserId?: string;
  highlightId?: string; // معرف المنشور المراد التمرير إليه وتمييزه
}

/**
 * قائمة المنشورات
 * 
 * تعرض جميع المنشورات في شكل قائمة عمودية.
 * إذا تم توفير highlightId صالح، تقوم بالتمرير إلى ذلك المنشور
 * وتطبيق تأثير تمييز عليه بعد تحميل القائمة.
 */
export default function PostsList({
  posts,
  onDelete,
  onReact,
  onComment,
  onShare,
  onFollow,
  onUnfollow,
  following = new Set(),
  currentUserId,
  highlightId,
}: PostsListProps) {
  // خريطة تحتوي على مراجع لعناصر DOM لكل منشور
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [hasScrolled, setHasScrolled] = useState(false);

  // تأثير للتمرير إلى المنشور المحدد عند تغيير highlightId أو تحميل القائمة
  useEffect(() => {
    // نتأكد من وجود highlightId صالح (ليس undefined وليس 'undefined')
    if (!highlightId || highlightId === 'undefined' || hasScrolled) return;

    // ننتظر قليلاً للتأكد من أن جميع الـ refs قد تم تعيينها
    const timer = setTimeout(() => {
      const element = postRefs.current.get(highlightId);
      if (element) {
        // تمرير سلس إلى المنشور
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // إضافة تأثير تمييز مؤقت
        element.classList.add(styles.highlighted);
        setTimeout(() => {
          element.classList.remove(styles.highlighted);
        }, 2000);

        setHasScrolled(true);
      } else {
        console.warn(`⚠️ لم يتم العثور على منشور بالمعرف: ${highlightId}`);
      }
    }, 300); // تأخير بسيط لضمان تحميل DOM

    return () => clearTimeout(timer);
  }, [highlightId, posts, hasScrolled]);

  if (!posts || posts.length === 0) {
    return (
      <div className={styles.noPosts}>
        <p>لا توجد منشورات بعد</p>
      </div>
    );
  }

  return (
    <div className={styles.postsList}>
      {posts.map((post) => (
        <div
          key={post._id}
          ref={(el) => {
            if (el) {
              postRefs.current.set(post._id, el);
            } else {
              postRefs.current.delete(post._id);
            }
          }}
          id={`post-${post._id}`}
        >
          <PostCard
            post={post}
            onDelete={onDelete}
            onReact={onReact}
            onComment={onComment}
            onShare={onShare}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            currentUserId={currentUserId}
            isFollowing={following.has(post.author?._id || '')}
          />
        </div>
      ))}
    </div>
  );
}