"use client";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <p>
          © {new Date().getFullYear()} منصتنا الاجتماعية. جميع الحقوق محفوظة.
        </p>

        <div className={styles.footerLinks}>
          <a href="#">سياسة الخصوصية</a>
          <a href="#">الشروط والأحكام</a>
          <a href="#">الدعم الفني</a>
        </div>
      </div>
    </footer>
  );
}
