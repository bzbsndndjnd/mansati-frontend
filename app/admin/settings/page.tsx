"use client";

// app/admin/settings/page.tsx
// ⚙️ إعدادات النظام - نسخة احترافية كاملة
// @version 1.0.1
// @lastUpdated 2026

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import adminService from "@/services/adminService";
import { secureLog, sanitizeInput } from "@/utils/security";
import {
  FaSave, FaUndo, FaGlobe, FaUserShield,
  FaBell, FaEnvelope, FaDatabase, FaLock,
  FaShieldAlt, FaPalette, FaLanguage, FaClock,
  FaServer, FaCloud, FaPlug, FaCog,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle
} from "react-icons/fa";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface Settings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    supportEmail: string;
    timezone: string;
    language: string;
    maintenance: boolean;
  };
  security: {
    requireEmailVerification: boolean;
    allowRegistration: boolean;
    minPasswordLength: number;
    maxLoginAttempts: number;
    sessionTimeout: number;
    twoFactorAuth: boolean;
    ipWhitelist: string[];
    rateLimit: {
      enabled: boolean;
      maxRequests: number;
      timeWindow: number;
    };
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    adminAlerts: boolean;
    dailyDigest: boolean;
    notificationRetention: number;
  };
  privacy: {
    defaultProfileVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    allowMessaging: string;
    dataRetention: number;
    gdprCompliance: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    customCss?: string;
  };
  advanced: {
    debugMode: boolean;
    cacheEnabled: boolean;
    cacheDuration: number;
    backupFrequency: string;
    backupRetention: number;
    logRetention: number;
    apiVersion: string;
  };
}

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
  fields: SettingField[];
}

