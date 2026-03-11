// components/posts/ShareModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FaCopy, FaPaperPlane, FaTimes, FaSearch, FaUserCircle, FaExternalLinkAlt } from "react-icons/fa";
import messageService from "@/services/messageService";
import { secureLog } from "@/utils/security";
import styles from "./ShareModal.module.css";

interface ShareModalProps {
  postId: string;
  postTitle?: string;
  onClose: () => void;
}

interface SearchUser {
  _id: string;
  name: string;
  avatar?: string;
}

export default function ShareModal({ postId, postTitle, onClose }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const mounted = useRef(true);

  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/posts/${postId}` : "";
  const postPath = `/posts/${postId}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // البحث عن المستخدمين مع debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await messageService.searchUsers(searchQuery);
        if (mounted.current) {
          setSearchResults(users);
        }
      } catch (error) {
        console.error("Search error:", error);
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => {
      if (mounted.current) setCopied(false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!selectedUser) return;
    setSending(true);
    try {
      const content = messageText.trim()
        ? `${messageText}\n\n${postTitle ? `**${postTitle}**\n` : ""}${postUrl}`
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
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
          <FaTimes />
        </button>

        <h3 className={styles.title}>مشاركة المنشور</h3>

        {/* قسم الرابط القابل للنقر والنسخ */}
        <div className={styles.section}>
          <p className={styles.label}>رابط المنشور</p>
          
          {/* رابط تشعبي أزرق (قابل للنقر مباشرة) */}
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

          {/* خيار النسخ الاحتياطي */}
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
            >
              {copied ? "✓ تم النسخ" : <><FaCopy /> نسخ</>}
            </button>
          </div>
        </div>

        <div className={styles.divider}>أو</div>

        {/* قسم إرسال عبر الرسائل */}
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