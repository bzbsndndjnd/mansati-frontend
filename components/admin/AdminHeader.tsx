"use client";

// components/admin/AdminHeader.tsx
// 👑 مسؤول: شريط العنوان العلوي في لوحة التحكم مع عرض صورة المدير

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FaBell, FaUserCircle, FaSignOutAlt, FaCog, FaSearch } from "react-icons/fa";
import styles from "./AdminHeader.module.css";

// دالة مساعدة لبناء الرابط الكامل للصورة
const getFullImageUrl = (path?: string | null): string => {
  if (!path) return "/default-avatar.png";
  if (path.startsWith("http")) return path;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
};

export default function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState(3); // عدد الإشعارات
  const [searchQuery, setSearchQuery] = useState("");

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.userMenu}`)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {/* شريط البحث */}
        <form onSubmit={handleSearch} className={styles.searchBar}>
          <input
            type="text"
            placeholder="بحث في لوحة التحكم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            <FaSearch />
          </button>
        </form>

        {/* القائمة اليمنى */}
        <div className={styles.rightSection}>
          {/* الإشعارات */}
          <button className={styles.notificationBtn}>
            <FaBell />
            {notifications > 0 && (
              <span className={styles.notificationBadge}>{notifications}</span>
            )}
          </button>

          {/* قائمة المستخدم */}
          <div className={styles.userMenu}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={styles.userBtn}
            >
              {user?.avatar ? (
                <img
                  src={getFullImageUrl(user.avatar)}
                  alt={user.name || "Admin"}
                  className={styles.userAvatar}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-avatar.png";
                  }}
                />
              ) : (
                <FaUserCircle className={styles.userIcon} />
              )}
              <span className={styles.userName}>{user?.name || 'أدمن'}</span>
            </button>

            {showDropdown && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <p className={styles.dropdownName}>{user?.name}</p>
                  <p className={styles.dropdownEmail}>{user?.email}</p>
                </div>

                <div className={styles.dropdownMenu}>
                  <button
                    onClick={() => router.push('/admin/profile')}
                    className={styles.dropdownItem}
                  >
                    <FaUserCircle />
                    <span>الملف الشخصي</span>
                  </button>

                  <button
                    onClick={() => router.push('/admin/settings')}
                    className={styles.dropdownItem}
                  >
                    <FaCog />
                    <span>الإعدادات</span>
                  </button>

                  <div className={styles.dropdownDivider}></div>

                  <button
                    onClick={logout}
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                  >
                    <FaSignOutAlt />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}