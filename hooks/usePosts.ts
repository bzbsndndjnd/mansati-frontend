// hooks/usePosts.ts
import { useState, useEffect } from "react";
import postService from "../services/postService";
import { Post } from "../types/Post";

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // جلب جميع البوستات
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await postService.getAll();
      setPosts(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب المنشورات");
    } finally {
      setLoading(false);
    }
  };

  // إنشاء بوست جديد
  const createPost = async (formData: FormData) => {
    try {
      const newPost = await postService.create(formData);
      // التأكد من أن newPost يحتوي على author ككامل
      setPosts((prev) => [newPost, ...prev]);
    } catch (err: any) {
      setError(err.message || "تعذر إنشاء المنشور");
    }
  };

  // حذف بوست
  const deletePost = async (id: string) => {
    try {
      await postService.delete(id);
      setPosts((prev) => prev.filter((post) => post._id !== id));
    } catch (err: any) {
      setError(err.message || "تعذر حذف المنشور");
    }
  };

  // إضافة تعليق
  const commentOnPost = async (postId: string, text: string) => {
    try {
      const updatedPost = await postService.addComment(postId, text);
      // استبدال المنشور القديم بالمنشور المحدث
      setPosts((prev) => prev.map((p) => (p._id === postId ? updatedPost : p)));
    } catch (err: any) {
      setError(err.message || "تعذر إضافة التعليق");
    }
  };

  // إضافة مشاركة
  const sharePost = async (postId: string) => {
    try {
      const updatedPost = await postService.addShare(postId);
      setPosts((prev) => prev.map((p) => (p._id === postId ? updatedPost : p)));
    } catch (err: any) {
      setError(err.message || "تعذر مشاركة البوست");
    }
  };

  // إضافة تفاعل
  const reactToPost = async (postId: string, type: string) => {
    try {
      const updatedPost = await postService.addReaction(postId, type);
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? updatedPost : p))
      );
    } catch (err: any) {
      setError(err.message || "تعذر إضافة التفاعل");
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    deletePost,
    commentOnPost,
    sharePost,
    reactToPost,
  };
};