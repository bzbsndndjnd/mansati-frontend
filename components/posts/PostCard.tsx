"use client";

// 🎴 PostCard.tsx
// مسؤول: عرض منشور واحد بشكل آمن مع دعم المتابعة والمشاركة
// الإصدار: 3.1.0 | آخر تحديث: 2026

import { useState, useCallback, memo } from "react";
import { Post } from "@/types/Post";
import { formatDate } from "@/utils/formatDate";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeImageUrl, sanitizeInput, secureLog } from "@/utils/security";
import { MESSAGES } from "@/utils/constants";
import ShareModal from "./ShareModal";
import styles from "./PostCard.module.css";
import {
  FaUserCircle,
  FaTimes,
  FaComment,
  FaShare,
  FaRegHeart,
  FaUserPlus,
  FaUserCheck,
  FaHeart,
  FaRegComment,
  FaRegShareSquare,
} from "react-icons/fa";

interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => Promise<void>;
  onReact: (postId: string, reaction: string) => void;
  onComment: (postId: string, comment: string) => void;
  onShare: (postId: string) => void;
  onFollow?: (userId: string) => Promise<void>;
  onUnfollow?: (userId: string) => Promise<void>;
  currentUserId?: string;
  isFollowing?: boolean;
}

const PostCard = memo(({
  post,
  onDelete,
  onReact,
  onComment,
  onShare,
  onFollow,
  onUnfollow,
  currentUserId,
  isFollowing = false,
}: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const [showShareModal, setShowShareModal] = useState(false); // ✅ هنا داخل المكون
  const { user } = useAuth();

  const authorId = typeof post.author === "string" ? post.author : post.author?._id || '';
  const authorName = typeof post.author === "string" ? "مستخدم" : post.author?.name || "مستخدم";
  const authorAvatar = typeof post.author === "string" ? null : post.author?.avatar || null;
  
  const isOwner = currentUserId === authorId;
  const canFollow = !isOwner && currentUserId && (onFollow || onUnfollow);

  const userReaction = post.reactions?.find((r) => {
    const reactionUserId = typeof r.user === "object" ? r.user?._id : r.user;
    return reactionUserId === currentUserId;
  })?.type;

  // ==========================================================================
  // دوال المعالجة
  // ==========================================================================

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onComment(post._id, sanitizeInput(commentText));
      setCommentText("");
    } catch (error) {
      secureLog.error('فشل إضافة التعليق');
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, isSubmitting, onComment, post._id]);

  const handleReactionClick = useCallback((reaction: string) => {
    onReact(post._id, reaction);
    setShowReactions(false);
  }, [onReact, post._id]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  }, [handleAddComment]);

  const handleDelete = useCallback(async () => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
      try {
        await onDelete?.(post._id);
      } catch (error) {
        secureLog.error('فشل حذف المنشور');
        alert(MESSAGES.ERRORS.DEFAULT);
      }
    }
  }, [onDelete, post._id]);

  const handleFollowToggle = useCallback(async () => {
    if (!authorId || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (localIsFollowing) {
        await onUnfollow?.(authorId);
        setLocalIsFollowing(false);
      } else {
        await onFollow?.(authorId);
        setLocalIsFollowing(true);
      }
    } catch (error) {
      secureLog.error('فشل تحديث المتابعة');
    } finally {
      setFollowLoading(false);
    }
  }, [authorId, localIsFollowing, onFollow, onUnfollow, followLoading]);

  // ==========================================================================
  // التصيير
  // ==========================================================================

  return (
    <article className={styles.postCard}>
      {/* Header */}
      <header className={styles.postHeader}>
        <div className={styles.postAuthor}>
          {authorAvatar ? (
            <img
              src={sanitizeImageUrl(authorAvatar)}
              alt={authorName}
              className={styles.authorAvatar}
              loading="lazy"
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <FaUserCircle size={32} color="#65676b" />
            </div>
          )}
          
          <div className={styles.authorInfo}>
            <span className={styles.authorName}>{authorName}</span>
            <time className={styles.postDate} dateTime={post.createdAt}>
              {formatDate(post.createdAt)}
            </time>
          </div>

          {canFollow && (
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`${styles.followBtn} ${localIsFollowing ? styles.following : ''}`}
              aria-label={localIsFollowing ? "إلغاء المتابعة" : "متابعة"}
              title={localIsFollowing ? "إلغاء المتابعة" : "متابعة"}
            >
              {followLoading ? (
                <span className={styles.spinner}></span>
              ) : localIsFollowing ? (
                <FaUserCheck size={18} />
              ) : (
                <FaUserPlus size={18} />
              )}
              <span>{localIsFollowing ? 'متابَع' : 'متابعة'}</span>
            </button>
          )}
        </div>

        {isOwner && onDelete && (
          <button 
            onClick={handleDelete} 
            className={styles.deleteBtn}
            aria-label="حذف المنشور"
            title="حذف"
          >
            <FaTimes size={18} />
          </button>
        )}
      </header>

      {/* Content */}
      {post.content && (
        <div className={styles.postContent}>
          <p>{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className={styles.postMedia}>
          {post.media.map((m, idx) => {
            const fullPath = sanitizeImageUrl(m);
            return m.endsWith(".mp4") || m.endsWith(".mov") ? (
              <video
                key={idx}
                controls
                className={styles.postVideo}
              >
                <source src={fullPath} type="video/mp4" />
              </video>
            ) : (
              <img
                key={idx}
                src={fullPath}
                alt="media"
                className={styles.postImage}
                loading="lazy"
              />
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className={styles.postStats}>
        <span>
          <FaHeart className={styles.statIcon} />
          {post.reactions?.length || 0}
        </span>
        <span>
          <FaRegComment className={styles.statIcon} />
          {post.comments?.length || 0}
        </span>
        <span>
          <FaRegShareSquare className={styles.statIcon} />
          {post.shares?.length || 0}
        </span>
      </div>

      {/* Actions */}
      <div className={styles.postActions}>
        <div className={styles.reactionContainer}>
          <button
            className={`${styles.actionBtn} ${userReaction ? styles.activeReaction : ""}`}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            aria-label="تفاعل"
          >
            {userReaction ? (
              <>
                {userReaction === "like" && "👍"}
                {userReaction === "love" && "❤️"}
                {userReaction === "care" && "🤗"}
                {userReaction === "haha" && "😂"}
                {userReaction === "wow" && "😮"}
                {userReaction === "sad" && "😢"}
                {userReaction === "angry" && "😡"}
              </>
            ) : (
              <FaRegHeart />
            )}
            <span>إعجاب</span>
          </button>

          {showReactions && (
            <div 
              className={styles.reactionPicker}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <button onClick={() => handleReactionClick("like")} aria-label="إعجاب">👍</button>
              <button onClick={() => handleReactionClick("love")} aria-label="حب">❤️</button>
              <button onClick={() => handleReactionClick("care")} aria-label="اهتمام">🤗</button>
              <button onClick={() => handleReactionClick("haha")} aria-label="ضحك">😂</button>
              <button onClick={() => handleReactionClick("wow")} aria-label="مذهول">😮</button>
              <button onClick={() => handleReactionClick("sad")} aria-label="حزين">😢</button>
              <button onClick={() => handleReactionClick("angry")} aria-label="غاضب">😡</button>
            </div>
          )}
        </div>

        <button
          className={styles.actionBtn}
          onClick={() => setShowComments(!showComments)}
          aria-label="تعليق"
        >
          <FaComment />
          <span>تعليق</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={() => setShowShareModal(true)}
          aria-label="مشاركة"
        >
          <FaShare />
          <span>مشاركة</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className={styles.commentsSection}>
          {/* Add Comment */}
          <div className={styles.addComment}>
            <input
              type="text"
              placeholder="اكتب تعليقاً..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSubmitting}
              maxLength={500}
            />
            <button 
              onClick={handleAddComment} 
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? 'جاري...' : 'نشر'}
            </button>
          </div>

          {/* Comments List */}
          {post.comments && post.comments.length > 0 ? (
            <div className={styles.commentsList}>
              {post.comments.map((comment, idx) => {
                const commentUserName = typeof comment.user === "string"
                  ? comment.user
                  : comment.user?.name || "مستخدم";
                
                return (
                  <div key={idx} className={styles.comment}>
                    <strong>{commentUserName}:</strong> {comment.text}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.noComments}>لا توجد تعليقات بعد</p>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          postId={post._id}
          postTitle={post.title || post.content?.slice(0, 50)}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </article>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;