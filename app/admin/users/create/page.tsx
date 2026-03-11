"use client";

// app/admin/users/create/page.tsx
// 👥 إنشاء مستخدم جديد - نسخة احترافية كاملة
// @version 1.0.0
// @lastUpdated 2026

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import userService from "@/services/userService";
import { secureLog, sanitizeInput } from "@/utils/security";
import {
  FaUserPlus, FaUserCircle, FaEnvelope, FaLock,
  FaIdCard, FaImage, FaCamera, FaSave, FaTimes,
  FaEye, FaEyeSlash, FaCheck, FaExclamationTriangle
} from "react-icons/fa";
import styles from "./page.module.css";

// ============================================================================
// أنواع البيانات
// ============================================================================

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  avatar?: File | null;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  general?: string;
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export default function CreateUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    isActive: true,
    avatar: null
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // التحقق من صلاحية الأدمن
  if (user && user.role !== 'admin') {
    router.push(`/profile/${user._id}`);
    return null;
  }

  // ==========================================================================
  // دوال التحقق
  // ==========================================================================

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('يجب أن تحتوي على رقم واحد على الأقل');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // التحقق من الاسم
    if (!formData.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    } else if (formData.name.length < 3) {
      newErrors.name = 'الاسم يجب أن يكون 3 أحرف على الأقل';
    } else if (formData.name.length > 50) {
      newErrors.name = 'الاسم يجب أن لا يتجاوز 50 حرف';
    }

    // التحقق من البريد الإلكتروني
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }

    // التحقق من كلمة المرور
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    // التحقق من تطابق كلمة المرور
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ==========================================================================
  // دوال معالجة النماذج
  // ==========================================================================

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // إزالة الخطأ عند التعديل
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => new Set(prev).add(field));
  }, []);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, general: 'يرجى اختيار صورة صالحة' }));
      return;
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, general: 'حجم الصورة كبير جداً. الحد الأقصى 5MB' }));
      return;
    }

    setFormData(prev => ({ ...prev, avatar: file }));

    // إنشاء معاينة
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // إزالة الخطأ العام
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  }, [errors.general]);

  const removeAvatar = useCallback(() => {
    setFormData(prev => ({ ...prev, avatar: null }));
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة البيانات
    if (!validateForm()) {
      // وضع علامة على جميع الحقول بأنها تم لمسها
      const allFields = new Set(['name', 'email', 'password', 'confirmPassword']);
      setTouched(allFields);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // إنشاء FormData لإرسال الصورة
      const submitData = new FormData();
      submitData.append('name', sanitizeInput(formData.name));
      submitData.append('email', sanitizeInput(formData.email));
      submitData.append('password', formData.password);
      submitData.append('role', formData.role);
      submitData.append('isActive', String(formData.isActive));
      
      if (formData.avatar) {
        submitData.append('avatar', formData.avatar);
      }

      // إرسال البيانات إلى API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشل إنشاء المستخدم');
      }

      secureLog.info(`User created successfully: ${formData.email}`);
      
      // التوجيه إلى صفحة المستخدمين
      router.push('/admin/users?created=true');

    } catch (err: any) {
      console.error('Failed to create user:', err);
      setErrors({ general: err.message || 'فشل إنشاء المستخدم' });
      secureLog.error('Failed to create user');
    } finally {
      setLoading(false);
    }
  }, [formData, router, validateForm]);

  const handleCancel = useCallback(() => {
    router.push('/admin/users');
  }, [router]);

  // ==========================================================================
  // دوال مساعدة للتحقق من صحة الحقول
  // ==========================================================================

  const isFieldInvalid = (field: keyof FormErrors): boolean => {
    return touched.has(field) && !!errors[field];
  };

  const getPasswordStrength = (): { strength: number; label: string; color: string } => {
    const password = formData.password;
    
    if (!password) return { strength: 0, label: 'ضعيفة', color: '#ef4444' };
    
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*]/.test(password)) strength += 1;
    
    const labels = ['ضعيفة', 'متوسطة', 'جيدة', 'قوية', 'ممتازة'];
    const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
    
    return {
      strength,
      label: labels[strength] || 'ضعيفة',
      color: colors[strength] || '#ef4444'
    };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className={styles.container}>
      {/* الهيدر */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaUserPlus className={styles.titleIcon} />
            إنشاء مستخدم جديد
          </h1>
          <p className={styles.subtitle}>
            أضف مستخدم جديد إلى المنصة مع تحديد الصلاحيات
          </p>
        </div>
      </div>

      {/* رسالة الخطأ العامة */}
      {errors.general && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle />
          <span>{errors.general}</span>
        </div>
      )}

      {/* نموذج إنشاء المستخدم */}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.formGrid}>
          {/* الجانب الأيمن - المعلومات الأساسية */}
          <div className={styles.mainSection}>
            {/* حقل الاسم */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                <FaIdCard className={styles.labelIcon} />
                الاسم الكامل
                <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('name')}
                placeholder="أدخل الاسم الكامل"
                className={`${styles.input} ${isFieldInvalid('name') ? styles.invalid : ''}`}
                disabled={loading}
                maxLength={50}
              />
              {isFieldInvalid('name') && (
                <span className={styles.errorMessage}>{errors.name}</span>
              )}
            </div>

            {/* حقل البريد الإلكتروني */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                <FaEnvelope className={styles.labelIcon} />
                البريد الإلكتروني
                <span className={styles.required}>*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                placeholder="user@example.com"
                className={`${styles.input} ${isFieldInvalid('email') ? styles.invalid : ''}`}
                disabled={loading}
              />
              {isFieldInvalid('email') && (
                <span className={styles.errorMessage}>{errors.email}</span>
              )}
            </div>

            {/* حقل كلمة المرور */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                <FaLock className={styles.labelIcon} />
                كلمة المرور
                <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('password')}
                  placeholder="أدخل كلمة المرور"
                  className={`${styles.passwordInput} ${isFieldInvalid('password') ? styles.invalid : ''}`}
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              
              {/* مؤشر قوة كلمة المرور */}
              {formData.password && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`${styles.strengthBar} ${
                          level <= passwordStrength.strength ? styles.active : ''
                        }`}
                        style={{ backgroundColor: level <= passwordStrength.strength ? passwordStrength.color : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              
              {isFieldInvalid('password') && (
                <span className={styles.errorMessage}>{errors.password}</span>
              )}
            </div>

            {/* حقل تأكيد كلمة المرور */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                <FaCheck className={styles.labelIcon} />
                تأكيد كلمة المرور
                <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="أعد إدخال كلمة المرور"
                  className={`${styles.passwordInput} ${isFieldInvalid('confirmPassword') ? styles.invalid : ''}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.passwordToggle}
                  disabled={loading}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {isFieldInvalid('confirmPassword') && (
                <span className={styles.errorMessage}>{errors.confirmPassword}</span>
              )}
              {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <span className={styles.successMessage}>✓ كلمة المرور متطابقة</span>
              )}
            </div>

            {/* حقل الدور */}
            <div className={styles.formGroup}>
              <label htmlFor="role" className={styles.label}>
                <FaUserCircle className={styles.labelIcon} />
                الدور
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={styles.select}
                disabled={loading}
              >
                <option value="user">مستخدم عادي</option>
                <option value="moderator">مشرف</option>
                <option value="admin">أدمن</option>
              </select>
            </div>

            {/* حالة الحساب */}
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={styles.checkbox}
                />
                <span>حساب نشط</span>
              </label>
              <p className={styles.helpText}>
                إذا كان الحساب غير نشط، لن يتمكن المستخدم من تسجيل الدخول
              </p>
            </div>
          </div>

          {/* الجانب الأيسر - الصورة الرمزية */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarCard}>
              <h3 className={styles.avatarTitle}>الصورة الرمزية</h3>
              
              <div className={styles.avatarContainer}>
                {avatarPreview ? (
                  <div className={styles.avatarPreview}>
                    <img src={avatarPreview} alt="Avatar preview" />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className={styles.removeAvatar}
                      disabled={loading}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <FaUserCircle className={styles.placeholderIcon} />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className={styles.fileInput}
                id="avatar-upload"
                disabled={loading}
              />
              
              <label htmlFor="avatar-upload" className={styles.uploadButton}>
                <FaCamera className={styles.uploadIcon} />
                اختر صورة
              </label>

              <p className={styles.avatarHint}>
                الصيغ المسموحة: JPEG, PNG, GIF, WEBP<br />
                الحد الأقصى: 5MB
              </p>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={loading}
          >
            <FaTimes />
            <span>إلغاء</span>
          </button>
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className={styles.spinner}></div>
                <span>جاري الإنشاء...</span>
              </>
            ) : (
              <>
                <FaSave />
                <span>إنشاء المستخدم</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}