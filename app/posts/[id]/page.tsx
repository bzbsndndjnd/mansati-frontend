// app/posts/[id]/page.tsx
// 📍 صفحة إعادة التوجيه للمنشورات الفردية
// @version 1.1.0
// @lastUpdated 2026
// متوافق مع Next.js 15 (حيث params هو Promise)

import { redirect } from "next/navigation";

interface PostRedirectProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * صفحة إعادة التوجيه للمنشورات الفردية
 * 
 * تستقبل معرف المنشور وتتحقق من صحته، ثم تعيد التوجيه إلى
 * صفحة المنشورات مع معامل highlight للمنشور المطلوب.
 * تستخدم `await params` للتوافق مع أحدث إصدارات Next.js.
 */
export default async function PostRedirect({ params }: PostRedirectProps) {
  // في Next.js 15، قد يكون params Promise، لذا ننتظرها
  const resolvedParams = await params;
  const postId = resolvedParams.id;

  // التحقق من وجود معرف صالح
  if (!postId || typeof postId !== 'string' || postId.length < 5) {
    // إذا كان المعرف غير صالح، نوجه إلى صفحة المنشورات بدون highlight
    redirect('/posts');
  }

  // إعادة التوجيه إلى صفحة المنشورات مع معامل highlight
  redirect(`/posts?highlight=${encodeURIComponent(postId)}`);
}