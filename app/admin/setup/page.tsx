"use client";

// app/admin/setup/page.tsx
// 👑 مسؤول: صفحة إعداد الأدمن بعد المصادقة
// @version 2.0.0
// @lastUpdated 2026

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.css";

export default function AdminSetupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // التحقق من المصادقة
    const isSuperAdmin = sessionStorage.getItem('isSuperAdmin');
    if (!isSuperAdmin) {
      router.push('/admin-login');
      return;
    }

    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const token = btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`);
      
      const response = await fetch('http://localhost:5000/api/super-admin/status', {
        headers: {
          'Authorization': `Basic ${token}`
        }
      });
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('فشل التحقق من حالة النظام');
    } finally {
      setLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    try {
      setLoading(true);
      // تسجيل الدخول باستخدام بيانات الأدمن من .env
      await login(process.env.NEXT_PUBLIC_ADMIN_EMAIL!, process.env.NEXT_PUBLIC_ADMIN_PASS!);
      
      // ✅ التوجيه إلى لوحة التحكم الكاملة
      router.push('/admin');
      
    } catch (err) {
      setError('فشل تسجيل الدخول كأدمن');
      setLoading(false);
    }
  };

  const goToAdminDashboard = () => {
    // ✅ التوجيه المباشر إلى لوحة التحكم
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>إعداد نظام الأدمن</h1>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.statusCard}>
        <h2>حالة النظام</h2>
        <p>هل يوجد أدمن؟ {status?.hasAdmin ? '✅ نعم' : '❌ لا'}</p>
        <p>عدد الأدمن: {status?.adminsCount || 0}</p>
      </div>
      
      {!status?.hasAdmin ? (
        <div className={styles.setupCard}>
          <h2>إنشاء أول أدمن</h2>
          <p>سيتم إنشاء حساب الأدمن الأول باستخدام بيانات ملف .env</p>
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                const token = btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`);
                const response = await fetch('http://localhost:5000/api/super-admin/create-first-admin', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${token}`
                  }
                });
                
                if (response.ok) {
                  alert('✅ تم إنشاء حساب الأدمن بنجاح!');
                  
                  // ✅ بعد الإنشاء، سجل الدخول واذهب للوحة التحكم
                  await login(process.env.NEXT_PUBLIC_ADMIN_EMAIL!, process.env.NEXT_PUBLIC_ADMIN_PASS!);
                  router.push('/admin');
                } else {
                  const errorData = await response.json();
                  throw new Error(errorData.message || 'فشل إنشاء الأدمن');
                }
              } catch (err: any) {
                setError(err.message || 'فشل إنشاء الأدمن');
              } finally {
                setLoading(false);
              }
            }}
            className={styles.createButton}
          >
            إنشاء حساب الأدمن الأول
          </button>
        </div>
      ) : (
        <div className={styles.loginCard}>
          <h2>تمتلك حساب أدمن بالفعل</h2>
          <p>يمكنك الآن الذهاب إلى لوحة التحكم الكاملة</p>
          
          <div className={styles.buttonGroup}>
            <button 
              onClick={loginAsAdmin}
              className={styles.loginButton}
            >
              تسجيل الدخول كأدمن
            </button>
            
            <button 
              onClick={goToAdminDashboard}
              className={styles.dashboardButton}
            >
              الذهاب إلى لوحة التحكم
            </button>
          </div>
          
          <p className={styles.note}>
            ✨ لوحة التحكم الكاملة تتيح لك إدارة المستخدمين والمنشورات والرسائل والإشعارات
          </p>
        </div>
      )}
    </div>
  );
}