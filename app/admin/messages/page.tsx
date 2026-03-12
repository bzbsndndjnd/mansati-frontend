"use client";

// app/admin/messages/page.tsx
// 💬 إدارة الرسائل - نسخة محسنة مع عرض جميع المحادثات
// @version 3.1.0
// @lastUpdated 2026-03-12

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import adminService, { Conversation, MessageDetail, MessagesStats } from "@/services/adminService";
import { secureLog, sanitizeImageUrl } from "@/utils/security";
import {
  FaSearch, FaTrash, FaEye, FaUserCircle, FaSync,
  FaChevronRight, FaEnvelope, FaEnvelopeOpen, FaUser,
  FaCalendarAlt, FaCheck, FaTimes, FaArrowLeft,
  FaUsers, FaComments, FaExclamationTriangle
} from "react-icons/fa";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات (لم نعد بحاجة لتعريف Conversation هنا)
// ============================================================================

interface Message extends MessageDetail {
  // يمكن إضافة خصائص إضافية إذا لزم الأمر
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'conversations' | 'messages'>('conversations');
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<MessagesStats>({ 
    totalMessages: 0, 
    unreadMessages: 0, 
    totalConversations: 0,
    messagesToday: 0,
    activeConversations: 0
  });
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router]);

  // تحميل إحصائيات الرسائل
  const loadStats = useCallback(async () => {
    try {
      const statsData = await adminService.getMessagesStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // تحميل جميع المحادثات
  const loadAllConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 [AdminMessages] Loading all conversations...');
      const response = await adminService.getAllConversations({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined
      });
      
      console.log('📥 [AdminMessages] Conversations data:', response.data);
      setConversations(response.data);
      
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
      
      // تحميل الإحصائيات
      await loadStats();
      
    } catch (err) {
      console.error('❌ Failed to load conversations:', err);
      setError('فشل تحميل المحادثات');
      secureLog.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, loadStats]);

  // تحميل رسائل محادثة محددة
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📥 [AdminMessages] Loading messages for conversation: ${conversationId}`);
      const response = await adminService.getConversationMessages(conversationId, {
        page: 1,
        limit: 100
      });
      
      setMessages(response.data as Message[]);
      
    } catch (err) {
      console.error('❌ Failed to load messages:', err);
      setError('فشل تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllConversations();
  }, [loadAllConversations]);

  // البحث بتأخير
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        loadAllConversations();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [search]);

  // فتح محادثة
  const openConversation = (conversationId: string) => {
    setSelectedConv(conversationId);
    setViewMode('messages');
    loadConversationMessages(conversationId);
  };

  // العودة للمحادثات
  const backToConversations = () => {
    setViewMode('conversations');
    setSelectedConv(null);
    setMessages([]);
    setSelectedMsgs(new Set());
    setExpandedMsg(null);
  };

  // اختيار رسالة
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedMsgs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMsgs(newSet);
  };

  // اختيار الكل
  const selectAll = () => {
    if (selectedMsgs.size === messages.length) {
      setSelectedMsgs(new Set());
    } else {
      setSelectedMsgs(new Set(messages.map(m => m._id)));
    }
  };

  // توسيع/طي رسالة
  const toggleExpand = (id: string) => {
    setExpandedMsg(expandedMsg === id ? null : id);
  };

  // طلب حذف رسالة
  const requestDelete = (id: string) => {
    setMessageToDelete(id);
    setShowConfirm(true);
  };

  // تأكيد حذف رسالة
  const confirmDelete = async () => {
    if (!messageToDelete) return;
    
    try {
      await adminService.deleteMessage(messageToDelete);
      setMessages(prev => prev.filter(m => m._id !== messageToDelete));
      
      // تحديث المحادثات بعد الحذف
      if (selectedConv) {
        const updatedConv = conversations.map(conv => {
          if (conv._id === selectedConv) {
            return {
              ...conv,
              messagesCount: conv.messagesCount - 1,
              lastMessage: messages.find(m => m._id !== messageToDelete) || conv.lastMessage
            };
          }
          return conv;
        });
        setConversations(updatedConv);
      }
      
      secureLog.info(`Message ${messageToDelete} deleted`);
    } catch (err) {
      console.error('❌ Delete failed:', err);
      setError('فشل حذف الرسالة');
    } finally {
      setShowConfirm(false);
      setMessageToDelete(null);
    }
  };

  // حذف محادثة كاملة
  const deleteConversation = async (conversationId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟')) return;
    
    try {
      await adminService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      if (selectedConv === conversationId) {
        backToConversations();
      }
      secureLog.info(`Conversation ${conversationId} deleted`);
    } catch (err) {
      console.error('❌ Delete conversation failed:', err);
      setError('فشل حذف المحادثة');
    }
  };

  // حذف جماعي للرسائل
  const bulkDelete = async () => {
    if (selectedMsgs.size === 0) return;
    
    try {
      setLoading(true);
      await Promise.all(
        Array.from(selectedMsgs).map(id => adminService.deleteMessage(id))
      );
      
      if (selectedConv) {
        await loadConversationMessages(selectedConv);
      }
      setSelectedMsgs(new Set());
      secureLog.info(`Bulk deleted ${selectedMsgs.size} messages`);
      
    } catch (err) {
      console.error('❌ Bulk delete failed:', err);
      setError('فشل حذف الرسائل');
    } finally {
      setLoading(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays < 7) return `منذ ${diffDays} يوم`;
      
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'تاريخ غير معروف';
    }
  };

  // الحصول على اسم المشارك الآخر في المحادثة
  const getOtherParticipant = (conv: Conversation) => {
    const other = conv.participants.find(p => p._id !== user?._id);
    return other || conv.participants[0];
  };

  if (user?.role !== 'admin') return null;

  if (loading && viewMode === 'conversations' && conversations.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>جاري تحميل المحادثات...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaEnvelope className={styles.titleIcon} />
            إدارة الرسائل
          </h1>
          <p className={styles.subtitle}>
            عرض وإدارة جميع المحادثات والرسائل في النظام
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.stats}>
            <span className={styles.stat} title="إجمالي الرسائل">
              <FaEnvelope />
              {stats.totalMessages.toLocaleString()}
            </span>
            <span className={styles.stat} title="المحادثات النشطة">
              <FaComments />
              {stats.totalConversations}
            </span>
            <span className={styles.stat} title="الرسائل غير المقروءة">
              <FaEnvelopeOpen />
              {stats.unreadMessages}
            </span>
            <span className={styles.stat} title="رسائل اليوم">
              <FaCalendarAlt />
              {stats.messagesToday}
            </span>
          </div>
          
          <button
            onClick={viewMode === 'conversations' ? loadAllConversations : () => selectedConv && loadConversationMessages(selectedConv)}
            className={styles.refreshBtn}
            disabled={loading}
            title="تحديث"
          >
            <FaSync className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </header>

      {/* Navigation Bar */}
      {viewMode === 'messages' && (
        <div className={styles.navBar}>
          <button onClick={backToConversations} className={styles.backBtn}>
            <FaArrowLeft />
            <span>العودة للمحادثات</span>
          </button>
        </div>
      )}

      {/* Search & Filters */}
      {viewMode === 'conversations' && (
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ابحث عن محادثة (باسم المستخدم)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedMsgs.size > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.bulkInfo}>
            تم اختيار {selectedMsgs.size} رسالة
          </span>
          <button
            onClick={bulkDelete}
            className={`${styles.bulkBtn} ${styles.deleteBulk}`}
            disabled={loading}
          >
            <FaTrash />
            <span>حذف المحدد</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {viewMode === 'conversations' ? (
          /* قائمة جميع المحادثات */
          <div className={styles.conversationsList}>
            {conversations.length === 0 ? (
              <div className={styles.emptyState}>
                <FaEnvelopeOpen className={styles.emptyIcon} />
                <p>لا توجد محادثات</p>
                {search && <p>لا توجد نتائج للبحث "{search}"</p>}
              </div>
            ) : (
              conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                const lastMsg = conv.lastMessage;
                const isUnread = conv.unreadCount > 0;
                
                return (
                  <div
                    key={conv._id}
                    className={`${styles.conversationCard} ${isUnread ? styles.unread : ''}`}
                    onClick={() => openConversation(conv._id)}
                  >
                    <div className={styles.avatarWrapper}>
                      {otherUser.avatar ? (
                        <img
                          src={sanitizeImageUrl(otherUser.avatar)}
                          alt={otherUser.name}
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          <FaUserCircle />
                        </div>
                      )}
                      {isUnread && (
                        <span className={styles.unreadBadge}>
                          {conv.unreadCount}
                        </span>
                      )}
                      {otherUser.role === 'admin' && (
                        <span className={styles.adminBadge} title="أدمن">👑</span>
                      )}
                    </div>

                    <div className={styles.convInfo}>
                      <div className={styles.convHeader}>
                        <div>
                          <h3 className={styles.userName}>
                            {otherUser.name}
                            {otherUser.role === 'admin' && (
                              <span className={styles.adminTag}>أدمن</span>
                            )}
                          </h3>
                          <span className={styles.participantsCount}>
                            {conv.participants.length} مشارك
                          </span>
                        </div>
                        <span className={styles.lastTime}>
                          {lastMsg && formatDate(lastMsg.createdAt)}
                        </span>
                      </div>

                      <div className={styles.lastMessage}>
                        {lastMsg && (
                          <>
                            <span className={styles.messageSender}>
                              {lastMsg.sender.name}: 
                            </span>
                            <span className={styles.messagePreview}>
                              {lastMsg.content.length > 50
                                ? `${lastMsg.content.substring(0, 50)}...`
                                : lastMsg.content}
                            </span>
                          </>
                        )}
                      </div>

                      <div className={styles.convStats}>
                        <span className={styles.msgCount}>
                          {conv.messagesCount || 0} رسالة
                        </span>
                        {!lastMsg?.read && (
                          <span className={styles.unreadTag}>
                            غير مقروءة
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv._id);
                      }}
                      className={styles.deleteConvBtn}
                      title="حذف المحادثة"
                    >
                      <FaTrash />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* قائمة رسائل المحادثة المحددة */
          <div className={styles.messagesSection}>
            {/* معلومات المحادثة الحالية */}
            {selectedConv && (
              <div className={styles.convHeader}>
                {(() => {
                  const conv = conversations.find(c => c._id === selectedConv);
                  if (!conv) return null;
                  
                  const participants = conv.participants;
                  
                  return (
                    <div className={styles.currentConvInfo}>
                      <div className={styles.participantsAvatars}>
                        {participants.slice(0, 3).map(p => (
                          <div key={p._id} className={styles.miniAvatar}>
                            {p.avatar ? (
                              <img src={sanitizeImageUrl(p.avatar)} alt={p.name} />
                            ) : (
                              <FaUserCircle />
                            )}
                          </div>
                        ))}
                        {participants.length > 3 && (
                          <span className={styles.moreParticipants}>+{participants.length - 3}</span>
                        )}
                      </div>
                      <div>
                        <h2 className={styles.convUsers}>
                          {participants.map(p => p.name).join('، ')}
                        </h2>
                        <p className={styles.convStats}>
                          {conv.messagesCount || 0} رسالة • 
                          آخر تحديث {formatDate(conv.updatedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* جدول الرسائل */}
            <div className={styles.tableWrapper}>
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <FaEnvelope className={styles.emptyIcon} />
                  <p>لا توجد رسائل في هذه المحادثة</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          onChange={selectAll}
                          checked={selectedMsgs.size === messages.length}
                          className={styles.checkbox}
                        />
                      </th>
                      <th>المرسل</th>
                      <th>المستقبل</th>
                      <th>الرسالة</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => {
                      const isExpanded = expandedMsg === msg._id;
                      
                      return (
                        <tr key={msg._id} className={styles.messageRow}>
                          <td className={styles.checkboxCell}>
                            <input
                              type="checkbox"
                              checked={selectedMsgs.has(msg._id)}
                              onChange={() => toggleSelect(msg._id)}
                              className={styles.checkbox}
                            />
                          </td>
                          <td>
                            <div className={styles.userCell}>
                              {msg.sender.avatar ? (
                                <img
                                  src={sanitizeImageUrl(msg.sender.avatar)}
                                  alt=""
                                  className={styles.userAvatar}
                                />
                              ) : (
                                <FaUserCircle className={styles.userAvatarIcon} />
                              )}
                              <span className={styles.userName}>
                                {msg.sender.name}
                              </span>
                              {msg.sender.role === 'admin' && (
                                <span className={styles.userTag}>أدمن</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.userCell}>
                              {msg.receiver.avatar ? (
                                <img
                                  src={sanitizeImageUrl(msg.receiver.avatar)}
                                  alt=""
                                  className={styles.userAvatar}
                                />
                              ) : (
                                <FaUserCircle className={styles.userAvatarIcon} />
                              )}
                              <span className={styles.userName}>
                                {msg.receiver.name}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div
                              className={styles.messageCell}
                              onClick={() => toggleExpand(msg._id)}
                            >
                              <p className={isExpanded ? styles.messageExpanded : styles.messagePreview}>
                                {msg.content}
                              </p>
                              {msg.content.length > 100 && !isExpanded && (
                                <span className={styles.expandHint}>
                                  اضغط لعرض المزيد
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${msg.read ? styles.read : styles.unread}`}>
                              {msg.read ? (
                                <>
                                  <FaCheck /> مقروءة
                                </>
                              ) : (
                                <>
                                  <FaTimes /> غير مقروءة
                                </>
                              )}
                            </span>
                          </td>
                          <td>
                            <div className={styles.dateCell}>
                              <FaCalendarAlt className={styles.dateIcon} />
                              <span>{formatDate(msg.createdAt)}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.actionCell}>
                              <button
                                onClick={() => router.push(`/messages/${msg.sender._id}`)}
                                className={styles.viewBtn}
                                title="عرض المحادثة"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={() => requestDelete(msg._id)}
                                className={styles.deleteBtn}
                                title="حذف الرسالة"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Pagination */}
      {viewMode === 'conversations' && pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1 || loading}
            className={styles.pageBtn}
          >
            السابق
          </button>
          <span className={styles.pageInfo}>
            صفحة {pagination.page} من {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages || loading}
            className={styles.pageBtn}
          >
            التالي
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>تأكيد الحذف</h3>
            <p className={styles.modalMessage}>
              هل أنت متأكد من حذف هذه الرسالة؟
              <br />
              <span className={styles.modalWarning}>لا يمكن التراجع عن هذا الإجراء</span>
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={confirmDelete}
                className={`${styles.modalBtn} ${styles.confirmBtn}`}
                disabled={loading}
              >
                {loading ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setMessageToDelete(null);
                }}
                className={`${styles.modalBtn} ${styles.cancelBtn}`}
                disabled={loading}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}