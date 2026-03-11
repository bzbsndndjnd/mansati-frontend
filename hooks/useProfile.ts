"use client";
import { useState, useEffect } from "react";
import userService from "../services/userService";
import { User } from "../types/User";

export const useProfile = (userId: string) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getById(userId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب بيانات البروفايل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  return { profile, loading, error, fetchProfile, setProfile };
};
