// types/Admin.ts
// 👑 مسؤول: أنواع بيانات لوحة التحكم

import { User } from './User';
import { Post } from './Post';

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalMessages: number;
  totalNotifications: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newPostsToday: number;
  reportsCount: number;
}

export interface AdminUser extends User {
  role: 'user' | 'admin' | 'moderator';
  isActive: boolean;
  lastLogin?: string;
  reports?: number;
  postsCount?: number;
}

export interface AdminPost extends Post {
  reports?: number;
  isHidden?: boolean;
  flaggedBy?: string[];
}

export interface SystemLog {
  _id: string;
  action: string;
  adminId: string;
  adminName: string;
  targetId?: string;
  targetType: 'user' | 'post' | 'message';
  details: any;
  createdAt: string;
}