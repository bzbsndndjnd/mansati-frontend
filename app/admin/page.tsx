"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import adminService, { DashboardStats } from "@/services/adminService";
import StatsCards from "@/app/admin/StatsCards";
import RecentUsers from "@/components/admin/RecentUsers";
import RecentPosts from "@/components/admin/RecentPosts";
import SystemHealth from "@/components/admin/SystemHealth";
import { secureLog } from "@/utils/security";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات (نستخدم الأنواع المستوردة من adminService)
// ============================================================================

interface AdminProfile {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // حالات الحالة
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router]);

  // دالة معالجة رابط الصورة
  const getAvatarUrl = (path?: string): string => {
    if (!path) return "/default-avatar.png";
    if (path.startsWith("http")) return path;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    // إزالة الشرطة المكررة
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${cleanPath}`;
  };

  // تحميل البيانات
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // جلب الإحصائيات وبيانات الأدمن معاً
        const [statsData, adminData] = await Promise.all([
          adminService.getStats(),
          adminService.getCurrentAdmin().catch(() => null), // قد لا يكون متاحاً في كل البيئات
        ]);

        setStats(statsData);
        
        if (adminData) {
          setAdmin(adminData as AdminProfile);
        }

        secureLog.info("Admin dashboard data loaded successfully");
      } catch (err: any) {
        secureLog.error("Error loading admin dashboard", err);
        setError(err.message || "حدث خطأ أثناء تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>⚠️ حدث خطأ</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryButton}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* رأس الصفحة مع معلومات الأدمن */}
      {admin && (
        <div className={styles.adminHeader}>
          <div className={styles.adminProfile}>
            <img
              src={getAvatarUrl(admin.avatar)}
              alt={admin.name}
              className={styles.avatar}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-avatar.png";
              }}
            />
            <div className={styles.adminInfo}>
              <h2 className={styles.adminName}>{admin.name}</h2>
              <p className={styles.adminEmail}>{admin.email}</p>
              <span className={styles.adminRole}>مدير النظام</span>
            </div>
          </div>
        </div>
      )}

      <h1 className={styles.title}>📊 لوحة التحكم</h1>

      {/* بطاقات الإحصائيات */}
      <StatsCards stats={stats} />

      {/* الشبكة: آخر المستخدمين والمنشورات */}
      <div className={styles.grid}>
        <div className={styles.gridItem}>
          <RecentUsers />
        </div>
        <div className={styles.gridItem}>
          <RecentPosts />
        </div>
      </div>

      {/* حالة النظام */}
      <SystemHealth />
    </div>
  );
}