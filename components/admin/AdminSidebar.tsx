"use client";

// components/admin/AdminSidebar.tsx
// 👑 مسؤول: القائمة الجانبية للوحة التحكم - نسخة محسنة بالكامل مع عرض صورة المدير

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  FaTachometerAlt, 
  FaUsers, 
  FaFileAlt, 
  FaEnvelope, 
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaChartBar,
  FaShieldAlt,
  FaDatabase,
  FaGlobe,
  FaUserCircle
} from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";
import { secureLog } from "@/utils/security";
import styles from "./AdminSidebar.module.css";

// ============================================================================
// دالة مساعدة لبناء الرابط الكامل للصورة
// ============================================================================
const getFullImageUrl = (path?: string | null): string => {
  if (!path) return "/default-avatar.png";
  if (path.startsWith("http")) return path;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
};

// ============================================================================
// الثوابت والإعدادات
// ============================================================================

interface MenuItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  permissions?: string[];
}

const MENU_ITEMS: MenuItem[] = [
  { href: '/admin', icon: FaTachometerAlt, label: 'لوحة التحكم' },
  { href: '/admin/users', icon: FaUsers, label: 'المستخدمين', badge: 12 },
  { href: '/admin/posts', icon: FaFileAlt, label: 'المنشورات', badge: 5 },
  { href: '/admin/messages', icon: FaEnvelope, label: 'الرسائل', badge: 3 },
  { href: '/admin/analytics', icon: FaChartBar, label: 'الإحصائيات' },
  { href: '/admin/system', icon: FaDatabase, label: 'النظام' },
  { href: '/admin/settings', icon: FaCog, label: 'الإعدادات' },
];

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // التحقق من حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // تسجيل الخروج
  const handleLogout = async () => {
    try {
      secureLog.info('Admin logging out');
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      secureLog.error('Admin logout failed');
    }
  };

  // التحقق من الصلاحيات
  const hasPermission = (item: MenuItem): boolean => {
    if (!item.permissions) return true;
    // يمكن إضافة منطق التحقق من الصلاحيات هنا
    return true;
  };

  return (
    <>
      {/* خلفية مظللة للجوال */}
      {isMobile && !isCollapsed && (
        <div 
          className={styles.overlay}
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        {/* زر التصغير/التوسيع */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.toggleButton}
          aria-label={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          <div className={styles.toggleIcon}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* الشعار */}
        <div className={styles.logo}>
          <FaShieldAlt className={styles.logoIcon} />
          {!isCollapsed && (
            <>
              <h2>لوحة التحكم</h2>
              <p>نظام إدارة متقدم</p>
            </>
          )}
        </div>

        {/* معلومات المستخدم */}
        {user && !isCollapsed && (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.avatar ? (
                <img 
                  src={getFullImageUrl(user.avatar)} 
                  alt={user.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-avatar.png";
                  }}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {user.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div className={styles.userDetails}>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className={styles.userRole}>أدمن</span>
            </div>
          </div>
        )}

        {/* قائمة التنقل */}
        <nav className={styles.nav}>
          {MENU_ITEMS.filter(hasPermission).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon className={styles.navIcon} />
                {!isCollapsed && (
                  <>
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.badge && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge && (
                  <span className={styles.navBadgeCollapsed}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* قسم الروابط السفلية */}
        <div className={styles.footer}>
          <Link
            href="/"
            className={styles.footerLink}
          >
            <FaGlobe className={styles.footerIcon} />
            {!isCollapsed && <span>الموقع الرئيسي</span>}
          </Link>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={styles.logoutButton}
          >
            <FaSignOutAlt className={styles.logoutIcon} />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>

        {/* نافذة تأكيد تسجيل الخروج */}
        {showLogoutConfirm && !isCollapsed && (
          <div className={styles.confirmDialog}>
            <p>هل أنت متأكد من تسجيل الخروج؟</p>
            <div className={styles.confirmActions}>
              <button onClick={handleLogout} className={styles.confirmYes}>
                نعم
              </button>
              <button onClick={() => setShowLogoutConfirm(false)} className={styles.confirmNo}>
                لا
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}