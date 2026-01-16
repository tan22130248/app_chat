const WS_URL = "wss://chat.longapp.site/chat/chat";

class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;
    private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (e: Error) => void; timeout: NodeJS.Timeout }> = new Map();
    private onConnectCallbacks: Array<() => Promise<void>> = [];
    private onReconnectCallbacks: Array<() => Promise<void>> = [];
    private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 2000; // 2s
    private isIntentionallyClosed: boolean = false;
    // private requestCounter: number = 0;

    private constructor() { }

    static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    ensureConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                const checkReady = setInterval(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        clearInterval(checkReady);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkReady);
                    reject(new Error("Connection timeout"));
                }, 15000);
                return;
            }

            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = async () => {
                console.log("[WebSocketService] Connected (reconnected:", this.reconnectAttempts > 0, ")");
                this.reconnectAttempts = 0; // Reset reconnect counter on successful connection

                // Thêm delay nhỏ để socket fully ready
                await new Promise(r => setTimeout(r, 100));

                // Gọi tất cả các hàm callback onConnect đã đăng ký (cho lần kết nối đầu tiên)
                for (const callback of this.onConnectCallbacks) {
                    try {
                        console.log("[WebSocketService] Running onConnect callback");
                        await callback();
                        // Trì hoãn giữa các lần gọi lại để tránh tình trạng tranh đua
                        await new Promise(r => setTimeout(r, 200));
                    } catch (e) {
                        console.warn("[WebSocketService] onConnect callback failed:", e);
                    }
                }

                // Gọi các callback reconnect (khi WS bị mất & reconnect)
                if (this.reconnectAttempts > 0 || this.onReconnectCallbacks.length > 0) {
                    console.log("[WebSocketService] Running onReconnect callbacks");
                    for (const callback of this.onReconnectCallbacks) {
                        try {
                            console.log("[WebSocketService] Running onReconnect callback");
                            await callback();
                            await new Promise(r => setTimeout(r, 200));
                        } catch (e) {
                            console.warn("[WebSocketService] onReconnect callback failed:", e);
                        }
                    }
                }

                resolve();
            };

            this.ws.onmessage = (ev: MessageEvent) => {
                try {
                    const data = JSON.parse(ev.data);
                    console.log("[WS] Response:", data.event, "status:", data.status);
                    console.log("[WS] Message from server:", data);

                    const eventKey = data.event;
                    // const requestId = data.requestId;

                    // Xử lý lỗi xác thực - từ chối tất cả các yêu cầu đang chờ xử lý
                    if (eventKey === "AUTH" && data.status === "error") {
                        console.warn("[WS] AUTH error:", data.mes);
                        this.pendingRequests.forEach((req) => {
                            clearTimeout(req.timeout);
                            req.reject(new Error(data.mes || "User not Login"));
                        });
                        this.pendingRequests.clear();
                        return;
                    }
                    // So khớp phản hồi theo tên sự kiện
                    if (eventKey && this.pendingRequests.has(eventKey)) {
                        // Nếu có pending request với requestId, xử lý response
                        // if (requestId && this.pendingRequests.has(requestId.toString())) {
                        //     const req = this.pendingRequests.get(requestId.toString())!;
                        //     clearTimeout(req.timeout);
                        //     this.pendingRequests.delete(requestId.toString());
                        //
                        //     if (data.status === "error") {
                        //         req.reject(new Error(data.mes || `${eventKey} failed`));
                        //     } else {
                        //         req.resolve(data);
                        //     }
                        // } else if (!requestId && eventKey && this.pendingRequests.has(eventKey)) {
                        //     // Fallback cho các event không có requestId
                        const req = this.pendingRequests.get(eventKey)!;
                        clearTimeout(req.timeout);
                        this.pendingRequests.delete(eventKey);

                        if (data.status === "error") {
                            req.reject(new Error(data.mes || `${eventKey} failed`));
                        } else {
                            req.resolve(data);
                        }
                    }

                    // Gọi tất cả các event listener cho sự kiện này
                    if (eventKey && this.eventListeners.has(eventKey)) {
                        const listeners = this.eventListeners.get(eventKey)!;
                        listeners.forEach(listener => {
                            try {
                                listener(data);
                            } catch (e) {
                                console.error(`[WS] Error in listener for ${eventKey}:`, e);
                            }
                        });
                    }
                } catch (e) {
                    console.error("[WS] Parse error:", e);
                }
            };

            this.ws.onerror = (e) => {
                console.error("[WS] Error:", e);
                reject(new Error("WebSocket connection failed"));
            };

            this.ws.onclose = () => {
                console.log("[WS] Closed - intentionally:", this.isIntentionallyClosed);
                this.ws = null;
                this.pendingRequests.forEach(req => {
                    clearTimeout(req.timeout);
                    req.reject(new Error("WebSocket closed"));
                });
                this.pendingRequests.clear();

                // Auto reconnect nếu không phải đóng cửa có chủ đích
                if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[WS] Auto-reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    setTimeout(() => {
                        console.log("[WS] Attempting to reconnect...");
                        this.ensureConnection().catch((e) => {
                            console.warn("[WS] Reconnection failed:", e);
                        });
                    }, this.reconnectDelay * this.reconnectAttempts); // Exponential backoff
                }
            };
        });
    }

    async request<T = any>(payload: any, eventKey?: string): Promise<T> {
        await this.ensureConnection();

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket not open");
        }

        const event = eventKey || payload.data?.event;
        if (!event) {
            throw new Error("Event name missing in payload");
        }

        // // Tạo unique requestId cho mỗi request
        // const requestId = `${event}_${++this.requestCounter}`;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                // this.pendingRequests.delete(requestId);
                this.pendingRequests.delete(event);
                console.warn(`[WS] Timeout for ${event} after 120s`);
                reject(new Error("Request timeout"));
            }, 120000);
            this.pendingRequests.set(event, { resolve, reject, timeout });
            // this.pendingRequests.set(requestId, { resolve, reject, timeout });

            try {
                console.log(`[WS] Sending ${event}`);
                console.log("[WS] Payload sent:", payload);
                this.ws!.send(JSON.stringify(payload));
                // Thêm requestId vào payload để server có thể gửi lại
                // const enhancedPayload = {
                //     ...payload,
                //     requestId,
                // };
                // console.log(`[WS] Sending ${event} with requestId ${requestId}`);
                // this.ws!.send(JSON.stringify(enhancedPayload));
            } catch (e) {
                this.pendingRequests.delete(event);
                // this.pendingRequests.delete(requestId);
                clearTimeout(timeout);
                reject(e);
            }
        });
    }

    // Đăng ký hàm gọi lại để thực thi khi kết nối WebSocket được thiết lập lần đầu
    addOnConnectCallback(callback: () => Promise<void>) {
        this.onConnectCallbacks.push(callback);
    }

    // Đăng ký hàm gọi lại khi WebSocket reconnect (sau khi bị đóng)
    addOnReconnectCallback(callback: () => Promise<void>) {
        this.onReconnectCallbacks.push(callback);
    }

    // Lắng nghe các event từ server (không phải request-response)
    on(eventName: string, callback: (data: any) => void): () => void {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName)!.push(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.eventListeners.get(eventName);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    close() {
        this.isIntentionallyClosed = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Reset khi chuẩn bị relogin
    reset() {
        this.isIntentionallyClosed = false;
        this.reconnectAttempts = 0;

    }
}

export default WebSocketService.getInstance();
