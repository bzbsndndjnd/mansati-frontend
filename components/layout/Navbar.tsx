"use client";
import styles from "./Navbar.module.css";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { FaTachometerAlt } from "react-icons/fa"; // ✅ استيراد أيقونة الأدمن

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className={styles.navbar}>
      <div className={styles.navbarContainer}>
        {/* شعار المنصة */}
        <Link href="/" className={styles.logo}>
          منصتي
        </Link>

        {/* روابط التنقل */}
        <nav className={styles.navLinks}>
          <Link href="/">الرئيسية</Link>
          <Link href="/posts">المنشورات</Link>
          <Link href="/users">المستخدمون</Link>
          
          {/* ✅ زر لوحة التحكم - يظهر فقط للأدمن */}
          {user?.role === 'admin' && (
            <Link href="/admin" className={styles.adminLink}>
              <FaTachometerAlt />
              <span>لوحة التحكم</span>
            </Link>
          )}
        </nav>

        {/* أزرار الدخول والخروج */}
        <div className={styles.authActions}>
          {!user ? (
            // المستخدم غير مسجل دخول
            <>
              <Link href="/login" className="btn-outline">
                دخول
              </Link>
              <Link href="/register" className="btn-primary">
                تسجيل
              </Link>
            </>
          ) : (
            // المستخدم مسجل دخول
            <>
              <Link href={`/profile/${user._id}`} className="btn-outline">
                البروفايل
              </Link>

              {/* زر الخروج يظهر فقط في صفحة البروفايل */}
              {pathname.startsWith("/profile") && (
                <button onClick={logout} className="btn-danger">
                  خروج
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}