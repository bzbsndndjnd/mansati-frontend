"use client";

// app/admin/system/page.tsx
// 💻 مراقبة النظام - نسخة احترافية كاملة
// @version 1.0.0
// @lastUpdated 2026

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import adminService from "@/services/adminService";
import { secureLog } from "@/utils/security";
import {
  FaServer, FaDatabase, FaHdd, FaMemory,
  FaMicrochip, FaClock, FaGlobe, FaShieldAlt,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
  FaSync, FaDownload, FaChartLine, FaWifi,
  FaLock, FaUserShield, FaHistory, FaCog
} from "react-icons/fa";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  uptimeFormatted: string;
  timestamp: string;
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    connections: number;
    size: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    usage: number;
    cores: number;
    loadAvg: number[];
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    requestsPerMinute: number;
    activeConnections: number;
    bandwidth: {
      in: number;
      out: number;
    };
  };
  security: {
    failedLogins: number;
    blockedIPs: number;
    activeSessions: number;
    lastBackup: string;
  };
  logs: Array<{
    id: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
    source: string;
  }>;
  performance: {
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    requestsPerSecond: number;
    errorRate: number;
  };
}

interface MetricHistory {
  timestamp: string;
  cpu: number;
  memory: number;
  requests: number;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function SystemPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [history, setHistory] = useState<MetricHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'security' | 'logs'>('overview');

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router]);

  // تحميل بيانات النظام
  const loadSystemData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      
      // محاكاة جلب البيانات (استبدلها بـ API حقيقي)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // بيانات تجريبية للنظام
      const mockHealth: SystemHealth = {
        status: Math.random() > 0.8 ? 'warning' : 'healthy',
        uptime: Date.now() - 7 * 24 * 60 * 60 * 1000,
        uptimeFormatted: '7 أيام 3 ساعات',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          responseTime: Math.floor(Math.random() * 50) + 20,
          connections: Math.floor(Math.random() * 50) + 30,
          size: 1024 * 1024 * 1024 * 2.3 // 2.3GB
        },
        memory: {
          total: 16 * 1024 * 1024 * 1024, // 16GB
          used: 8.5 * 1024 * 1024 * 1024, // 8.5GB
          free: 7.5 * 1024 * 1024 * 1024, // 7.5GB
          usage: 53,
          rss: 2.1 * 1024 * 1024 * 1024, // 2.1GB
          heapTotal: 1.5 * 1024 * 1024 * 1024, // 1.5GB
          heapUsed: 1.2 * 1024 * 1024 * 1024, // 1.2GB
          external: 0.3 * 1024 * 1024 * 1024 // 0.3GB
        },
        cpu: {
          usage: Math.floor(Math.random() * 40) + 20,
          cores: 8,
          loadAvg: [2.5, 2.8, 3.1]
        },
        disk: {
          total: 500 * 1024 * 1024 * 1024, // 500GB
          used: 320 * 1024 * 1024 * 1024, // 320GB
          free: 180 * 1024 * 1024 * 1024, // 180GB
          usage: 64
        },
        network: {
          requestsPerMinute: Math.floor(Math.random() * 500) + 300,
          activeConnections: Math.floor(Math.random() * 100) + 50,
          bandwidth: {
            in: Math.floor(Math.random() * 50) + 20,
            out: Math.floor(Math.random() * 30) + 10
          }
        },
        security: {
          failedLogins: Math.floor(Math.random() * 20),
          blockedIPs: Math.floor(Math.random() * 5),
          activeSessions: Math.floor(Math.random() * 200) + 100,
          lastBackup: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        },
        logs: generateLogs(20),
        performance: {
          responseTime: {
            avg: Math.floor(Math.random() * 100) + 50,
            p95: Math.floor(Math.random() * 150) + 100,
            p99: Math.floor(Math.random() * 200) + 150
          },
          requestsPerSecond: Math.floor(Math.random() * 50) + 20,
          errorRate: Math.random() * 2
        }
      };
      
      setHealth(mockHealth);
      
      // توليد بيانات تاريخية
      const mockHistory = generateHistory(60, selectedTimeRange);
      setHistory(mockHistory);
      
    } catch (err) {
      console.error('Failed to load system data:', err);
      setError('فشل تحميل بيانات النظام');
      secureLog.error('System data loading failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  // التحديث التلقائي
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadSystemData(true);
    }, 30000); // كل 30 ثانية
    
    return () => clearInterval(interval);
  }, [autoRefresh, loadSystemData]);

  // تنسيق حجم البيانات
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // تنسيق الوقت
  const formatUptime = useCallback((uptime: number): string => {
    const seconds = Math.floor((Date.now() - uptime) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    
    return parts.join(' ');
  }, []);

  // الحصول على لون الحالة
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  }, []);

  // إذا لم يكن المستخدم أدمن
  if (user && user.role !== 'admin') return null;

  // حالة التحميل
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل بيانات النظام...</p>
      </div>
    );
  }

  // عرض الخطأ
  if (error || !health) {
    return (
      <div className={styles.errorContainer}>
        <h2>حدث خطأ</h2>
        <p>{error || 'لا توجد بيانات'}</p>
        <button onClick={() => loadSystemData()} className={styles.retryButton}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className={styles.container}>
      {/* الهيدر */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaServer className={styles.titleIcon} />
            مراقبة النظام
          </h1>
          <p className={styles.subtitle}>
            مراقبة أداء وصحة النظام في الوقت الفعلي
          </p>
        </div>
        
        <div className={styles.headerActions}>
          {/* حالة النظام */}
          <div className={styles.systemStatus}>
            <span className={`${styles.statusDot} ${styles[health.status]}`}></span>
            <span>حالة النظام: {
              health.status === 'healthy' ? 'سليم' :
              health.status === 'warning' ? 'تحذير' : 'خطأ'
            }</span>
          </div>
          
          {/* التحديث التلقائي */}
          <label className={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className={styles.autoRefreshCheckbox}
            />
            <span>تحديث تلقائي</span>
          </label>
          
          {/* زر التحديث */}
          <button
            onClick={() => loadSystemData(true)}
            disabled={refreshing}
            className={styles.refreshButton}
          >
            <FaSync className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* تبويبات التنقل */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
        >
          <FaChartLine />
          <span>نظرة عامة</span>
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`${styles.tab} ${activeTab === 'performance' ? styles.activeTab : ''}`}
        >
          <FaMicrochip />
          <span>الأداء</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`${styles.tab} ${activeTab === 'security' ? styles.activeTab : ''}`}
        >
          <FaShieldAlt />
          <span>الأمان</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`${styles.tab} ${activeTab === 'logs' ? styles.activeTab : ''}`}
        >
          <FaHistory />
          <span>السجلات</span>
        </button>
      </div>

      {/* محتوى حسب التبويب */}
      {activeTab === 'overview' && (
        <>
          {/* بطاقات النظام الرئيسية */}
          <div className={styles.systemGrid}>
            {/* وقت التشغيل */}
            <div className={styles.systemCard}>
              <div className={styles.cardIcon} style={{ background: '#eef2ff', color: '#3b82f6' }}>
                <FaClock />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>وقت التشغيل</span>
                <span className={styles.cardValue}>{formatUptime(health.uptime)}</span>
              </div>
            </div>

            {/* استخدام المعالج */}
            <div className={styles.systemCard}>
              <div className={styles.cardIcon} style={{ background: '#ecfdf5', color: '#10b981' }}>
                <FaMicrochip />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>المعالج</span>
                <div className={styles.progressContainer}>
                  <span className={styles.cardValue}>{health.cpu.usage}%</span>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${health.cpu.usage}%`, background: '#10b981' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* استخدام الذاكرة */}
            <div className={styles.systemCard}>
              <div className={styles.cardIcon} style={{ background: '#fffbeb', color: '#f59e0b' }}>
                <FaMemory />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>الذاكرة</span>
                <div className={styles.progressContainer}>
                  <span className={styles.cardValue}>{health.memory.usage}%</span>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${health.memory.usage}%`, background: '#f59e0b' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* استخدام القرص */}
            <div className={styles.systemCard}>
              <div className={styles.cardIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                <FaHdd />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>القرص</span>
                <div className={styles.progressContainer}>
                  <span className={styles.cardValue}>{health.disk.usage}%</span>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${health.disk.usage}%`, background: '#ef4444' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* تفاصيل النظام */}
          <div className={styles.detailsGrid}>
            {/* الذاكرة */}
            <div className={styles.detailsCard}>
              <h3 className={styles.detailsTitle}>تفاصيل الذاكرة</h3>
              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span>الإجمالي</span>
                  <span>{formatBytes(health.memory.total)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>المستخدم</span>
                  <span>{formatBytes(health.memory.used)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>المتبقي</span>
                  <span>{formatBytes(health.memory.free)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>RSS</span>
                  <span>{formatBytes(health.memory.rss)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>Heap المستخدم</span>
                  <span>{formatBytes(health.memory.heapUsed)}</span>
                </div>
              </div>
            </div>

            {/* قاعدة البيانات */}
            <div className={styles.detailsCard}>
              <h3 className={styles.detailsTitle}>قاعدة البيانات</h3>
              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span>الحالة</span>
                  <span className={`${styles.statusText} ${styles[health.database.status]}`}>
                    {health.database.status === 'connected' ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span>وقت الاستجابة</span>
                  <span>{health.database.responseTime}ms</span>
                </div>
                <div className={styles.detailItem}>
                  <span>الاتصالات</span>
                  <span>{health.database.connections}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>الحجم</span>
                  <span>{formatBytes(health.database.size)}</span>
                </div>
              </div>
            </div>

            {/* الشبكة */}
            <div className={styles.detailsCard}>
              <h3 className={styles.detailsTitle}>الشبكة</h3>
              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span>الطلبات/الدقيقة</span>
                  <span>{health.network.requestsPerMinute}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>الاتصالات النشطة</span>
                  <span>{health.network.activeConnections}</span>
                </div>
                <div className={styles.detailItem}>
                  <span>الوارد</span>
                  <span>{health.network.bandwidth.in} Mbps</span>
                </div>
                <div className={styles.detailItem}>
                  <span>الصادر</span>
                  <span>{health.network.bandwidth.out} Mbps</span>
                </div>
              </div>
            </div>
          </div>

          {/* الرسم البياني للأداء */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>أداء النظام خلال آخر 24 ساعة</h3>
              <div className={styles.timeRangeSelector}>
                <button
                  onClick={() => setSelectedTimeRange('1h')}
                  className={`${styles.timeRangeButton} ${selectedTimeRange === '1h' ? styles.active : ''}`}
                >
                  1 ساعة
                </button>
                <button
                  onClick={() => setSelectedTimeRange('6h')}
                  className={`${styles.timeRangeButton} ${selectedTimeRange === '6h' ? styles.active : ''}`}
                >
                  6 ساعات
                </button>
                <button
                  onClick={() => setSelectedTimeRange('24h')}
                  className={`${styles.timeRangeButton} ${selectedTimeRange === '24h' ? styles.active : ''}`}
                >
                  24 ساعة
                </button>
                <button
                  onClick={() => setSelectedTimeRange('7d')}
                  className={`${styles.timeRangeButton} ${selectedTimeRange === '7d' ? styles.active : ''}`}
                >
                  7 أيام
                </button>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="timestamp" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  name="المعالج %"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorMemory)"
                  name="الذاكرة %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeTab === 'performance' && (
        <div className={styles.performanceSection}>
          <div className={styles.metricsGrid}>
            {/* متوسط وقت الاستجابة */}
            <div className={styles.metricCard}>
              <h3>متوسط وقت الاستجابة</h3>
              <div className={styles.metricValue}>{health.performance.responseTime.avg}ms</div>
              <div className={styles.metricSubtitle}>p95: {health.performance.responseTime.p95}ms | p99: {health.performance.responseTime.p99}ms</div>
            </div>

            {/* الطلبات في الثانية */}
            <div className={styles.metricCard}>
              <h3>الطلبات في الثانية</h3>
              <div className={styles.metricValue}>{health.performance.requestsPerSecond}</div>
              <div className={styles.metricSubtitle}>req/s</div>
            </div>

            {/* نسبة الخطأ */}
            <div className={styles.metricCard}>
              <h3>نسبة الخطأ</h3>
              <div className={styles.metricValue}>{health.performance.errorRate.toFixed(2)}%</div>
              <div className={styles.metricSubtitle}>من إجمالي الطلبات</div>
            </div>

            {/* تحميل المعالج */}
            <div className={styles.metricCard}>
              <h3>تحميل المعالج</h3>
              <div className={styles.metricValue}>{health.cpu.loadAvg[0].toFixed(2)}</div>
              <div className={styles.metricSubtitle}>
                1 دقيقة: {health.cpu.loadAvg[0].toFixed(2)} | 
                5 دقائق: {health.cpu.loadAvg[1].toFixed(2)} | 
                15 دقيقة: {health.cpu.loadAvg[2].toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className={styles.securitySection}>
          <div className={styles.securityGrid}>
            {/* محاولات الدخول الفاشلة */}
            <div className={styles.securityCard}>
              <FaExclamationTriangle className={styles.securityIcon} style={{ color: '#f59e0b' }} />
              <div>
                <span className={styles.securityLabel}>محاولات دخول فاشلة</span>
                <span className={styles.securityValue}>{health.security.failedLogins}</span>
              </div>
            </div>

            {/* عناوين IP محجوبة */}
            <div className={styles.securityCard}>
              <FaLock className={styles.securityIcon} style={{ color: '#ef4444' }} />
              <div>
                <span className={styles.securityLabel}>عناوين IP محجوبة</span>
                <span className={styles.securityValue}>{health.security.blockedIPs}</span>
              </div>
            </div>

            {/* الجلسات النشطة */}
            <div className={styles.securityCard}>
              <FaUserShield className={styles.securityIcon} style={{ color: '#3b82f6' }} />
              <div>
                <span className={styles.securityLabel}>جلسات نشطة</span>
                <span className={styles.securityValue}>{health.security.activeSessions}</span>
              </div>
            </div>

            {/* آخر نسخة احتياطية */}
            <div className={styles.securityCard}>
              <FaDatabase className={styles.securityIcon} style={{ color: '#10b981' }} />
              <div>
                <span className={styles.securityLabel}>آخر نسخة احتياطية</span>
                <span className={styles.securityValue}>
                  {new Date(health.security.lastBackup).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          </div>
               </div>
      )}

      {activeTab === 'logs' && (
        <div className={styles.logsSection}>
          <div className={styles.logsHeader}>
            <h3>سجلات النظام</h3>
            <div className={styles.logFilters}>
              <select className={styles.logLevelSelect}>
                <option value="all">جميع المستويات</option>
                <option value="info">معلومات</option>
                <option value="warning">تحذير</option>
                <option value="error">خطأ</option>
              </select>
              <button className={styles.exportLogsButton}>
                <FaDownload />
                <span>تصدير</span>
              </button>
            </div>
          </div>

          <div className={styles.logsList}>
            {health.logs.map((log) => (
              <div key={log.id} className={`${styles.logEntry} ${styles[log.level]}`}>
                <span className={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString('ar-EG')}
                </span>
                <span className={`${styles.logLevel} ${styles[log.level]}`}>
                  {log.level === 'info' ? 'معلومات' :
                   log.level === 'warning' ? 'تحذير' : 'خطأ'}
                </span>
                <span className={styles.logSource}>{log.source}</span>
                <span className={styles.logMessage}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// دوال مساعدة
// ============================================================================

function generateLogs(count: number) {
  const levels: ('info' | 'warning' | 'error')[] = ['info', 'warning', 'error'];
  const sources = ['system', 'database', 'auth', 'api', 'websocket'];
  const messages = [
    'تم بدء تشغيل الخادم',
    'اتصال قاعدة البيانات ناجح',
    'محاولة دخول فاشلة',
    'طلب API جديد',
    'خطأ في معالجة الطلب',
    'تم تحديث الإعدادات',
    'جلسة مستخدم جديدة',
    'انتهاء صلاحية التوكن',
    'نسخة احتياطية مكتملة',
    'تحذير: استخدام مرتفع للمعالج'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    source: sources[Math.floor(Math.random() * sources.length)]
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateHistory(points: number, range: string) {
  const now = Date.now();
  let interval: number;
  
  switch (range) {
    case '1h':
      interval = 60 * 1000; // دقيقة
      break;
    case '6h':
      interval = 10 * 60 * 1000; // 10 دقائق
      break;
    case '24h':
      interval = 30 * 60 * 1000; // 30 دقيقة
      break;
    case '7d':
      interval = 3 * 60 * 60 * 1000; // 3 ساعات
      break;
    default:
      interval = 60 * 1000;
  }

  return Array.from({ length: points }, (_, i) => ({
    timestamp: new Date(now - (points - i - 1) * interval).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    cpu: Math.floor(Math.random() * 40) + 20,
    memory: Math.floor(Math.random() * 30) + 40,
    requests: Math.floor(Math.random() * 100) + 50
  }));
}