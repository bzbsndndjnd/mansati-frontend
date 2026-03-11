"use client";

import "./../styles/page.css";
import { Users, MessageCircle, ShieldCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [showAdminLink, setShowAdminLink] = useState(false);

  return (
    <section className="home">
      <div className="hero">
        <h1>تواصل. شارك. اصنع مجتمعك الرقمي.</h1>
        <p>
          منصة اجتماعية حديثة تتيح لك بناء شبكة علاقات قوية ومشاركة أفكارك
          بسهولة وأمان.
        </p>

        <div className="hero-actions">
          {/* زر إنشاء حساب */}
          <button
            className="btn-primary"
            onClick={() => router.push("/register")}
          >
            إنشاء حساب
          </button>

          {/* زر استكشاف المنصة */}
          <button 
            className="btn-outline"
            onClick={() => router.push("/posts")}
          >
            استكشاف المنصة
          </button>
        </div>

        {/* ✅ رابط دخول الأدمن (مخفي لكن متاح) */}
        <div className="admin-section">
          <button
            className="admin-toggle"
            onClick={() => setShowAdminLink(!showAdminLink)}
            aria-label="خيارات الأدمن"
          >
            <Lock size={18} />
          </button>
          
          {showAdminLink && (
            <div className="admin-dropdown">
              <button
                className="admin-link"
                onClick={() => router.push("/admin-login")}
              >
                <span>🔑</span>
                <span>دخول الأدمن الخارق</span>
              </button>
              <p className="admin-note">
                للمطورين فقط - إنشاء أول أدمن في النظام
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="features">
        <Feature
          icon={<Users size={32} />}
          title="مجتمع متفاعل"
          description="انضم إلى شبكة واسعة من المستخدمين."
        />
        <Feature
          icon={<MessageCircle size={32} />}
          title="محادثات فورية"
          description="تواصل عبر رسائل سريعة وآمنة."
        />
        <Feature
          icon={<ShieldCheck size={32} />}
          title="أمان وخصوصية"
          description="بياناتك محمية بأحدث تقنيات التشفير."
        />
      </div>

      {/* ✅ رابط مباشر (اختياري) - يظهر في أسفل الصفحة */}
      <div className="footer-links">
        <button
          className="direct-admin-link"
          onClick={() => router.push("/admin-login")}
        >
          <span>⚙️</span>
          <span>لوحة التحكم (للمطورين)</span>
        </button>
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}