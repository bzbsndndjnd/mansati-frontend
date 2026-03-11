"use client";

// components/admin/SystemHealth.tsx
// 👑 مسؤول: حالة النظام وصحته - نسخة محسنة

import { useState, useEffect, useCallback } from "react";
import { 
  FaServer, 
  FaDatabase, 
  FaWifi, 
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSync,
  FaHdd,
  FaMicrochip,
  FaMemory
} from "react-icons/fa";
import { secureLog } from "@/utils/security";
import styles from "./SystemHealth.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  requestsPerMinute: number;
  activeUsers: number;
}

interface ServiceStatus {
  database: 'healthy' | 'degraded' | 'down';
  api: 'healthy' | 'degraded' | 'down';
  socket: 'healthy' | 'degraded' | 'down';
  storage: 'healthy' | 'degraded' | 'down';
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // تحميل بيانات النظام
  const loadSystemData = useCallback(async () => {
    try {
      setLoading(true);
      // محاكاة جلب البيانات - في التطبيق الحقيقي، استخدم API حقيقي
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // بيانات تجريبية
      setMetrics({
        cpu: Math.random() * 60 + 20,
        memory: Math.random() * 40 + 30,
        disk: Math.random() * 30 + 40,
        uptime: Date.now() - 7 * 24 * 60 * 60 * 1000,
        requestsPerMinute: Math.floor(Math.random() * 500 + 100),
        activeUsers: Math.floor(Math.random() * 50 + 10)
      });

      setStatus({
        database: Math.random() > 0.9 ? 'degraded' : 'healthy',
        api: Math.random() > 0.95 ? 'degraded' : 'healthy',
        socket: Math.random() > 0.9 ? 'degraded' : 'healthy',
        storage: Math.random() > 0.85 ? 'degraded' : 'healthy'
      });

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading system data:', err);
      setError('فشل تحميل بيانات النظام');
      secureLog.error('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadSystemData, 30000); // تحديث كل 30 ثانية
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadSystemData]);

  // تنسيق وقت التشغيل
  const formatUptime = useCallback((uptime: number) => {
    const diff = Date.now() - uptime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${days} يوم ${hours} ساعة ${minutes} دقيقة`;
  }, []);

  // الحصول على أيقونة الحالة
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'healthy':
        return <FaCheckCircle className={styles.statusIconHealthy} />;
      case 'degraded':
        return <FaExclamationTriangle className={styles.statusIconWarning} />;
      case 'down':
        return <FaTimesCircle className={styles.statusIconDanger} />;
      default:
        return <FaExclamationTriangle className={styles.statusIconWarning} />;
    }
  }, []);

  // الحصول على نص الحالة
  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'healthy':
        return 'سليم';
      case 'degraded':
        return 'ضعيف';
      case 'down':
        return 'معطل';
      default:
        return 'غير معروف';
    }
  }, []);

  // الحصول على لون شريط التقدم
  const getProgressColor = useCallback((value: number, type: 'cpu' | 'memory' | 'disk') => {
    if (value > 90) return styles.progressDanger;
    if (value > 70) return styles.progressWarning;
    return styles.progressSuccess;
  }, []);

  if (loading && !metrics) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل حالة النظام...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <FaExclamationTriangle />
        <p>{error}</p>
        <button onClick={loadSystemData} className={styles.retryButton}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2 className={styles.title}>حالة النظام</h2>
          <span className={styles.lastUpdated}>
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
          </span>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className={styles.autoRefreshCheckbox}
            />
            تحديث تلقائي
          </label>
          <button
            onClick={loadSystemData}
            className={styles.refreshButton}
            disabled={loading}
          >
            <FaSync className={loading ? styles.spin : ''} />
            تحديث
          </button>
        </div>
      </div>

      {/* بطاقات الخدمات */}
      <div className={styles.servicesGrid}>
        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <FaDatabase className={styles.serviceIcon} />
            <h3>قاعدة البيانات</h3>
          </div>
          <div className={styles.serviceStatus}>
            {status && getStatusIcon(status.database)}
            <span className={`${styles.serviceStatusText} ${styles[status?.database || 'healthy']}`}>
              {status && getStatusText(status.database)}
            </span>
          </div>
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <FaServer className={styles.serviceIcon} />
            <h3>الخادم API</h3>
          </div>
          <div className={styles.serviceStatus}>
            {status && getStatusIcon(status.api)}
            <span className={`${styles.serviceStatusText} ${styles[status?.api || 'healthy']}`}>
              {status && getStatusText(status.api)}
            </span>
          </div>
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <FaWifi className={styles.serviceIcon} />
            <h3>Socket.IO</h3>
          </div>
          <div className={styles.serviceStatus}>
            {status && getStatusIcon(status.socket)}
            <span className={`${styles.serviceStatusText} ${styles[status?.socket || 'healthy']}`}>
              {status && getStatusText(status.socket)}
            </span>
          </div>
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <FaHdd className={styles.serviceIcon} />
            <h3>التخزين</h3>
          </div>
          <div className={styles.serviceStatus}>
            {status && getStatusIcon(status.storage)}
            <span className={`${styles.serviceStatusText} ${styles[status?.storage || 'healthy']}`}>
              {status && getStatusText(status.storage)}
            </span>
          </div>
        </div>
      </div>

      {/* مقاييس النظام */}
      {metrics && (
        <div className={styles.metricsSection}>
          <h3>مقاييس النظام</h3>
          
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <FaMicrochip className={styles.metricIcon} />
                <span className={styles.metricLabel}>المعالج CPU</span>
              </div>
              <div className={styles.metricValue}>{metrics.cpu.toFixed(1)}%</div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${getProgressColor(metrics.cpu, 'cpu')}`}
                  style={{ width: `${metrics.cpu}%` }}
                />
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <FaMemory className={styles.metricIcon} />
                <span className={styles.metricLabel}>الذاكرة RAM</span>
              </div>
              <div className={styles.metricValue}>{metrics.memory.toFixed(1)}%</div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${getProgressColor(metrics.memory, 'memory')}`}
                  style={{ width: `${metrics.memory}%` }}
                />
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <FaHdd className={styles.metricIcon} />
                <span className={styles.metricLabel}>القرص Disk</span>
              </div>
              <div className={styles.metricValue}>{metrics.disk.toFixed(1)}%</div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${getProgressColor(metrics.disk, 'disk')}`}
                  style={{ width: `${metrics.disk}%` }}
                />
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <FaClock className={styles.metricIcon} />
                <span className={styles.metricLabel}>وقت التشغيل</span>
              </div>
              <div className={styles.metricValue}>{formatUptime(metrics.uptime)}</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>الطلبات/دقيقة</span>
              </div>
              <div className={styles.metricValue}>{metrics.requestsPerMinute}</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>المستخدمين النشطين</span>
              </div>
              <div className={styles.metricValue}>{metrics.activeUsers}</div>
            </div>
          </div>
        </div>
      )}

