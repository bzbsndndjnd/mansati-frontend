"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // ✅ login تعيد كائن User مباشرة (وليس { user })
      const user = await login(email, password);
      
      // ✅ التوجيه حسب role المستخدم
      if (user.role === 'admin') {
        router.push('/admin'); // لوحة تحكم الأدمن
      } else {
        router.push(`/profile/${user._id}`); // بروفايل المستخدم العادي
      }
      
    } catch (error: any) {
      console.error("❌ Login failed:", error);
      setError(error.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1 className={styles.logo}>منصتي</h1>
          <h2>تسجيل الدخول</h2>
          <p>مرحباً بعودتك! يرجى إدخال بياناتك</p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span className={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
              className={styles.input}
            />
          </div>

          <button 
            type="submit" 
            className={styles.btnLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} aria-hidden="true"></span>
                جاري تسجيل الدخول...
              </>
            ) : (
              'دخول'
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p>
            ليس لديك حساب؟ <Link href="/register">إنشاء حساب جديد</Link>
          </p>
          <p className={styles.adminHint}>
            <span>🔑</span>
            للمطورين: <Link href="/admin-login">دخول الأدمن الخارق</Link>
          </p>
        </div>
      </div>
    </main>
  );
}