interface SettingField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'boolean' | 'textarea' | 'color' | 'array';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  help?: string;
  validation?: (value: any) => boolean;
  disabled?: boolean; // إضافة خاصية disabled
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<Settings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // التحقق من صلاحية الأدمن
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push(`/profile/${user._id}`);
    }
  }, [user, router]);

  // تحميل الإعدادات
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // محاكاة جلب الإعدادات (استبدلها بـ API حقيقي)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSettings: Settings = {
        general: {
          siteName: 'منصتي',
          siteDescription: 'منصة اجتماعية عربية حديثة',
          siteUrl: 'https://example.com',
          supportEmail: 'support@example.com',
          timezone: 'Asia/Riyadh',
          language: 'ar',
          maintenance: false
        },
        security: {
          requireEmailVerification: true,
          allowRegistration: true,
          minPasswordLength: 8,
          maxLoginAttempts: 5,
          sessionTimeout: 30,
          twoFactorAuth: false,
          ipWhitelist: ['127.0.0.1', '::1'],
          rateLimit: {
            enabled: true,
            maxRequests: 100,
            timeWindow: 60
          }
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          adminAlerts: true,
          dailyDigest: false,
          notificationRetention: 30
        },
        privacy: {
          defaultProfileVisibility: 'public',
          showOnlineStatus: true,
          allowMessaging: 'all',
          dataRetention: 365,
          gdprCompliance: true
        },
        appearance: {
          theme: 'system',
          primaryColor: '#3b82f6',
          accentColor: '#10b981',
          fontFamily: 'Cairo, sans-serif'
        },
        advanced: {
          debugMode: false,
          cacheEnabled: true,
          cacheDuration: 3600,
          backupFrequency: 'daily',
          backupRetention: 7,
          logRetention: 30,
          apiVersion: 'v1'
        }
      };
      
      setSettings(mockSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(mockSettings)));
      
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('فشل تحميل الإعدادات');
      secureLog.error('Settings loading failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // التحقق من وجود تغييرات
  useEffect(() => {
    if (!settings || !originalSettings) return;
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  // حفظ الإعدادات
  const saveSettings = useCallback(async () => {
    if (!settings) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // محاكاة حفظ الإعدادات (استبدلها بـ API حقيقي)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      setSuccess('تم حفظ الإعدادات بنجاح');
      secureLog.info('Settings saved successfully');
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('فشل حفظ الإعدادات');
      secureLog.error('Settings save failed');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  // إعادة تعيين التغييرات
  const resetChanges = useCallback(() => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      setValidationErrors({});
    }
  }, [originalSettings]);

  // تحديث قيمة إعداد
  const updateSetting = useCallback((section: keyof Settings, field: string, value: any) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
    });
    
    // إزالة خطأ التحقق إذا كان موجوداً
    if (validationErrors[`${section}.${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  }, [validationErrors]);

  // التحقق من صحة القيمة
  const validateField = useCallback((section: string, field: SettingField, value: any): boolean => {
    if (field.validation) {
      return field.validation(value);
    }
    
    if (field.type === 'text' && field.placeholder === 'أدخل عنوان IP' && value) {
      const ips = value.split(',').map((ip: string) => ip.trim());
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^127\.0\.0\.1$/;
      const valid = ips.every((ip: string) => ipRegex.test(ip));
      
      if (!valid) {
        setValidationErrors(prev => ({
          ...prev,
          [`${section}.${field.id}`]: 'عناوين IP غير صالحة'
        }));
        return false;
      }
    }
    
    return true;
  }, []);

  // تعريف أقسام الإعدادات
  const sections: SettingSection[] = [
    {
      id: 'general',
      title: 'عام',
      icon: FaGlobe,
      fields: [
        { id: 'siteName', label: 'اسم الموقع', type: 'text', placeholder: 'منصتي' },
        { id: 'siteDescription', label: 'وصف الموقع', type: 'textarea', placeholder: 'وصف مختصر للموقع' },
        { id: 'siteUrl', label: 'رابط الموقع', type: 'text', placeholder: 'https://example.com' },
        { id: 'supportEmail', label: 'بريد الدعم', type: 'email', placeholder: 'support@example.com' },
        { 
          id: 'timezone', 
          label: 'المنطقة الزمنية', 
          type: 'select', 
          options: [
            { value: 'Asia/Riyadh', label: 'الرياض' },
            { value: 'Asia/Dubai', label: 'دبي' },
            { value: 'Asia/Kuwait', label: 'الكويت' },
            { value: 'Africa/Cairo', label: 'القاهرة' },
            { value: 'UTC', label: 'UTC' }
          ]
        },
        { 
          id: 'language', 
          label: 'اللغة', 
          type: 'select', 
          options: [
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' }
          ]
        },
        { id: 'maintenance', label: 'وضع الصيانة', type: 'boolean', help: 'تعطيل الموقع للزوار' }
      ]
    },
    {
      id: 'security',
      title: 'الأمان',
      icon: FaShieldAlt,
      fields: [
        { id: 'requireEmailVerification', label: 'تفعيل البريد الإلكتروني', type: 'boolean' },
        { id: 'allowRegistration', label: 'السماح بالتسجيل', type: 'boolean' },
        { id: 'minPasswordLength', label: 'الحد الأدنى لطول كلمة المرور', type: 'number', placeholder: '8' },
        { id: 'maxLoginAttempts', label: 'الحد الأقصى لمحاولات الدخول', type: 'number', placeholder: '5' },
        { id: 'sessionTimeout', label: 'مدة الجلسة (بالدقائق)', type: 'number', placeholder: '30' },
        { id: 'twoFactorAuth', label: 'تفعيل المصادقة الثنائية', type: 'boolean' },
        { 
          id: 'ipWhitelist', 
          label: 'قائمة IP المسموح بها', 
          type: 'text', 
          placeholder: '127.0.0.1, ::1',
          help: 'افصل بين العناوين بفاصلة'
        },
        { id: 'rateLimit.enabled', label: 'تفعيل تحديد المعدل', type: 'boolean' }
      ]
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: FaBell,
      fields: [
        { id: 'emailNotifications', label: 'إشعارات البريد الإلكتروني', type: 'boolean' },
        { id: 'pushNotifications', label: 'إشعارات فورية', type: 'boolean' },
        { id: 'adminAlerts', label: 'تنبيهات الأدمن', type: 'boolean' },
        { id: 'dailyDigest', label: 'ملخص يومي', type: 'boolean' },
        { id: 'notificationRetention', label: 'الاحتفاظ بالإشعارات (أيام)', type: 'number', placeholder: '30' }
      ]
    },
    {
      id: 'privacy',
      title: 'الخصوصية',
      icon: FaLock,
      fields: [
        { 
          id: 'defaultProfileVisibility', 
          label: 'ظهور الملف الشخصي', 
          type: 'select',
          options: [
            { value: 'public', label: 'عام' },
            { value: 'friends', label: 'الأصدقاء فقط' },
            { value: 'private', label: 'خاص' }
          ]
        },
        { id: 'showOnlineStatus', label: 'إظهار الحالة', type: 'boolean' },
        { 
          id: 'allowMessaging', 
          label: 'السماح بالرسائل', 
          type: 'select',
          options: [
            { value: 'all', label: 'الجميع' },
            { value: 'friends', label: 'الأصدقاء فقط' },
            { value: 'none', label: 'لا أحد' }
          ]
        },
        { id: 'dataRetention', label: 'الاحتفاظ بالبيانات (أيام)', type: 'number', placeholder: '365' },
        { id: 'gdprCompliance', label: 'توافق GDPR', type: 'boolean' }
      ]
    },
    {
      id: 'appearance',
      title: 'المظهر',
      icon: FaPalette,
      fields: [
        { 
          id: 'theme', 
          label: 'السمة', 
          type: 'select',
          options: [
            { value: 'light', label: 'فاتح' },
            { value: 'dark', label: 'داكن' },
            { value: 'system', label: 'حسب النظام' }
          ]
        },
        { id: 'primaryColor', label: 'اللون الأساسي', type: 'color' },
        { id: 'accentColor', label: 'لون التمييز', type: 'color' },
        { id: 'fontFamily', label: 'نوع الخط', type: 'text', placeholder: 'Cairo, sans-serif' }
      ]
    },
    {
      id: 'advanced',
      title: 'متقدم',
      icon: FaCog,
      fields: [
        { id: 'debugMode', label: 'وضع التصحيح', type: 'boolean' },
        { id: 'cacheEnabled', label: 'تفعيل التخزين المؤقت', type: 'boolean' },
        { id: 'cacheDuration', label: 'مدة التخزين المؤقت (ثواني)', type: 'number', placeholder: '3600' },
        { 
          id: 'backupFrequency', 
          label: 'تكرار النسخ الاحتياطي', 
          type: 'select',
          options: [
            { value: 'hourly', label: 'كل ساعة' },
            { value: 'daily', label: 'يومي' },
            { value: 'weekly', label: 'أسبوعي' },
            { value: 'monthly', label: 'شهري' }
          ]
        },
        { id: 'backupRetention', label: 'الاحتفاظ بالنسخ (أيام)', type: 'number', placeholder: '7' },
        { id: 'logRetention', label: 'الاحتفاظ بالسجلات (أيام)', type: 'number', placeholder: '30' },
        { id: 'apiVersion', label: 'إصدار API', type: 'text', placeholder: 'v1', disabled: true }
      ]
    }
  ];

  // إذا لم يكن المستخدم أدمن
  if (user && user.role !== 'admin') return null;

  // حالة التحميل
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  // عرض الخطأ
  if (error || !settings) {
    return (
      <div className={styles.errorContainer}>
        <h2>حدث خطأ</h2>
        <p>{error || 'لا توجد إعدادات'}</p>
        <button onClick={loadSettings} className={styles.retryButton}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* الهيدر */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaCog className={styles.titleIcon} />
            إعدادات النظام
          </h1>
          <p className={styles.subtitle}>
            تخصيص وإعدادات المنصة حسب احتياجاتك
          </p>
        </div>
        
        <div className={styles.headerActions}>
          {/* رسالة النجاح */}
          {success && (
            <div className={styles.successMessage}>
              <FaCheckCircle />
              <span>{success}</span>
            </div>
          )}
          
          {/* رسالة الخطأ */}
          {error && (
            <div className={styles.errorMessage}>
              <FaTimesCircle />
              <span>{error}</span>
            </div>
          )}
          
          {/* أزرار الإجراءات */}
          <div className={styles.actionButtons}>
            <button
              onClick={resetChanges}
              disabled={!hasChanges || saving}
              className={styles.resetButton}
            >
              <FaUndo />
              <span>إعادة تعيين</span>
            </button>
            
            <button
              onClick={saveSettings}
              disabled={!hasChanges || saving || Object.keys(validationErrors).length > 0}
              className={styles.saveButton}
            >
              <FaSave />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* تحذير التغييرات غير المحفوظة */}
      {hasChanges && (
        <div className={styles.warningBanner}>
          <FaExclamationTriangle />
          <span>لديك تغييرات غير محفوظة</span>
        </div>
      )}

      <div className={styles.content}>
        {/* القائمة الجانبية */}
        <div className={styles.sidebar}>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`${styles.sidebarItem} ${activeSection === section.id ? styles.active : ''}`}
              >
                <Icon />
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>

        {/* محتوى الإعدادات */}
        <div className={styles.mainContent}>
          {sections.map((section) => {
            if (section.id !== activeSection) return null;
            
            return (
              <div key={section.id} className={styles.section}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                
                <div className={styles.sectionContent}>
                  {section.fields.map((field) => {
                    const fieldPath = field.id.includes('.') ? field.id.split('.') : [section.id, field.id];
                    const value = fieldPath.length === 2 
                      ? (settings[section.id as keyof Settings] as any)[fieldPath[1]]
                      : (settings as any)[fieldPath[0]][fieldPath[1]];
                    
                    const errorKey = `${section.id}.${field.id}`;
                    const fieldError = validationErrors[errorKey];
                    
                    return (
                      <div key={field.id} className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                          {field.label}
                        </label>
                        
                        {field.type === 'boolean' ? (
                          <div className={styles.toggleContainer}>
                            <button
                              onClick={() => updateSetting(section.id as keyof Settings, field.id, !value)}
                              className={`${styles.toggleButton} ${value ? styles.active : ''}`}
                              disabled={saving || field.disabled}
                            >
                              <span className={styles.toggleHandle}></span>
                              <span className={styles.toggleLabel}>
                                {value ? 'نشط' : 'غير نشط'}
                              </span>
                            </button>
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            value={value}
                            onChange={(e) => updateSetting(section.id as keyof Settings, field.id, e.target.value)}
                            className={`${styles.select} ${fieldError ? styles.error : ''}`}
                            disabled={saving || field.disabled}
                          >
                            {field.options?.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={value || ''}
                            onChange={(e) => updateSetting(section.id as keyof Settings, field.id, e.target.value)}
                            onBlur={() => validateField(section.id, field, value)}
                            placeholder={field.placeholder}
                            className={`${styles.textarea} ${fieldError ? styles.error : ''}`}
                            disabled={saving || field.disabled}
                            rows={4}
                          />
                                                ) : field.type === 'color' ? (
                          <div className={styles.colorPicker}>
                            <input
                              type="color"
                              value={value || '#000000'}
                              onChange={(e) => updateSetting(section.id as keyof Settings, field.id, e.target.value)}
                              className={styles.colorInput}
                              disabled={saving || field.disabled}
                            />
                            <span className={styles.colorValue}>{value}</span>
                          </div>
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={value || ''}
                            onChange={(e) => updateSetting(section.id as keyof Settings, field.id, e.target.valueAsNumber)}
                            onBlur={() => validateField(section.id, field, value)}
                            placeholder={field.placeholder}
                            className={`${styles.input} ${fieldError ? styles.error : ''}`}
                            disabled={saving || field.disabled}
                            min={0}
                          />
                        ) : field.type === 'email' ? (
                          <input
                            type="email"
                            value={value || ''}
                            onChange={(e) => updateSetting(section.id as keyof Settings, field.id, e.target.value)}
                            onBlur={() => validateField(section.id, field, value)}
                            placeholder={field.placeholder}
                            className={`${styles.input} ${fieldError ? styles.error : ''}`}
                            disabled={saving || field.disabled}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => updateSetting(section.id as keyof Settings, field.id, e.target.value)}
                            onBlur={() => validateField(section.id, field, value)}
                            placeholder={field.placeholder}
                            className={`${styles.input} ${fieldError ? styles.error : ''}`}
                            disabled={saving || field.disabled}
                          />
                        )}

                        {fieldError && (
                          <div className={styles.fieldError}>
                            <FaExclamationTriangle />
                            <span>{fieldError}</span>
                          </div>
                        )}

                        {field.help && !fieldError && (
                          <div className={styles.fieldHelp}>{field.help}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}