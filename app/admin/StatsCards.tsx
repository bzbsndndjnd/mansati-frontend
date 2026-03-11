"use client";

// app/admin/StatsCards.tsx
// 👑 مسؤول: بطاقات الإحصائيات - نسخة محسنة بالكامل
// @version 4.0.0
// @lastUpdated 2026

import { FaUsers, FaFileAlt, FaEnvelope, FaBell } from "react-icons/fa";
import styles from "./StatsCards.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface StatsData {
  totalUsers: number;
  totalPosts: number;
  totalMessages: number;
  totalNotifications: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newPostsToday: number;
  adminsCount?: number;
}

interface StatsCardsProps {
  stats: StatsData | null;
  loading?: boolean;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function StatsCards({ stats, loading = false }: StatsCardsProps) {
  
  // ✅ دالة آمنة لتنسيق الأرقام
  const safeFormatNumber = (value: number | undefined | null): string => {
    try {
      if (value === undefined || value === null) return '0';
      return value.toLocaleString('ar-EG');
    } catch (error) {
      console.error('Error formatting number:', error);
      return '0';
    }
  };

  // ✅ دالة آمنة للحصول على القيمة
  const getSafeValue = (value: number | undefined | null): number => {
    return value ?? 0;
  };

  // عرض حالة التحميل
  if (loading) {
    return (
      <div className={styles.loading}>
        جاري تحميل الإحصائيات...
      </div>
    );
  }

  // إذا لم تكن هناك إحصائيات
  if (!stats) {
    return (
      <div className={styles.empty}>
        <p>لا توجد إحصائيات متاحة</p>
      </div>
    );
  }

  // بيانات البطاقات مع قيم افتراضية آمنة
  const cards = [
    {
      id: 'users',
      title: 'إجمالي المستخدمين',
      value: getSafeValue(stats.totalUsers),
      icon: FaUsers,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      trend: `+${getSafeValue(stats.newUsersThisWeek)} هذا الأسبوع`,
      dataColor: 'blue'
    },
    {
      id: 'posts',
      title: 'إجمالي المنشورات',
      value: getSafeValue(stats.totalPosts),
      icon: FaFileAlt,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      trend: `+${getSafeValue(stats.newPostsToday)} اليوم`,
      dataColor: 'green'
    },
    {
      id: 'messages',
      title: 'الرسائل',
      value: getSafeValue(stats.totalMessages),
      icon: FaEnvelope,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      trend: `${getSafeValue(stats.activeUsersToday)} نشط اليوم`,
      dataColor: 'yellow'
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      value: getSafeValue(stats.totalNotifications),
      icon: FaBell,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      trend: 'آخر 24 ساعة',
      dataColor: 'red'
    },
  ];

  // إضافة بطاقة الأدمن إذا كانت موجودة
  if (stats.adminsCount !== undefined) {
    cards.push({
      id: 'admins',
      title: 'عدد الأدمن',
      value: getSafeValue(stats.adminsCount),
      icon: FaUsers,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      trend: 'إجمالي الأدمن',
      dataColor: 'purple'
    });
  }

  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={styles.card}
            data-color={card.dataColor}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <div
                  className={styles.cardIcon}
                  style={{ backgroundColor: card.bgColor, color: card.color }}
                >
                  <Icon />
                </div>
              </div>
              <div className={styles.cardValue}>
                {safeFormatNumber(card.value)}
              </div>
              <div className={styles.cardTrend}>
                <span className={styles.trendUp}>↑</span>
                {card.trend}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}