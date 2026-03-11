"use client";

// app/admin/users/page.tsx
// 👥 إدارة المستخدمين - نسخة احترافية كاملة
// @version 1.0.0
// @lastUpdated 2026

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import adminService from "@/services/adminService";
import { secureLog, sanitizeImageUrl } from "@/utils/security";
import {
  FaSearch, FaFilter, FaUserPlus, FaEdit, FaTrash,
  FaBan, FaCheck, FaEye, FaUserCircle, FaSort,
  FaSortUp, FaSortDown, FaDownload, FaSync,
  FaChevronLeft, FaChevronRight, FaUserCog
} from "react-icons/fa";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  postsCount?: number;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Filters {
  role: string;
  isActive: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  const [filters, setFilters] = useState<Filters>({
    role: 'all',
    isActive: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<'delete' | 'ban' | 'activate' | 'edit'>('delete');
  const [editData, setEditData] = useState<{ role?: string; isActive?: boolean }>({});

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router]);

  // تحميل المستخدمين
  const loadUsers = useCallback(async () => {
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
      if (filters.role !== 'all') params.role = filters.role;
      if (filters.isActive !== 'all') params.isActive = filters.isActive === 'active';
      
      console.log('📥 [AdminUsers] Loading users with params:', params);
      const response = await adminService.getUsers(params);
      
      setUsers(response.data || []);
      setPagination(response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      });
      
      setSelectedUsers(new Set());
      
    } catch (err) {
      console.error('❌ Failed to load users:', err);
      setError('فشل تحميل المستخدمين');
      secureLog.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // البحث بتأخير
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        loadUsers();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters.search]);

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

  // اختيار كل المستخدمين
  const selectAll = useCallback(() => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u._id)));
    }
  }, [users, selectedUsers]);

  // اختيار مستخدم
  const toggleSelect = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  // فتح نافذة الإجراء
  const openAction = useCallback((user: User, action: 'delete' | 'ban' | 'activate' | 'edit') => {
    setSelectedUser(user);
    setActionType(action);
    if (action === 'edit') {
      setEditData({ role: user.role, isActive: user.isActive });
    }
    setShowConfirm(true);
  }, []);

  // تأكيد الإجراء
  const confirmAction = useCallback(async () => {
    if (!selectedUser) return;

    try {
      if (actionType === 'delete') {
        await adminService.deleteUser(selectedUser._id);
        setUsers(prev => prev.filter(u => u._id !== selectedUser._id));
        secureLog.info(`User ${selectedUser._id} deleted`);
      } else if (actionType === 'ban') {
        await adminService.updateUser(selectedUser._id, { isActive: false });
        setUsers(prev => prev.map(u => 
          u._id === selectedUser._id ? { ...u, isActive: false } : u
        ));
        secureLog.info(`User ${selectedUser._id} banned`);
      } else if (actionType === 'activate') {
        await adminService.updateUser(selectedUser._id, { isActive: true });
        setUsers(prev => prev.map(u => 
          u._id === selectedUser._id ? { ...u, isActive: true } : u
        ));
        secureLog.info(`User ${selectedUser._id} activated`);
      } else if (actionType === 'edit') {
        await adminService.updateUser(selectedUser._id, editData);
        setUsers(prev => prev.map(u => 
          u._id === selectedUser._id ? { ...u, ...editData } : u
        ));
        secureLog.info(`User ${selectedUser._id} updated`);
      }
    } catch (err) {
      console.error('❌ Action failed:', err);
      setError('فشل تنفيذ الإجراء');
    } finally {
      setShowConfirm(false);
      setSelectedUser(null);
      setEditData({});
    }
  }, [selectedUser, actionType, editData]);

  // تنفيذ إجراء جماعي
  const bulkAction = useCallback(async (action: 'delete' | 'ban' | 'activate') => {
    if (selectedUsers.size === 0) return;
    
    if (!confirm(`هل أنت متأكد من تطبيق هذا الإجراء على ${selectedUsers.size} مستخدم؟`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      for (const userId of selectedUsers) {
        if (action === 'delete') {
          await adminService.deleteUser(userId);
        } else if (action === 'ban') {
          await adminService.updateUser(userId, { isActive: false });
        } else if (action === 'activate') {
          await adminService.updateUser(userId, { isActive: true });
        }
      }
      
      await loadUsers();
      secureLog.info(`Bulk ${action} completed for ${selectedUsers.size} users`);
      
    } catch (err) {
      console.error('❌ Bulk action failed:', err);
      setError('فشل تنفيذ الإجراء الجماعي');
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, loadUsers]);

  // تصفية المستخدمين
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filters.role !== 'all' && user.role !== filters.role) return false;
      if (filters.isActive !== 'all' && user.isActive !== (filters.isActive === 'active')) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return user.name.toLowerCase().includes(searchLower) ||
               user.email.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [users, filters]);

  // إذا لم يكن المستخدم أدمن
  if (user && user.role !== 'admin') return null;

  // حالة التحميل
  if (loading && users.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* الهيدر */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaUserCog className={styles.titleIcon} />
            إدارة المستخدمين
          </h1>
          <p className={styles.subtitle}>
            عرض وإدارة جميع المستخدمين في المنصة
          </p>
        </div>
        
        <div className={styles.headerActions}>
          <button
            onClick={() => router.push('/admin/users/create')}
            className={styles.createButton}
          >
            <FaUserPlus />
            <span>مستخدم جديد</span>
          </button>
          
          <button
            onClick={() => loadUsers()}
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
            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
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
          {(filters.role !== 'all' || filters.isActive !== 'all') && (
            <span className={styles.filterBadge}>
              {[filters.role !== 'all' && 1, filters.isActive !== 'all' && 1].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* لوحة الفلترة */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>الدور</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="all">الكل</option>
              <option value="user">مستخدم</option>
              <option value="moderator">مشرف</option>
              <option value="admin">أدمن</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>الحالة</label>
            <select
              value={filters.isActive}
              onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
        </div>
      )}

      {/* إجراءات جماعية */}
      {selectedUsers.size > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.bulkInfo}>
            تم اختيار {selectedUsers.size} مستخدم
          </span>
          <div className={styles.bulkButtons}>
            <button
              onClick={() => bulkAction('activate')}
              className={`${styles.bulkButton} ${styles.activateBulk}`}
            >
              <FaCheck />
              <span>تفعيل</span>
            </button>
            <button
              onClick={() => bulkAction('ban')}
              className={`${styles.bulkButton} ${styles.banBulk}`}
            >
              <FaBan />
              <span>تعطيل</span>
            </button>
            <button
              onClick={() => bulkAction('delete')}
              className={`${styles.bulkButton} ${styles.deleteBulk}`}
            >
              <FaTrash />
              <span>حذف</span>
            </button>
          </div>
        </div>
      )}

      {/* جدول المستخدمين */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedUsers.size === users.length}
                  onChange={selectAll}
                  className={styles.checkbox}
                  disabled={loading}
                />
              </th>
              <th onClick={() => changeSort('name')} className={styles.sortableHeader}>
                المستخدم
                {filters.sortBy === 'name' && (
                  filters.sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                )}
              </th>
              <th>البريد الإلكتروني</th>
              <th onClick={() => changeSort('role')} className={styles.sortableHeader}>
                الدور
                {filters.sortBy === 'role' && (
                  filters.sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                )}
              </th>
              <th onClick={() => changeSort('isActive')} className={styles.sortableHeader}>
                الحالة
                {filters.sortBy === 'isActive' && (
                  filters.sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                )}
              </th>
              <th onClick={() => changeSort('createdAt')} className={styles.sortableHeader}>
                تاريخ التسجيل
                {filters.sortBy === 'createdAt' && (
                  filters.sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                )}
              </th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  لا يوجد مستخدمين
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id} className={styles.tableRow}>
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user._id)}
                      onChange={() => toggleSelect(user._id)}
                      className={styles.checkbox}
                      disabled={loading}
                    />
                  </td>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {user.avatar ? (
                          <img src={sanitizeImageUrl(user.avatar)} alt={user.name} />
                        ) : (
                          <FaUserCircle />
                        )}
                      </div>
                      <span className={styles.userName}>{user.name}</span>
                    </div>
                  </td>
                  <td className={styles.userEmail}>{user.email}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[user.role]}`}>
                      {user.role === 'admin' ? 'أدمن' :
                       user.role === 'moderator' ? 'مشرف' : 'مستخدم'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${user.isActive ? styles.active : styles.inactive}`}>
                      {user.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className={styles.actionsCell}>
                    <button
                      onClick={() => router.push(`/admin/users/${user._id}`)}
                      className={`${styles.actionButton} ${styles.viewAction}`}
                      title="عرض التفاصيل"
                    >
                      <FaEye />
                    </button>
                    
                    {user.isActive ? (
                      <button
                        onClick={() => openAction(user, 'ban')}
                        className={`${styles.actionButton} ${styles.banAction}`}
                        title="تعطيل المستخدم"
                      >
                        <FaBan />
                      </button>
                    ) : (
                      <button
                        onClick={() => openAction(user, 'activate')}
                        className={`${styles.actionButton} ${styles.activateAction}`}
                        title="تفعيل المستخدم"
                      >
                        <FaCheck />
                      </button>
                    )}
                    
                    <button
                      onClick={() => openAction(user, 'edit')}
                      className={`${styles.actionButton} ${styles.editAction}`}
                      title="تعديل المستخدم"
                    >
                      <FaEdit />
                    </button>
                    
                    <button
                      onClick={() => openAction(user, 'delete')}
                      className={`${styles.actionButton} ${styles.deleteAction}`}
                      title="حذف المستخدم"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* نافذة تأكيد الإجراء */}
      {showConfirm && selectedUser && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h3>تأكيد الإجراء</h3>
            
            {actionType === 'edit' ? (
              <div className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>الدور</label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData(prev => ({ ...prev, role: e.target.value }))}
                    className={styles.editSelect}
                  >
                    <option value="user">مستخدم</option>
                    <option value="moderator">مشرف</option>
                    <option value="admin">أدمن</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>الحالة</label>
                  <select
                    value={editData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                    className={styles.editSelect}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
                </div>
              </div>
            ) : (
              <p>
                {actionType === 'delete' && `هل أنت متأكد من حذف المستخدم "${selectedUser.name}"؟`}
                {actionType === 'ban' && `هل أنت متأكد من تعطيل المستخدم "${selectedUser.name}"؟`}
                {actionType === 'activate' && `هل أنت متأكد من تفعيل المستخدم "${selectedUser.name}"؟`}
              </p>
            )}
            
            {actionType === 'delete' && (
              <p className={styles.confirmWarning}>
                ⚠️ هذا الإجراء لا يمكن التراجع عنه
              </p>
            )}
            
            <div className={styles.confirmActions}>
              <button
                onClick={confirmAction}
                className={styles.confirmYes}
                disabled={loading}
              >
                تأكيد
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