      {/* تنبيهات النظام */}
      <div className={styles.alertsSection}>
        <h3>تنبيهات النظام</h3>
        <div className={styles.alertsList}>
          {metrics?.cpu && metrics.cpu > 80 && (
            <div className={styles.alertItem}>
              <FaExclamationTriangle className={styles.alertIconWarning} />
              <span>استخدام المعالج مرتفع ({metrics.cpu.toFixed(1)}%)</span>
            </div>
          )}
          {metrics?.memory && metrics.memory > 80 && (
            <div className={styles.alertItem}>
              <FaExclamationTriangle className={styles.alertIconWarning} />
              <span>استخدام الذاكرة مرتفع ({metrics.memory.toFixed(1)}%)</span>
            </div>
          )}
          {metrics?.disk && metrics.disk > 85 && (
            <div className={styles.alertItem}>
              <FaExclamationTriangle className={styles.alertIconDanger} />
              <span>مساحة التخزين منخفضة ({metrics.disk.toFixed(1)}%)</span>
            </div>
          )}
          {(!metrics || !status) && (
            <div className={styles.alertItem}>
              <FaTimesCircle className={styles.alertIconDanger} />
              <span>بعض الخدمات قد تكون غير متاحة</span>
            </div>
          )}
          {metrics && Object.values(status || {}).every(s => s === 'healthy') && (
            <div className={styles.alertItem}>
              <FaCheckCircle className={styles.alertIconSuccess} />
              <span>جميع الأنظمة تعمل بشكل طبيعي</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}