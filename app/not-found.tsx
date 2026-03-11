export default function NotFoundPage() {
  return (
    <main style={{ textAlign: "center", padding: "4rem" }}>
      <h1 style={{ fontSize: "2rem", color: "#dc2626" }}>404 - الصفحة غير موجودة</h1>
      <p style={{ marginTop: "1rem", color: "#374151" }}>
        الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <a href="/" style={{ marginTop: "2rem", display: "inline-block", color: "#2563eb" }}>
        العودة إلى الرئيسية
      </a>
    </main>
  );
}
