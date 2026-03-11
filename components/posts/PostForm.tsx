"use client";

import { useState } from "react";
import styles from "./PostForm.module.css";

interface PostFormProps {
  onCreate: (formData: FormData) => Promise<void>;
}

export default function PostForm({ onCreate }: PostFormProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState(""); // ✅ إضافة title
  const [media, setMedia] = useState<File[]>([]); // ✅ تغيير إلى array
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && media.length === 0) return;

    setLoading(true);
    
    const formData = new FormData();
    formData.append("title", title || "منشور جديد"); // ✅ إضافة title
    formData.append("content", content);
    
    // ✅ إرسال كل الملفات كـ array
    media.forEach((file, index) => {
      formData.append("media", file); // Backend يتوقع "media" كـ array
    });

    try {
      await onCreate(formData);
      setTitle("");
      setContent("");
      setMedia([]);
      // reset file input
      const fileInput = document.getElementById("post-media") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("فشل إنشاء البوست:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setMedia(prev => [...prev, ...files]); // ✅ إضافة ملفات متعددة
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.postForm}>
      <h3 className={styles.formTitle}>إنشاء منشور جديد</h3>
      
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان المنشور (اختياري)"
        className={styles.titleInput}
        disabled={loading}
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="ما الذي تفكر فيه؟"
        className={styles.postInput}
        rows={3}
        disabled={loading}
        required
      />

      <div className={styles.formActions}>
        <label className={styles.mediaLabel}>
          <input
            id="post-media"
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaChange}
            className={styles.mediaInput}
            disabled={loading}
            multiple // ✅ السماح باختيار عدة ملفات
          />
          <span className={styles.mediaButton}>📷 إضافة صور/فيديو</span>
        </label>

        <button
          type="submit"
          disabled={loading || (!content.trim() && media.length === 0)}
          className={styles.submitButton}
        >
          {loading ? "جاري النشر..." : "نشر"}
        </button>
      </div>

      {/* ✅ عرض الملفات المختارة */}
      {media.length > 0 && (
        <div className={styles.mediaPreviewContainer}>
          {media.map((file, index) => (
            <div key={index} className={styles.mediaPreview}>
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className={styles.removeMedia}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}