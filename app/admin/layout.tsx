"use client";

// app/admin/layout.tsx
// 👑 مسؤول: تخطيط صفحة الأدمن

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import styles from "./admin.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      // التحقق من صلاحيات الأدمن
      if (!user) {
        router.push("/login");
      } else if (user.role !== 'admin') {
        router.push("/");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !isAuthorized) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.mainContent}>
        <AdminHeader />
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}