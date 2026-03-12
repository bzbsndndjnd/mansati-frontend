// components/posts/PostsList.tsx
// 📋 قائمة المنشورات مع دعم التمرير إلى منشور محدد
// @version 2.1.1
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
  highlightId?: string;
}

// دالة مساعدة لاستخراج معرف الكاتب من كائن المنشور
const getAuthorId = (post: Post): string => {
  if (!post.author) return '';
  if (typeof post.author === 'object' && post.author._id) {
    return post.author._id;
  }
  if (typeof post.author === 'string') {
    return post.author;
  }
  return '';
};

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
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (!highlightId || highlightId === 'undefined' || hasScrolled) return;

    const timer = setTimeout(() => {
      const element = postRefs.current.get(highlightId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        element.classList.add(styles.highlighted);
        setTimeout(() => {
          element.classList.remove(styles.highlighted);
        }, 2000);

        setHasScrolled(true);
      } else {
        console.warn(`⚠️ لم يتم العثور على منشور بالمعرف: ${highlightId}`);
      }
    }, 300);

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
      {posts.map((post) => {
        const authorId = getAuthorId(post);
        return (
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
              isFollowing={following.has(authorId)}
            />
          </div>
        );
      })}
    </div>
  );
}