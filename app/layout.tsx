// app/layout.tsx
// 🏗️ مسؤول: التخطيط الرئيسي للتطبيق

import type { Metadata } from "next";
import "./../styles/globals.css";
import { Cairo } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/context/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import SocketInitializer from "@/components/SocketInitializer";
import { secureLog } from "@/utils/security";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصتنا الاجتماعية",
  description: "منصة اجتماعية احترافية للتواصل وبناء المجتمع الرقمي",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#667eea",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  secureLog.info('تهيئة التطبيق');
  
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <AuthProvider>
          {/* مكون تهيئة Socket */}
          <SocketInitializer />

          <Navbar />

          {/* الشريط العلوي مع الإشعارات */}
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