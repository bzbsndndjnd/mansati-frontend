"use client";

import { useState, useEffect } from "react";
import adminService from "../../services/adminService";
import StatsCards from "@/app/admin/StatsCards";
import RecentUsers from "@/components/admin/RecentUsers";
import RecentPosts from "@/components/admin/RecentPosts";
import SystemHealth from "@/components/admin/SystemHealth";
import styles from "./page.module.css";

// 1. تعريف واجهة البيانات بشكل دقيق لحل مشكلة الـ Types
interface Admin {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string; // تأكدنا أنها string وليست undefined
}

// تعريف واجهة الإحصائيات (استبدلها بالقيم الفعلية لديك إذا كانت تختلف)
interface DashboardStats {
  usersCount?: number;
  postsCount?: number;
  [key: string]: any; 
}

export default function AdminDashboard() {
  // 2. تصحيح الـ useState لتجنب خطأ SetStateAction<null>
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. دالة معالجة رابط الصورة لضمان ظهورها في كل مكان
  const getAvatarUrl = (path?: string) => {
    if (!path) return "/default-avatar.png";
    if (path.startsWith("http")) return path;
    const API_BASE = "http://localhost:5000"; // تأكد من مطابقة رابط سيرفرك
    return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, adminData] = await Promise.all([
          adminService.getStats(),
          adminService.getCurrentAdmin().catch(() => null),
        ]);

        // 4. تحويل البيانات (Type Casting) لضمان توافق الأنواع
        setStats(statsData as DashboardStats);
        
        if (adminData) {
            setAdmin(adminData as Admin);
        }
        
        setError(null);
      } catch (err: any) {
        console.error("❌ Error loading dashboard:", err);
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
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>حدث خطأ</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {admin && (
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
          </div>
        </div>
      )}

      <h1 className={styles.title}>لوحة التحكم</h1>

      <StatsCards stats={stats} />

      <div className={styles.grid}>
        <div className={styles.gridItem}>
          <RecentUsers />
        </div>
        <div className={styles.gridItem}>
          <RecentPosts />
        </div>
      </div>

      <SystemHealth />
    </div>
  );
}