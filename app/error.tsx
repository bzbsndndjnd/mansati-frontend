"use client";
import { useEffect } from "react";
import styles from "./error.module.css";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("❌ Error captured:", error);
  }, [error]);

  return (
    <main className={styles.errorPage}>
      <div className={styles.errorCard}>
        <h1>حدث خطأ</h1>
        <p className={styles.errorMessage}>
          {error.message || "حدث خطأ غير متوقع"}
        </p>
        <p className={styles.errorDetails}>
          التفاصيل: {error.stack?.split("\n")[0]}
        </p>
        <button onClick={reset} className={styles.btnRetry}>
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
