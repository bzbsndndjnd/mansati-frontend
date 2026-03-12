// components/users/UserList.tsx
// 👥 قائمة المستخدمين - نسخة محسنة مع دعم المتابعة
// الإصدار: 3.1.0 | آخر تحديث: 2026

"use client";

import { User, UserWithFollow } from "@/types/User"; // ✅ استيراد من المصدر الموحد
import UserCard from "./UserCard";

interface UserListProps {
  users: UserWithFollow[];
  currentUserId?: string;
  onFollow?: (userId: string) => Promise<void>;
  onUnfollow?: (userId: string) => Promise<void>;
  following?: Set<string>;
  followLoading?: Set<string>;
  loading?: boolean;
  onUserClick?: (userId: string) => void;
  emptyMessage?: string;
  showStats?: boolean;
}

export default function UserList({ 
  users, 
  currentUserId,
  onFollow,
  onUnfollow,
  following = new Set(),
  followLoading = new Set(),
  loading = false,
  onUserClick,
  emptyMessage = "لا يوجد مستخدمون حالياً",
  showStats = true
}: UserListProps) {
  
  // تصفية المستخدم الحالي من القائمة إذا وجد
  const filteredUsers = currentUserId 
    ? users.filter(user => user._id !== currentUserId)
    : users;

  if (loading) {
    return (
      <div className="loading-container" role="status" aria-label="جاري التحميل">
        <div className="loading-spinner"></div>
        <p className="loading-text">جاري تحميل المستخدمين...</p>
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="empty-state" role="status">
        <div className="empty-icon">👥</div>
        <p className="empty-message">{emptyMessage}</p>
        <p className="empty-hint">يمكنك البحث عن مستخدمين جدد للتواصل معهم</p>
      </div>
    );
  }

  return (
    <div className="users-grid" role="list" aria-label="قائمة المستخدمين">
      {filteredUsers.map((user) => {
        const isFollowing = following.has(user._id);
        const isLoading = followLoading.has(user._id);
        
        return (
          <UserCard
            key={user._id}
            user={user}
            currentUserId={currentUserId}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            isFollowing={isFollowing}
            isLoading={isLoading}
            onClick={onUserClick ? () => onUserClick(user._id) : undefined}
            showStats={showStats}
          />
        );
      })}
    </div>
  );
}