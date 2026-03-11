"use client";

// 🔌 SocketInitializer.tsx
// مسؤول: تهيئة اتصال Socket.IO مع إعادة الاتصال التلقائي
// الإصدار: 3.0.0 | آخر تحديث: 2026

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { socketService } from "@/services/socketService";
import { secureLog } from "@/utils/security";

export default function SocketInitializer() {
    const { user } = useAuth();
    const initialized = useRef(false);
    const mounted = useRef(true);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    
    const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            if (checkInterval.current) {
                clearInterval(checkInterval.current);
                checkInterval.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    // دالة للحصول على التوكن من sessionStorage
    const getToken = () => {
        try {
            return sessionStorage.getItem('temp_token');
        } catch (error) {
            console.error('❌ [SocketInitializer] Error getting token:', error);
            return null;
        }
    };

    const checkConnection = useRef(() => {
        if (!mounted.current) return;

        if (socketService.isConnected()) {
            console.log("✅ [SocketInitializer] Socket connected successfully");
            initialized.current = true;
            reconnectAttempts.current = 0;
            
            if (checkInterval.current) {
                clearInterval(checkInterval.current);
                checkInterval.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        } else {
            console.warn("⚠️ [SocketInitializer] Socket not connected yet");
        }
    });

    const connectSocket = (token: string) => {
        if (!mounted.current) return;

        console.log("🔌 [SocketInitializer] Attempting to connect with token");

        if (checkInterval.current) {
            clearInterval(checkInterval.current);
            checkInterval.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        socketService.connect(token);

        checkInterval.current = setInterval(checkConnection.current, 500);

        timeoutRef.current = setTimeout(() => {
            if (!socketService.isConnected() && mounted.current) {
                console.warn("⚠️ [SocketInitializer] Connection timeout, retrying...");
                
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    console.log(`🔄 [SocketInitializer] Reconnect attempt ${reconnectAttempts.current}`);
                    
                    if (checkInterval.current) {
                        clearInterval(checkInterval.current);
                        checkInterval.current = null;
                    }
                    
                    const newToken = getToken();
                    if (newToken) {
                        connectSocket(newToken);
                    }
                } else {
                    console.error("❌ [SocketInitializer] Max reconnect attempts reached");
                    secureLog.error('فشل تهيئة Socket بعد عدة محاولات');
                    
                    if (checkInterval.current) {
                        clearInterval(checkInterval.current);
                        checkInterval.current = null;
                    }
                }
            }
        }, 5000);
    };

    useEffect(() => {
        // ✅ الحصول على التوكن من sessionStorage مباشرة
        const token = getToken();
        
        if (!token) {
            console.log("🔌 [SocketInitializer] No token found in sessionStorage, waiting...");
            return;
        }

        if (socketService.isConnected()) {
            console.log("🔌 [SocketInitializer] Socket already connected");
            initialized.current = true;
            return;
        }

        if (initialized.current) {
            console.log("🔌 [SocketInitializer] Already initialized");
            return;
        }

        console.log("🔌 [SocketInitializer] Initializing with token from sessionStorage");
        connectSocket(token);

        // الاستماع لتغييرات التوكن
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'temp_token' && e.newValue) {
                console.log("🔄 [SocketInitializer] Token changed in storage, reconnecting");
                
                if (checkInterval.current) {
                    clearInterval(checkInterval.current);
                    checkInterval.current = null;
                }
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                
                socketService.disconnect();
                initialized.current = false;
                reconnectAttempts.current = 0;
                connectSocket(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            console.log("🔌 [SocketInitializer] Cleaning up");
            window.removeEventListener('storage', handleStorageChange);
            
            if (checkInterval.current) {
                clearInterval(checkInterval.current);
                checkInterval.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            
            if (mounted.current) {
                socketService.disconnect();
                initialized.current = false;
                reconnectAttempts.current = 0;
            }
        };
    }, []); // ✅ لا نعتمد على user

    return null;
}