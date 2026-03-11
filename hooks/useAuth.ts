"use client";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { User } from "../types/User";

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  // دالة تسجيل الدخول مع معالجة النتيجة بشكل آمن
  const login = async (email: string, password: string): Promise<User> => {
    const response = await context.login(email, password);
    // التعامل مع حالتين: إما أن الاستجابة تحتوي على user مباشرة أو أن response نفسه هو user
    const user = response?.user || response;
    if (!user?._id) {
      throw new Error("لم يتم استلام بيانات المستخدم بشكل صحيح");
    }
    return user;
  };

  // دالة إنشاء حساب مع معالجة النتيجة بشكل آمن
  const register = async (name: string, email: string, password: string): Promise<User> => {
    const response = await context.register(name, email, password);
    const user = response?.user || response;
    if (!user?._id) {
      throw new Error("لم يتم استلام بيانات المستخدم بشكل صحيح");
    }
    return user;
  };

  return {
    ...context,
    login,
    register,
  };
};