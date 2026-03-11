"use client";

// app/admin/analytics/page.tsx
// 📊 صفحة التحليلات - نسخة محسنة ومعالجة للأخطاء
// @version 3.1.0

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import adminService from "@/services/adminService";
import { secureLog } from "@/utils/security";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  FaUsers, FaFileAlt, FaEnvelope, FaBell,
  FaChartLine, FaCalendarAlt, FaSync,
  FaArrowUp, FaArrowDown, FaGlobe
} from "react-icons/fa";
import styles from "./page.module.css";

// ============================================================================
// واجهات البيانات (Interfaces)
// ============================================================================

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalMessages: number;
    totalNotifications: number;
    activeUsersToday: number;
    newUsersToday: number;
    newPostsToday: number;
    newMessagesToday: number;
  };
  trends: {
    usersGrowth: number;
    postsGrowth: number;
    messagesGrowth: number;
  };
  charts: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    weeklyPosts: Array<{ day: string; posts: number }>;
    userActivity: Array<{ hour: number; active: number }>;
    contentDistribution: Array<{ name: string; value: number }>;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // حالات الحالة (State Management)
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'week'
  });

  // 1. حل مشكلة SSR مع Recharts: التأكد من تحميل المكون في المتصفح فقط
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. حماية المسار للأدمن فقط
  useEffect(() => {
    if (mounted && user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router, mounted]);

  // 3. دالة جلب البيانات مع معالجة محسنة للأخطاء (حل مشكلة Analytics load error)
  const loadAnalytics = useCallback(async (showRefreshing = false) => {
    try {
      showRefreshing ? setRefreshing(true) : setLoading(true);
      setError(null);

      const response = await adminService.getAnalytics({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });

      // التحقق من هيكلية البيانات (تجنب القراءة من undefined)
      const analyticsResult = response?.data?.data || response?.data || response;
      
      if (analyticsResult && analyticsResult.overview) {
        setData(analyticsResult);
        secureLog.info('Analytics loaded successfully');
      } else {
        console.error("Structure Error:", response);
        throw new Error("تنسيق بيانات التحليلات غير مدعوم");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'فشل الاتصال بخادم التحليلات';
      setError(errorMessage);
      secureLog.error('Analytics load error', { details: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (mounted) {
      loadAnalytics();
    }
  }, [loadAnalytics, mounted]);

  const changeDateRange = (val: string) => {
    const now = new Date();
    let start = new Date();
    if (val === 'today') start.setHours(0, 0, 0, 0);
    else if (val === 'week') start.setDate(now.getDate() - 7);
    else if (val === 'month') start.setMonth(now.getMonth() - 1);
    
    setDateRange({ start, end: new Date(), label: val });
  };

  // الألوان المستخدمة في الرسوم البيانية
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // منع الرندر حتى يتم التأكد من الـ Mount (يحل مشاكل التوافق)
  if (!mounted) return null;

  if (loading && !refreshing) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>جاري تحضير التحليلات...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}><FaChartLine className={styles.iconBlue} /> تحليلات المنصة</h1>
          <p className={styles.subtitle}>تحديثات النظام الحية وإحصائيات الاستخدام</p>
        </div>
        <div className={styles.actions}>
          <select 
            value={dateRange.label} 
            onChange={(e) => changeDateRange(e.target.value)} 
            className={styles.select}
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
          </select>
          <button 
            onClick={() => loadAnalytics(true)} 
            className={styles.refreshBtn}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? styles.spin : ''} />
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={() => loadAnalytics()}>إعادة المحاولة</button>
        </div>
      )}

      {/* Main Stats Area */}
      {data && (
        <>
          <div className={styles.statGrid}>
            <StatCard label="المستخدمين" value={data.overview.totalUsers} trend={data.trends.usersGrowth} icon={<FaUsers />} color="#3b82f6" />
            <StatCard label="المنشورات" value={data.overview.totalPosts} trend={data.trends.postsGrowth} icon={<FaFileAlt />} color="#10b981" />
            <StatCard label="الرسائل" value={data.overview.totalMessages} trend={data.trends.messagesGrowth} icon={<FaEnvelope />} color="#f59e0b" />
            <StatCard label="الإشعارات" value={data.overview.totalNotifications} trend={0} icon={<FaBell />} color="#ef4444" />
          </div>

          <div className={styles.chartsWrapper}>
            <div className={styles.chartBox}>
              <h3 className={styles.chartTitle}>نمو النشاط اليومي</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={data.charts.dailyActiveUsers}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                    />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartBox}>
              <h3 className={styles.chartTitle}>توزيع المحتوى</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie 
                      data={data.charts.contentDistribution} 
                      innerRadius={70} 
                      outerRadius={90} 
                      paddingAngle={8} 
                      dataKey="value"
                      stroke="none"
                    >
                      {data.charts.contentDistribution.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* System Health Section */}
          <section className={styles.healthSection}>
             <h3 className={styles.sectionTitle}><FaGlobe /> استقرار النظام</h3>
             <div className={styles.healthGrid}>
                <HealthItem label="زمن الاستجابة" value={`${data.systemHealth.responseTime}ms`} status={data.systemHealth.responseTime < 300 ? 'good' : 'warning'} />
                <HealthItem label="استهلاك المعالج" value={`${data.systemHealth.cpuUsage}%`} status={data.systemHealth.cpuUsage < 70 ? 'good' : 'error'} />
                <HealthItem label="استهلاك الذاكرة" value={`${data.systemHealth.memoryUsage}%`} status={data.systemHealth.memoryUsage < 80 ? 'good' : 'warning'} />
                <HealthItem label="معدل الأخطاء" value={`${data.systemHealth.errorRate}%`} status={data.systemHealth.errorRate < 2 ? 'good' : 'error'} />
             </div>
          </section>
        </>
      )}
    </div>
  );
}

// ============================================================================
// المكونات الفرعية (Sub-components)
// ============================================================================

function StatCard({ label, value, trend, icon, color }: any) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon} style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
        <span className={`${styles.trend} ${trend >= 0 ? styles.up : styles.down}`}>
          {trend >= 0 ? <FaArrowUp /> : <FaArrowDown />} {Math.abs(trend)}%
        </span>
      </div>
      <div className={styles.cardContent}>
        <p className={styles.cardLabel}>{label}</p>
        <h3 className={styles.cardValue}>{value.toLocaleString()}</h3>
      </div>
    </div>
  );
}

function HealthItem({ label, value, status }: { label: string, value: string, status: 'good' | 'warning' | 'error' }) {
  const statusClass = status === 'good' ? styles.statusGood : status === 'warning' ? styles.statusWarning : styles.statusError;
  return (
    <div className={styles.healthItem}>
       <span className={styles.healthLabel}>{label}</span>
       <strong className={`${styles.healthValue} ${statusClass}`}>{value}</strong>
    </div>
  );
}