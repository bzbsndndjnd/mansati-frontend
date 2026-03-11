// services/socketService.ts
// 🔌 مسؤول: إدارة اتصال Socket.IO مع دعم كامل للإشعارات والرسائل
// الإصدار: 4.0.0 | آخر تحديث: 2026
// المميزات:
// - إدارة متقدمة للتوثيث والتجديد التلقائي
// - معالجة أخطاء متطورة مع إعادة محاولة ذكية
// - دعم كامل للـ cleanup ومنع تسرب الذاكرة
// - أمان عالي مع التحقق من صحة التوكن

import { io, Socket } from "socket.io-client";
import { useState, useEffect } from "react"; // ✅ إضافة هذا السطر مهم جداً!
// ============================================================================
// أنواع البيانات
// ============================================================================

interface OnlineUser {
    id: string;
    name: string;
    lastSeen?: Date;
}

interface TypingEvent {
    userId: string;
    isTyping: boolean;
}

interface MessageEvent {
    receiverId: string;
    message: any;
}

interface SocketConfig {
    maxReconnectAttempts: number;
    reconnectDelay: number;
    reconnectDelayMax: number;
    connectionCheckInterval: number;
    maxAuthErrors: number;
}

// ============================================================================
// ثوابت التكوين
// ============================================================================

const SOCKET_CONFIG: SocketConfig = {
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    reconnectDelayMax: 10000,
    connectionCheckInterval: 30000,
    maxAuthErrors: 3
};

