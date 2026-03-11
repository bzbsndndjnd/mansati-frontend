"use client";

// components/admin/AdminSidebar.tsx
// 👑 مسؤول: القائمة الجانبية مع عرض صورة المدير

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaUsers,
  FaFileAlt,
  FaEnvelope,
  FaCog,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";
import styles from "./AdminSidebar.module.css";

const menuItems = [
  { href: '/admin', icon: FaTachometerAlt, label: 'لوحة التحكم' },
  { href: '/admin/users', icon: FaUsers, label: 'المستخدمين' },
  { href: '/admin/posts', icon: FaFileAlt, label: 'المنشورات' },
  { href: '/admin/messages', icon: FaEnvelope, label: 'الرسائل' },
  { href: '/admin/settings', icon: FaCog, label: 'الإعدادات' },
];

// دالة مساعدة لبناء الرابط الكامل للصورة
const getFullImageUrl = (path?: string | null): string => {
  if (!path) return "/default-avatar.png";
  if (path.startsWith("http")) return path;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className={styles.sidebar}>
      {/* ملف المدير */}
      <div className={styles.profileSection}>
        <div className={styles.avatarWrapper}>
          <img
            src={getFullImageUrl(user?.avatar)}
            alt={user?.name || "المدير"}
            className={styles.avatar}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-avatar.png";
            }}
          />
        </div>
        <div className={styles.profileInfo}>
          <p className={styles.profileName}>{user?.name || "مدير النظام"}</p>
          <p className={styles.profileEmail}>{user?.email || "admin@example.com"}</p>
        </div>
      </div>

      {/* الشعار */}
      <div className={styles.logo}>
        <h2>لوحة التحكم</h2>
        <p>الإدارة</p>
      </div>

      {/* قائمة التنقل */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon className={styles.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* زر تسجيل الخروج */}
      <div className={styles.footer}>
        <button onClick={logout} className={styles.logoutButton}>
          <FaSignOutAlt />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}