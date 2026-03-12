"use client";

// app/register/page.tsx
// 📝 صفحة التسجيل - نسخة محسنة بالكامل مع معالجة الأنواع
// @version 2.0.0
// @lastUpdated 2026

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/types/User";
import styles from "./page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  // دالة التحقق من صحة المدخلات
  const validateForm = () => {
    if (password !== confirmPassword) {
      setError("كلمة المرور غير متطابقة");
      return false;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return false;
    }

    if (name.length < 2) {
      setError("الاسم يجب أن يكون حرفين على الأقل");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("البريد الإلكتروني غير صالح");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('🔵 [Register] Starting registration...');
      
      // استدعاء دالة التسجيل - قد ترجع User مباشرة أو { user: User }
      const result = await register(name, email, password);
      
      // ✅ معالجة آمنة للنتيجة: قد تكون User أو { user: User }
      let user: User | null = null;
      
      if (result && typeof result === 'object') {
        // التحقق مما إذا كان result يحتوي على خاصية user (أي { user: User })
        if ('user' in result && result.user && typeof result.user === 'object') {
          user = result.user as User;
        } else {
          // افتراض أن result نفسه هو User
          user = result as User;
        }
      }

      if (!user || !user._id) {
        throw new Error('لم يتم استلام بيانات المستخدم بشكل صحيح');
      }

      console.log('✅ [Register] Success for:', user.email);
      
      // التوجيه إلى البروفايل بعد التسجيل الناجح
      router.push(`/profile/${user._id}`);
      
    } catch (err: any) {
      console.error('❌ [Register] Error:', err);
      setError(err.message || "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      <form onSubmit={handleSubmit} className={styles.registerForm} noValidate>
        <h1>إنشاء حساب جديد</h1>
        
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        
        <div className={styles.formGroup}>
          <label htmlFor="name">الاسم</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            placeholder="الاسم الكامل"
            autoComplete="name"
            minLength={2}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">البريد الإلكتروني</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="example@domain.com"
            autoComplete="email"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">كلمة المرور</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="********"
            autoComplete="new-password"
            minLength={8}
          />
          <small className={styles.hint}>8 أحرف على الأقل</small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="********"
            autoComplete="new-password"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
        </button>

        <p className={styles.loginLink}>
          لديك حساب بالفعل؟ <Link href="/login">تسجيل الدخول</Link>
        </p>
      </form>
    </div>
  );
}