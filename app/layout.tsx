// app/layout.tsx
// 🏗️ مسؤول: التخطيط الرئيسي للتطبيق - نسخة محدثة مع تصدير viewport منفصل
// @version 1.0.3
// @lastUpdated 2026

import type { Metadata, Viewport } from "next";
import "./../styles/globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/context/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import SocketInitializer from "@/components/SocketInitializer";
import { secureLog } from "@/utils/security";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#667eea",
};

export const metadata: Metadata = {
  title: "منصتنا الاجتماعية",
  description: "منصة اجتماعية احترافية للتواصل وبناء المجتمع الرقمي",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  secureLog.info('تهيئة التطبيق');
  
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'system-ui, arial, sans-serif' }}>
        <AuthProvider>
          <SocketInitializer />
          <Navbar />
          <div className="top-bar">
            <div className="container">
              <div className="top-bar-content">
                <span className="welcome-message">مرحباً بك في منصتنا</span>
                <NotificationBell />
              </div>
            </div>
          </div>
          <main className="main-container">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}