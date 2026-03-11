"use client";

// app/admin-login/page.tsx
// 👑 مسؤول: صفحة دخول خاصة بإنشاء أول أدمن

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // إنشاء Basic Auth token
      const token = btoa(`${username}:${password}`);
      
      // محاولة إنشاء أول أدمن (إذا لم يكن موجوداً)
      const response = await fetch('http://localhost:5000/api/super-admin/create-first-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشل المصادقة');
      }

      // تخزين أن المستخدم أدمن مؤقتاً
      sessionStorage.setItem('isSuperAdmin', 'true');
      sessionStorage.setItem('superAdminToken', token);
      
      // توجيه إلى صفحة إعداد الأدمن
      router.push('/admin/setup');
      
    } catch (err: any) {
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1>دخول الأدمن الخارق</h1>
        <p className={styles.subtitle}>
          استخدم بيانات الدخول من ملف <code>.env</code>
        </p>
        
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="username">اسم المستخدم</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
        
        <div className={styles.note}>
          <p>📌 ملاحظة: هذه الصفحة خاصة بإنشاء أول أدمن في النظام</p>
          <p>بعد إنشاء الأدمن، يمكنك الدخول عبر صفحة تسجيل الدخول العادية</p>
        </div>

        <div className={styles.backLink}>
          <Link href="/login">← العودة لتسجيل الدخول العادي</Link>
        </div>
      </div>
    </div>
  );
}