// ============================================================================
// خدمة Socket
// ============================================================================

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();
    private static instance: SocketService;
    private reconnectAttempts = 0;
    private connectionCheckInterval: NodeJS.Timeout | null = null;
    private isConnecting = false;
    private currentToken: string | null = null;
    private authErrorCount = 0;
    private pendingEvents: Map<string, any[]> = new Map();
    private connectionPromise: Promise<void> | null = null;
    private connectionResolve: (() => void) | null = null;

    // ==========================================================================
    // Singleton Pattern
    // ==========================================================================

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    // ==========================================================================
    // دوال مساعدة خاصة
    // ==========================================================================

    /**
     * الحصول على التوكن من التخزين المحلي
     */
    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        
        try {
            // محاولة الحصول من localStorage
            let token = localStorage.getItem('token');
            
            // إذا لم يكن موجوداً، حاول من cookie
            if (!token) {
                const cookies = document.cookie.split(';');
                const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
                if (tokenCookie) {
                    token = tokenCookie.split('=')[1];
                }
            }
            
            return token;
        } catch (error) {
            console.error('❌ [SocketService] Error getting token:', error);
            return null;
        }
    }

    /**
     * التحقق من صلاحية التوكن
     */
    private isTokenValid(token: string): boolean {
        try {
            // فك تشفير التوكن (بدون تحقق التوقيع)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            
            // التحقق من تاريخ انتهاء الصلاحية
            const now = Math.floor(Date.now() / 1000);
            const isValid = payload.exp && payload.exp > now;
            
            if (!isValid) {
                console.warn('⚠️ [SocketService] Token expired', {
                    exp: new Date(payload.exp * 1000).toISOString(),
                    now: new Date().toISOString()
                });
            }
            
            return !!isValid;
        } catch (error) {
            console.error('❌ [SocketService] Token validation error:', error);
            return false;
        }
    }

    /**
     * معالجة أخطاء التوثيق
     */
    private async handleAuthError(): Promise<void> {
        this.authErrorCount++;
        
        if (this.authErrorCount >= SOCKET_CONFIG.maxAuthErrors) {
            console.error('❌ [SocketService] Max auth errors reached, attempting token refresh...');
            
            try {
                const newToken = await this.refreshToken();
                if (newToken) {
                    this.authErrorCount = 0;
                    this.connect(newToken);
                } else {
                    this.disconnect();
                    this.emitToListeners('auth_error', { message: 'Authentication failed' });
                }
            } catch (error) {
                console.error('❌ [SocketService] Token refresh failed:', error);
                this.disconnect();
            }
        }
    }

    /**
     * تحديث التوكن
     */
    private async refreshToken(): Promise<string | null> {
        try {
            console.log('🔄 [SocketService] Attempting to refresh token...');
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log('✅ [SocketService] Token refreshed successfully');
                    return data.token;
                }
            }
            
            console.error('❌ [SocketService] Failed to refresh token');
            return null;
        } catch (error) {
            console.error('❌ [SocketService] Error refreshing token:', error);
            return null;
        }
    }

    /**
     * تنفيذ الأحداث المعلقة
     */
    private processPendingEvents(): void {
        this.pendingEvents.forEach((events, eventName) => {
            events.forEach(data => {
                this.emit(eventName, data);
            });
        });
        this.pendingEvents.clear();
    }

    // ==========================================================================
    // الاتصال
    // ==========================================================================

    /**
     * الاتصال بالـ Socket
     */
    async connect(token?: string): Promise<void> {
        // إذا كان هناك اتصال قيد التنفيذ، نعيد الـ Promise الحالي
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // منع الاتصال المتكرر
        if (this.isConnecting) {
            console.log("🔌 [SocketService] Already connecting, waiting...");
            return this.connectionPromise!;
        }

        if (this.socket?.connected) {
            console.log("🔌 [SocketService] Already connected");
            return Promise.resolve();
        }

        // إنشاء Promise جديد للاتصال
        this.connectionPromise = new Promise((resolve) => {
            this.connectionResolve = resolve;
        });

        // الحصول على التوكن
        const authToken = token || this.getToken();
        
        if (!authToken) {
            console.error("❌ [SocketService] No token available");
            this.isConnecting = false;
            this.connectionResolve?.();
            this.connectionPromise = null;
            return;
        }

        // التحقق من صلاحية التوكن
        if (!this.isTokenValid(authToken)) {
            console.warn("⚠️ [SocketService] Token invalid, attempting refresh...");
            const newToken = await this.refreshToken();
            if (newToken) {
                return this.connect(newToken);
            } else {
                this.isConnecting = false;
                this.connectionResolve?.();
                this.connectionPromise = null;
                return;
            }
        }

        this.currentToken = authToken;
        this.isConnecting = true;
        this.authErrorCount = 0;
        
        console.log("🔌 [SocketService] Connecting to socket...");

        try {
            // قطع أي اتصال سابق
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
            }

            this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
                auth: { token: authToken },
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: SOCKET_CONFIG.maxReconnectAttempts,
                reconnectionDelay: SOCKET_CONFIG.reconnectDelay,
                reconnectionDelayMax: SOCKET_CONFIG.reconnectDelayMax,
                timeout: 20000,
                forceNew: true,
                autoConnect: true
            });

            this.setupListeners();
            this.startConnectionCheck();
            
            // معالجة الأحداث المعلقة
            this.processPendingEvents();
        } catch (error) {
            console.error("❌ [SocketService] Connection error:", error);
            this.isConnecting = false;
            this.connectionResolve?.();
            this.connectionPromise = null;
        }
    }

    // ==========================================================================
    // إعداد المستمعين
    // ==========================================================================

    /**
     * إعداد جميع مستمعي الأحداث
     */
    private setupListeners(): void {
        if (!this.socket) return;

        // ✅ الاتصال
        this.socket.on("connect", () => {
            console.log("🔌 [SocketService] ✅ Connected successfully");
            console.log("📡 [SocketService] Socket ID:", this.socket?.id);
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.authErrorCount = 0;
            
            // إعلام جميع المنتظرين
            this.connectionResolve?.();
            this.connectionPromise = null;
            this.connectionResolve = null;
            
            // طلب قائمة المتصلين
            this.emit("get_online_users", {});
            
            // إعادة إرسال أحداث المستمعين المسجلين
            this.reattachListeners();
        });

        // ✅ قطع الاتصال
        this.socket.on("disconnect", (reason) => {
            console.log("🔌 [SocketService] ❌ Disconnected:", reason);
            this.isConnecting = false;
            
            if (reason === "io server disconnect") {
                console.log("🔌 [SocketService] Server disconnected, cleaning up...");
                this.cleanup();
            }
        });

        // ✅ خطأ في الاتصال
        this.socket.on("connect_error", async (error) => {
            console.error("❌ [SocketService] Connection error:", error.message);
            
            if (error.message.includes('Authentication') || error.message.includes('jwt')) {
                await this.handleAuthError();
            }
            
            this.reconnectAttempts++;
            this.isConnecting = false;
            
            if (this.reconnectAttempts >= SOCKET_CONFIG.maxReconnectAttempts) {
                console.log("🔌 [SocketService] Max reconnection attempts reached");
                this.cleanup();
                this.emitToListeners('connection_failed', { message: 'Max reconnection attempts reached' });
            }
        });

        // ✅ إعادة الاتصال
        this.socket.on("reconnect", (attemptNumber) => {
            console.log(`🔌 [SocketService] ✅ Reconnected after ${attemptNumber} attempts`);
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.authErrorCount = 0;
            
            // إعادة إرسال أحداث المستمعين المسجلين
            this.reattachListeners();
        });

        // ✅ محاولة إعادة الاتصال
        this.socket.on("reconnect_attempt", (attemptNumber) => {
            console.log(`🔌 [SocketService] Reconnect attempt ${attemptNumber}`);
            
            // تحديث التوكن قبل إعادة الاتصال
            const token = this.getToken();
            if (token && this.socket) {
                this.socket.auth = { token };
            }
        });

        // ======================================================================
        // 📨 الأحداث المهمة
        // ======================================================================

        this.socket.on("new_notification", (data) => {
            console.log("📨 [SocketService] New notification received");
            this.emitToListeners("new_notification", data);
        });

        this.socket.on("new_message", (data) => {
            console.log("💬 [SocketService] New message received");
            this.emitToListeners("new_message", data);
        });

        this.socket.on("message_sent", (data) => {
            console.log("✅ [SocketService] Message sent confirmation");
            this.emitToListeners("message_sent", data);
        });

        this.socket.on("online_users", (data: OnlineUser[]) => {
            console.log("👥 [SocketService] Online users updated:", data?.length || 0);
            this.emitToListeners("online_users", data);
        });

        this.socket.on("user_typing", (data: TypingEvent) => {
            this.emitToListeners("user_typing", data);
        });

        this.socket.on("messages_read", (data) => {
            console.log("👁️ [SocketService] Messages read");
            this.emitToListeners("messages_read", data);
        });

        // ======================================================================
        // تسجيل الأحداث للتشخيص (في وضع التطوير فقط)
        // ======================================================================

        if (process.env.NODE_ENV === 'development') {
            this.socket.onAny((event, ...args) => {
                console.log(`📡 [SocketService] Event: ${event}`, args);
            });
        }
    }

    /**
     * إعادة إرفاق المستمعين بعد إعادة الاتصال
     */
    private reattachListeners(): void {
        if (!this.socket) return;
        
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, callback as any);
            });
        });
    }

    // ==========================================================================
    // التحقق من الاتصال
    // ==========================================================================

    /**
     * بدء التحقق الدوري من الاتصال
     */
    private startConnectionCheck(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }

        this.connectionCheckInterval = setInterval(() => {
            if (!this.socket?.connected && !this.isConnecting) {
                console.log("🔌 [SocketService] Connection check: ❌ Disconnected");
                
                const token = this.getToken();
                if (token && this.isTokenValid(token)) {
                    console.log("🔌 [SocketService] Attempting to reconnect...");
                    this.connect(token);
                } else {
                    console.log("🔌 [SocketService] Token invalid, cleaning up...");
                    this.cleanup();
                }
            }
        }, SOCKET_CONFIG.connectionCheckInterval);
    }

    // ==========================================================================
    // التنظيف وإدارة الاتصال
    // ==========================================================================

    /**
     * تنظيف الموارد
     */
    private cleanup(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }

        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.currentToken = null;
        this.authErrorCount = 0;
        this.connectionPromise = null;
        this.connectionResolve = null;
        
        console.log("🔌 [SocketService] Cleanup completed");
    }

    /**
     * قطع الاتصال يدوياً
     */
    disconnect(): void {
        console.log("🔌 [SocketService] Disconnecting manually...");
        this.cleanup();
    }

    // ==========================================================================
    // إدارة المستمعين
    // ==========================================================================

    /**
     * إضافة مستمع لحدث
     */
    on(event: string, callback: Function): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event)!.add(callback);
        
        if (this.socket) {
            this.socket.on(event, callback as any);
        }

        // إرجاع دالة للإزالة
        return () => this.off(event, callback);
    }

    /**
     * إزالة مستمع
     */
    off(event: string, callback?: Function): void {
        if (!this.listeners.has(event)) return;

        if (callback) {
            // إزالة مستمع معين
            this.listeners.get(event)!.delete(callback);
            if (this.socket) {
                this.socket.off(event, callback as any);
            }
        } else {
            // إزالة كل المستمعين لهذا الحدث
            this.listeners.delete(event);
            if (this.socket) {
                this.socket.removeAllListeners(event);
            }
        }
    }

    /**
     * إزالة جميع المستمعين
     */
    removeAllListeners(): void {
        this.listeners.clear();
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    /**
     * إرسال حدث لجميع المستمعين المحليين
     */
    private emitToListeners(event: string, data: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ [SocketService] Error in ${event} listener:`, error);
                }
            });
        }
    }

    /**
     * إرسال حدث إلى الخادم
     */
    emit(event: string, data: any): boolean {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
            return true;
        } else {
            // تخزين الحدث لتنفيذه لاحقاً
            if (!this.pendingEvents.has(event)) {
                this.pendingEvents.set(event, []);
            }
            this.pendingEvents.get(event)!.push(data);
            
            console.warn(`⚠️ [SocketService] Event ${event} queued (socket disconnected)`);
            return false;
        }
    }

    // ==========================================================================
    // دوال مساعدة
    // ==========================================================================

    /**
     * إرسال رسالة عبر Socket
     */
    sendMessage(receiverId: string, message: any): void {
        this.emit("send_message", { receiverId, message });
    }

    /**
     * التحقق من حالة الاتصال
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * الحصول على معرف الـ Socket
     */
    getSocketId(): string | null {
        return this.socket?.id || null;
    }

    /**
     * الحصول على حالة الاتصال
     */
    getConnectionStatus(): string {
        if (!this.socket) return "disconnected";
        if (this.socket.connected) return "connected";
        if (this.socket.disconnected) return "disconnected";
        return "connecting";
    }

    /**
     * انتظار الاتصال
     */
    async waitForConnection(timeout: number = 10000): Promise<boolean> {
        if (this.isConnected()) return true;
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                this.off('connect', connectHandler);
                resolve(false);
            }, timeout);

            const connectHandler = () => {
                clearTimeout(timeoutId);
                resolve(true);
            };

            this.on('connect', connectHandler);
        });
    }
}

// ============================================================================
// Hook مخصص لاستخدام Socket
// ============================================================================

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [socketId, setSocketId] = useState<string | null>(null);

    useEffect(() => {
        const checkConnection = () => {
            setIsConnected(socketService.isConnected());
            setSocketId(socketService.getSocketId());
        };

        // التحقق الأولي
        checkConnection();

        // الاستماع لتغييرات الاتصال
        const connectHandler = () => checkConnection();
        const disconnectHandler = () => checkConnection();

        socketService.on('connect', connectHandler);
        socketService.on('disconnect', disconnectHandler);

        return () => {
            socketService.off('connect', connectHandler);
            socketService.off('disconnect', disconnectHandler);
        };
    }, []);

    return {
        socketService,
        isConnected,
        socketId,
        emit: socketService.emit.bind(socketService),
        on: socketService.on.bind(socketService),
        off: socketService.off.bind(socketService)
    };
};

// ============================================================================
// تصدير الخدمة كـ Singleton
// ============================================================================

export const socketService = SocketService.getInstance();