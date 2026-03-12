// components/posts/ShareModal.tsx
// 🔗 مشاركة المنشور - نسخة محسنة مع أمان وأداء عالي
// @version 3.0.1
// @lastUpdated 2026

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FaCopy, FaPaperPlane, FaTimes, FaSearch, FaUserCircle, FaExternalLinkAlt } from "react-icons/fa";
import messageService from "@/services/messageService";
import { secureLog, sanitizeInput } from "@/utils/security";
import { SECURITY_CONFIG } from "@/utils/constants";
import styles from "./ShareModal.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface SearchUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface ShareModalProps {
  postId: string;
  postTitle?: string;
  onClose: () => void;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function ShareModal({ postId, postTitle, onClose }: ShareModalProps) {
  // ==========================================================================
  // State
  // ==========================================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // ==========================================================================
  // Refs
  // ==========================================================================

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==========================================================================
  // Constants
  // ==========================================================================

  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/posts/${postId}` : "";
  const postPath = `/posts/${postId}`;

  // ==========================================================================
  // Effects
  // ==========================================================================

  // تهيئة mounted
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // البحث مع debounce وإلغاء الطلبات القديمة
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    // إلغاء أي طلب سابق
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    // إنشاء AbortController جديد
    abortControllerRef.current = new AbortController();

    searchTimeoutRef.current = setTimeout(async () => {
      if (!mounted.current) return;
      
      setIsSearching(true);
      try {
        const users = await messageService.searchUsers(
          sanitizeInput(searchQuery),
          { signal: abortControllerRef.current?.signal }
        );
        
        if (mounted.current) {
          setSearchResults(users || []);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          console.log('🛑 Search aborted');
          return;
        }
        console.error("Search error:", error);
        secureLog.error("خطأ في البحث عن المستخدمين");
        if (mounted.current) {
          setSearchResults([]);
        }
      } finally {
        if (mounted.current) {
          setIsSearching(false);
        }
      }
    }, 500);
  }, [searchQuery]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(postUrl);
    setCopied(true);
    const timer = setTimeout(() => {
      if (mounted.current) setCopied(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [postUrl]);

  const handleSendMessage = useCallback(async () => {
    if (!selectedUser) return;
    
    setSending(true);
    try {
      const safeMessage = sanitizeInput(messageText.trim());
      const content = safeMessage
        ? `${safeMessage}\n\n${postTitle ? `**${postTitle}**\n` : ""}${postUrl}`
        : `${postTitle ? `**${postTitle}**\n` : ""}${postUrl}`;

      await messageService.sendMessage(content, selectedUser._id);
      secureLog.info(`تم إرسال المنشور ${postId} إلى ${selectedUser.name}`);
      onClose();
    } catch (error) {
      console.error("Failed to send message:", error);
      secureLog.error("فشل إرسال المنشور عبر الرسائل");
    } finally {
      if (mounted.current) setSending(false);
    }
  }, [selectedUser, messageText, postTitle, postUrl, postId, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
          <FaTimes />
        </button>

        <h3 className={styles.title}>مشاركة المنشور</h3>

        {/* قسم الرابط */}
        <div className={styles.section}>
          <p className={styles.label}>رابط المنشور</p>
          
          {/* رابط تشعبي مباشر */}
          <div className={styles.linkRow}>
            <Link 
              href={postPath}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.postLink}
            >
              <FaExternalLinkAlt className={styles.linkIcon} />
              <span className={styles.linkText}>{postUrl}</span>
            </Link>
          </div>

          {/* خيار النسخ */}
          <div className={styles.copyRow}>
            <input
              type="text"
              value={postUrl}
              readOnly
              className={styles.urlInput}
              aria-label="رابط المنشور"
            />
            <button
              onClick={handleCopyLink}
              className={styles.copyBtn}
              aria-label={copied ? "تم النسخ" : "نسخ الرابط"}
              disabled={copied}
            >
              {copied ? "✓ تم النسخ" : <><FaCopy /> نسخ</>}
            </button>
          </div>
        </div>

        <div className={styles.divider}>أو</div>

        {/* قسم الإرسال عبر الرسائل */}
        <div className={styles.section}>
          <p className={styles.label}>إرسال عبر الرسائل الخاصة</p>

          {!selectedUser ? (
            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="ابحث باسم المستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="ابحث عن مستخدم"
                  maxLength={50} // ✅ قيمة ثابتة مناسبة للبحث
                />
                {isSearching && <span className={styles.searchSpinner} aria-label="جاري البحث" />}
              </div>

              {searchResults.length > 0 && (
                <div className={styles.searchResults} role="listbox">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      className={styles.userItem}
                      onClick={() => setSelectedUser(user)}
                      role="option"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className={styles.userAvatar}
                          loading="lazy"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <FaUserCircle className={styles.userAvatarIcon} />
                      )}
                      <span>{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.selectedUser}>
              <div className={styles.selectedUserInfo}>
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className={styles.selectedAvatar}
                    loading="lazy"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <FaUserCircle className={styles.selectedAvatarIcon} />
                )}
                <span>{selectedUser.name}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className={styles.changeUserBtn}
                aria-label="تغيير المستخدم"
              >
                تغيير
              </button>
            </div>
          )}

          {selectedUser && (
            <>
              <textarea
                placeholder="أضف رسالة (اختياري)..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className={styles.messageInput}
                rows={3}
                aria-label="نص الرسالة"
                maxLength={SECURITY_CONFIG.MAX_CONTENT_LENGTH}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending}
                className={styles.sendBtn}
                aria-label="إرسال"
              >
                {sending ? "جاري الإرسال..." : <><FaPaperPlane /> إرسال</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}