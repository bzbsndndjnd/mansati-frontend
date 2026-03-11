"use client";

// app/admin/posts/page.tsx
// 📝 إدارة المنشورات - نسخة احترافية كاملة
// @version 2.0.0
// @lastUpdated 2026

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import adminService from "@/services/adminService";
import { secureLog, sanitizeImageUrl } from "@/utils/security";
import {
  FaSearch, FaFilter, FaPlus, FaEdit, FaTrash,
  FaEye, FaUserCircle, FaSort, FaSortUp, FaSortDown,
  FaDownload, FaSync, FaChevronLeft, FaChevronRight,
  FaFileAlt, FaHeart, FaComment, FaShare, FaImage
} from "react-icons/fa";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface Post {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  media?: string[];
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  isReported?: boolean;
  reports?: number;
}

interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Filters {
  author: string;
  hasMedia: string;
  isReported: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function AdminPostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  const [filters, setFilters] = useState<Filters>({
    author: 'all',
    hasMedia: 'all',
    isReported: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router]);

  // تحميل المنشورات
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.author !== 'all') params.authorId = filters.author;
      if (filters.hasMedia !== 'all') params.hasMedia = filters.hasMedia === 'yes';
      if (filters.isReported !== 'all') params.isReported = filters.isReported === 'yes';
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      
      console.log('📥 [AdminPosts] Loading posts with params:', params);
      const response = await adminService.getPosts(params);
      
      setPosts(response.data || []);
      setPagination(response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      });
      
      setSelectedPosts(new Set());
      
    } catch (err) {
      console.error('❌ Failed to load posts:', err);
      setError('فشل تحميل المنشورات');
      secureLog.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // البحث بتأخير
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        loadPosts();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters.search, filters.author, filters.hasMedia, filters.isReported]);

  // تغيير الصفحة
  const changePage = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  // تغيير الترتيب
  const changeSort = useCallback((field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // اختيار كل المنشورات
  const selectAll = useCallback(() => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map(p => p._id)));
    }
  }, [posts, selectedPosts]);

  // اختيار منشور
  const toggleSelect = useCallback((postId: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  // حذف منشور
  const handleDelete = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowConfirm(true);
  }, []);

  // تأكيد الحذف
  const confirmDelete = useCallback(async () => {
    if (!selectedPost) return;

    try {
      await adminService.deletePost(selectedPost._id);
      setPosts(prev => prev.filter(p => p._id !== selectedPost._id));
      secureLog.info(`Post ${selectedPost._id} deleted`);
    } catch (err) {
      console.error('❌ Delete failed:', err);
      setError('فشل حذف المنشور');
    } finally {
      setShowConfirm(false);
      setSelectedPost(null);
    }
  }, [selectedPost]);

  // حذف جماعي
  const bulkDelete = useCallback(async () => {
    if (selectedPosts.size === 0) return;
    
    if (!confirm(`هل أنت متأكد من حذف ${selectedPosts.size} منشور؟`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      for (const postId of selectedPosts) {
        await adminService.deletePost(postId);
      }
      
      await loadPosts();
      secureLog.info(`Bulk delete completed for ${selectedPosts.size} posts`);
      
    } catch (err) {
      console.error('❌ Bulk delete failed:', err);
      setError('فشل حذف المنشورات');
    } finally {
      setLoading(false);
    }
  }, [selectedPosts, loadPosts]);

  // ✅ دالة آمنة لتنسيق التاريخ
  const formatDate = useCallback((dateString: string | undefined | null): string => {
    if (!dateString) return 'تاريخ غير معروف';
    
    try {
      const date = new Date(dateString);
      
      // التحقق من صحة التاريخ
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'تاريخ غير صالح';
      }
      
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'تاريخ غير صالح';
    }
  }, []);

  // ✅ دالة آمنة للحصول على نص آمن
  const safeString = useCallback((value: any, defaultValue: string = ''): string => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    
    // إذا كان الكائن، لا نعرضه مباشرة
    if (typeof value === 'object') {
      console.warn('Attempted to render object as string:', value);
      return defaultValue;
    }
    
    return defaultValue;
  }, []);

  // إذا لم يكن المستخدم أدمن
  if (user && user.role !== 'admin') return null;

  // حالة التحميل
  if (loading && posts.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل المنشورات...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* الهيدر */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaFileAlt className={styles.titleIcon} />
            إدارة المنشورات
          </h1>
          <p className={styles.subtitle}>
            عرض وإدارة جميع المنشورات في المنصة
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <button
            onClick={() => router.push('/posts/create')}
            className={styles.createButton}
          >
            <FaPlus />
            <span>منشور جديد</span>
          </button>
          
          <button
            onClick={() => loadPosts()}
            className={styles.refreshButton}
            disabled={loading}
          >
            <FaSync className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="ابحث في محتوى المنشورات..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className={styles.searchInput}
            disabled={loading}
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
        >
          <FaFilter />
          <span>فلترة</span>
        </button>
        
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`${styles.dateButton} ${showDatePicker ? styles.active : ''}`}
        >
          <span>📅</span>
          <span>التاريخ</span>
        </button>
      </div>

      {/* لوحة الفلترة */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>وسائط</label>
            <select
              value={filters.hasMedia}
              onChange={(e) => setFilters(prev => ({ ...prev, hasMedia: e.target.value }))}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="all">الكل</option>
              <option value="yes">مع وسائط</option>
              <option value="no">بدون وسائط</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>تبليغات</label>
            <select
              value={filters.isReported}
              onChange={(e) => setFilters(prev => ({ ...prev, isReported: e.target.value }))}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="all">الكل</option>
              <option value="yes">مبلغ عنه</option>
              <option value="no">غير مبلغ</option>
            </select>
          </div>
        </div>
      )}

      {/* منتقي التاريخ */}
      {showDatePicker && (
        <div className={styles.datePickerPanel}>
          <div className={styles.dateGroup}>
            <label className={styles.dateLabel}>من</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className={styles.dateInput}
              disabled={loading}
            />
          </div>
          
          <div className={styles.dateGroup}>
            <label className={styles.dateLabel}>إلى</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className={styles.dateInput}
              disabled={loading}
            />
          </div>
          
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined }));
              setShowDatePicker(false);
            }}
            className={styles.clearDateButton}
          >
            مسح
          </button>
        </div>
      )}

      {/* إجراءات جماعية */}
      {selectedPosts.size > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.bulkInfo}>
            تم اختيار {selectedPosts.size} منشور
          </span>
          <div className={styles.bulkButtons}>
            <button
              onClick={bulkDelete}
              className={`${styles.bulkButton} ${styles.deleteBulk}`}
            >
              <FaTrash />
              <span>حذف</span>
            </button>
          </div>
        </div>
      )}

      {/* شبكة المنشورات */}
      <div className={styles.postsGrid}>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <FaFileAlt className={styles.emptyIcon} />
            <p>لا يوجد منشورات</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className={styles.postCard}>
              {/* اختيار المنشور */}
              <div className={styles.postSelect}>
                <input
                  type="checkbox"
                  checked={selectedPosts.has(post._id)}
                  onChange={() => toggleSelect(post._id)}
                  className={styles.checkbox}
                  disabled={loading}
                />
              </div>

              {/* صورة المنشور (إذا وجدت) */}
              {post.media && post.media.length > 0 && (
                <div className={styles.postMedia}>
                  <img
                    src={sanitizeImageUrl(post.media[0])}
                    alt=""
                    className={styles.mediaImage}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  {post.media.length > 1 && (
                    <span className={styles.mediaCount}>
                      <FaImage /> +{post.media.length}
                    </span>
                  )}
                </div>
              )}

              {/* محتوى المنشور */}
              <div className={styles.postContent}>
                <p className={styles.postText}>
                  {safeString(post.content, 'لا يوجد محتوى').length > 150
                    ? `${safeString(post.content, 'لا يوجد محتوى').substring(0, 150)}...`
                    : safeString(post.content, 'لا يوجد محتوى')}
                </p>
              </div>

              {/* معلومات المنشور */}
              <div className={styles.postInfo}>
                <div className={styles.postAuthor}>
                  {post.author?.avatar ? (
                    <img
                      src={sanitizeImageUrl(post.author.avatar)}
                      alt={safeString(post.author?.name, 'مستخدم')}
                      className={styles.authorAvatar}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <FaUserCircle className={styles.authorAvatarIcon} />
                  )}
                  <span className={styles.authorName}>
                    {safeString(post.author?.name, 'مستخدم')}
                  </span>
                </div>
                
                <span className={styles.postDate}>
                  {formatDate(post.createdAt)}
                </span>
              </div>

              {/* إحصائيات المنشور - كلها أرقام وليست كائنات */}
              <div className={styles.postStats}>
                <span className={styles.statItem} title="إعجابات">
                  <FaHeart /> {typeof post.likes === 'number' ? post.likes : 0}
                </span>
                <span className={styles.statItem} title="تعليقات">
                  <FaComment /> {typeof post.comments === 'number' ? post.comments : 0}
                </span>
                <span className={styles.statItem} title="مشاركات">
                  <FaShare /> {typeof post.shares === 'number' ? post.shares : 0}
                </span>
                {post.isReported && (
                  <span className={styles.reportBadge} title={`${typeof post.reports === 'number' ? post.reports : 0} تبليغ`}>
                    ⚠️
                  </span>
                )}
              </div>

              {/* أزرار الإجراءات */}
              <div className={styles.postActions}>
                <button
                  onClick={() => router.push(`/posts/${post._id}`)}
                  className={`${styles.actionButton} ${styles.viewAction}`}
                  title="عرض المنشور"
                >
                  <FaEye />
                </button>
                
                <button
                  onClick={() => handleDelete(post)}
                  className={`${styles.actionButton} ${styles.deleteAction}`}
                  title="حذف المنشور"
                >
                  <FaTrash />
                </button>
              </div>

              {/* علامة التبليغ */}
              {post.isReported && (
                <div className={styles.reportedBadge}>
                  ⚠️ مبلغ عنه
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ترقيم الصفحات */}
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => changePage(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
            className={styles.pageButton}
          >
            <FaChevronRight />
          </button>
          
          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            let pageNum;
            if (pagination.pages <= 5) {
              pageNum = i + 1;
            } else if (pagination.page <= 3) {
              pageNum = i + 1;
            } else if (pagination.page >= pagination.pages - 2) {
              pageNum = pagination.pages - 4 + i;
            } else {
              pageNum = pagination.page - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => changePage(pageNum)}
                className={`${styles.pageButton} ${pagination.page === pageNum ? styles.activePage : ''}`}
                disabled={loading}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => changePage(pagination.page + 1)}
            disabled={pagination.page === pagination.pages || loading}
            className={styles.pageButton}
          >
            <FaChevronLeft />
          </button>
        </div>
      )}

      {/* نافذة تأكيد الحذف */}
      {showConfirm && selectedPost && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من حذف هذا المنشور؟</p>
            <p className={styles.confirmWarning}>⚠️ هذا الإجراء لا يمكن التراجع عنه</p>
            
            <div className={styles.confirmActions}>
              <button
                onClick={confirmDelete}
                className={styles.confirmYes}
                disabled={loading}
              >
                حذف
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className={styles.confirmNo}
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