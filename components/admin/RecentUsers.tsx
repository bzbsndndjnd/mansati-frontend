"use client";

// components/admin/RecentUsers.tsx
// 👑 مسؤول: عرض آخر المستخدمين المسجلين - نسخة محسنة
// @version 4.0.0
// @lastUpdated 2026

import { useState, useEffect, useCallback } from "react";
import { FaUserCircle, FaTrash, FaBan, FaCheck, FaEye } from "react-icons/fa";
import adminService from "@/services/adminService";
import { secureLog, sanitizeImageUrl } from "@/utils/security";
import { useRouter } from "next/navigation";
import styles from "./RecentUsers.module.css";

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
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function RecentUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<'delete' | 'ban' | 'activate'>('delete');

  // تحميل المستخدمين
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 [RecentUsers] Loading users...');
      const response = await adminService.getUsers({ limit: 5 });
      console.log('📥 [RecentUsers] Response:', response);
      
      // ✅ التعامل مع جميع أشكال البيانات الممكنة
      let usersData: User[] = [];
      
      if (response?.success === true && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (Array.isArray(response)) {
        usersData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response?.users && Array.isArray(response.users)) {
        usersData = response.users;
      }
      
      console.log(`✅ [RecentUsers] Loaded ${usersData.length} users`);
      console.log('📥 [RecentUsers] First user sample:', usersData[0]);
      
      setUsers(usersData);
      
    } catch (err) {
      console.error('❌ Error loading users:', err);
      setError('فشل تحميل المستخدمين');
      secureLog.error('Failed to load recent users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // تنسيق التاريخ بأمان
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'غير معروف';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'تاريخ غير صالح';
      
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
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'تاريخ غير صالح';
    }
  }, []);

  // التعامل مع إجراءات المستخدم
  const handleUserAction = useCallback((user: User, action: 'delete' | 'ban' | 'activate') => {
    setSelectedUser(user);
    setActionType(action);
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
      }
    } catch (err) {
      console.error('❌ Action failed:', err);
      setError('فشل تنفيذ الإجراء');
    } finally {
      setShowConfirm(false);
      setSelectedUser(null);
    }
  }, [selectedUser, actionType]);

  // عرض حالة التحميل
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  // عرض الخطأ
  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={loadUsers} className={styles.retryButton}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>آخر المستخدمين</h2>
        <button 
          onClick={() => router.push('/admin/users')}
          className={styles.viewAllButton}
        >
          عرض الكل
        </button>
      </div>

      <div className={styles.userList}>
        {users.length === 0 ? (
          <div className={styles.empty}>
            <p>لا يوجد مستخدمين</p>
          </div>
        ) : (
          users.map((user) => {
            // التحقق من صحة البيانات قبل العرض
            if (!user || typeof user !== 'object') {
              console.warn('Invalid user data:', user);
              return null;
            }

            return (
              <div key={user._id || Math.random()} className={styles.userItem}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {user.avatar ? (
                      <img 
                        src={sanitizeImageUrl(user.avatar)}
                        alt={user.name || 'مستخدم'}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <FaUserCircle className={styles.avatarIcon} />
                    )}
                  </div>
                  
                  <div className={styles.userDetails}>
                    <h4>{user.name || 'بدون اسم'}</h4>
                    <p className={styles.userEmail}>{user.email || 'بريد غير متوفر'}</p>
                    <div className={styles.userMeta}>
                      <span className={`${styles.badge} ${styles[user.role] || 'user'}`}>
                        {user.role === 'admin' ? 'أدمن' : 
                         user.role === 'moderator' ? 'مشرف' : 'مستخدم'}
                      </span>
                      <span className={`${styles.status} ${user.isActive ? styles.active : styles.inactive}`}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </span>
                      <span className={styles.joinDate}>
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.userActions}>
                  {/* ✅ تم تعديل الرابط لفتح صفحة الملف الشخصي العامة */}
                  <button
                    onClick={() => router.push(`/profile/${user._id}`)}
                    className={`${styles.actionButton} ${styles.view}`}
                    title="عرض الملف الشخصي"
                  >
                    <FaEye />
                  </button>

                  {user.isActive ? (
                    <button
                      onClick={() => handleUserAction(user, 'ban')}
                      className={`${styles.actionButton} ${styles.ban}`}
                      title="تعطيل المستخدم"
                    >
                      <FaBan />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(user, 'activate')}
                      className={`${styles.actionButton} ${styles.activate}`}
                      title="تفعيل المستخدم"
                    >
                      <FaCheck />
                    </button>
                  )}

                  <button
                    onClick={() => handleUserAction(user, 'delete')}
                    className={`${styles.actionButton} ${styles.delete}`}
                    title="حذف المستخدم"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* نافذة تأكيد الإجراء */}
      {showConfirm && selectedUser && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h3>تأكيد الإجراء</h3>
            <p>
              {actionType === 'delete' && `هل أنت متأكد من حذف المستخدم "${selectedUser.name}"؟`}
              {actionType === 'ban' && `هل أنت متأكد من تعطيل المستخدم "${selectedUser.name}"؟`}
              {actionType === 'activate' && `هل أنت متأكد من تفعيل المستخدم "${selectedUser.name}"؟`}
            </p>
            <div className={styles.confirmActions}>
              <button onClick={confirmAction} className={styles.confirmYes}>
                تأكيد
              </button>
              <button onClick={() => setShowConfirm(false)} className={styles.confirmNo}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}