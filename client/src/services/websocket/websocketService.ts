import { io, Socket } from "socket.io-client";

type Handler = (data: any) => void;

// Time sync tuning
const TIME_SYNC_SAMPLES = 5;
const TIME_SYNC_SPACING_MS = 300;
const TIME_SYNC_REPLY_TIMEOUT_MS = 3000;
const TIME_SYNC_MAX_RETRIES = 3;

// Handshake rejected by server middleware (socket.io does not auto-retry those)
const HANDSHAKE_RETRY_BASE_MS = 1000;
const HANDSHAKE_MAX_RETRIES = 5;

const INITIAL_CONNECT_TIMEOUT_MS = 10000;

class SocketService {
  private socket: Socket | null = null;
  public url: string = "";
  private connectionKey: string | null = null;
  private connectPromise: Promise<void> | null = null;
  private isConnected: boolean = false;

  /**
   * Every listener registered through this service, keyed by event.
   * This registry outlives individual socket instances: handlers registered
   * before the socket exists are attached when it is created, and all of them
   * are re-attached if the socket is recreated (e.g. session switch).
   * A Set per event guarantees a given handler is never attached twice.
   */
  private listeners: Map<string, Set<Handler>> = new Map();
  /** componentId -> registered (event, handler) pairs */
  private componentListeners: Map<string, Array<{ event: string; handler: Handler }>> =
    new Map();
  private reconnectCallbacks: Set<() => void> = new Set();

  // Handshake retry state
  private handshakeRetries = 0;
  private handshakeRetryTimer: ReturnType<typeof setTimeout> | null = null;

  // Time sync state
  private serverTimeOffset: number = 0; // server clock - client clock
  private bestSyncRtt = Infinity;
  private syncSampleCount = 0;
  private pendingSyncClientTimes: Set<number> = new Set();
  private syncTimers: ReturnType<typeof setTimeout>[] = [];

  // Initialize Socket.IO connection. Calling it again with the same url/options
  // reuses the existing socket; different options replace it.
  connect(url: string, options: any = {}): Promise<void> {
    const key = JSON.stringify({ url, auth: options?.auth ?? null });
    if (this.socket && this.connectionKey === key && this.connectPromise) {
      return this.connectPromise;
    }

    this.teardownSocket();
    this.url = url;
    this.connectionKey = key;

    const socket = io(url, {
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      ...options,
    });
    this.socket = socket;

    // Attach every registered listener (global + component + direct) right
    // away, independent of whether the first connect succeeds.
    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });
    socket.on("time-sync", this.handleTimeSyncReply);

    let hasConnected = false;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (err?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (err) reject(err);
        else resolve();
      };
      const timeoutId = setTimeout(() => {
        settle(new Error("Connection timeout"));
      }, INITIAL_CONNECT_TIMEOUT_MS);

      socket.on("connect", () => {
        if (this.socket !== socket) return;
        console.log("Socket.IO connected:", socket.id);
        this.isConnected = true;
        this.handshakeRetries = 0;
        this.startTimeSync();

        if (hasConnected) {
          // Re-connect: refetch whatever may have changed while offline.
          this.reconnectCallbacks.forEach((cb) => {
            try {
              cb();
            } catch (error) {
              console.error("Error in socket reconnect callback:", error);
            }
          });
        }
        hasConnected = true;
        settle();
      });

      socket.on("disconnect", (reason) => {
        if (this.socket !== socket) return;
        console.log("Socket.IO disconnected:", reason);
        this.isConnected = false;
        this.clearSyncTimers();
        if (reason === "io server disconnect") {
          // Server kicked us; socket.io won't reconnect on its own.
          this.scheduleHandshakeRetry(socket);
        }
      });

      socket.on("connect_error", (error) => {
        if (this.socket !== socket) return;
        this.isConnected = false;
        if (!socket.active) {
          // Handshake rejected by server middleware (ended session, unknown
          // team, bad token...). socket.io stops retrying in this case.
          console.warn("Socket.IO handshake rejected:", error?.message);
          this.scheduleHandshakeRetry(socket);
        } else {
          console.warn("Socket.IO connection error (will retry):", error?.message);
        }
        settle(error);
      });
    });
    // The caller may ignore the rejection; the socket keeps retrying anyway.
    this.connectPromise.catch(() => {});

    // Manager-level events (these live on socket.io in v4, not on the socket)
    socket.io.on("reconnect_attempt", (attempt) => {
      if (this.socket !== socket) return;
      if (attempt === 1 || attempt % 5 === 0) {
        console.log("Socket.IO reconnect attempt", attempt);
      }
    });
    socket.io.on("reconnect", (attempt) => {
      if (this.socket !== socket) return;
      console.log("Socket.IO reconnected after", attempt, "attempts");
    });

    return this.connectPromise;
  }

  private scheduleHandshakeRetry(socket: Socket) {
    if (this.handshakeRetryTimer) return;
    if (this.handshakeRetries >= HANDSHAKE_MAX_RETRIES) {
      console.error(
        "Socket.IO: server refused the connection repeatedly; giving up until next login/session change.",
      );
      return;
    }
    const delay = HANDSHAKE_RETRY_BASE_MS * 2 ** this.handshakeRetries;
    this.handshakeRetries++;
    this.handshakeRetryTimer = setTimeout(() => {
      this.handshakeRetryTimer = null;
      if (this.socket !== socket || socket.connected) return;
      socket.connect();
    }, delay);
  }

  private teardownSocket() {
    if (this.handshakeRetryTimer) {
      clearTimeout(this.handshakeRetryTimer);
      this.handshakeRetryTimer = null;
    }
    this.handshakeRetries = 0;
    this.clearSyncTimers();
    const old = this.socket;
    this.socket = null;
    this.connectionKey = null;
    this.connectPromise = null;
    this.isConnected = false;
    if (old) {
      old.io.removeAllListeners();
      old.removeAllListeners();
      old.disconnect();
    }
  }

  // ---- Time synchronization ----

  private clearSyncTimers() {
    this.syncTimers.forEach((t) => clearTimeout(t));
    this.syncTimers = [];
    this.pendingSyncClientTimes.clear();
  }

  private startTimeSync(attempt = 0) {
    const socket = this.socket;
    if (!socket) return;
    this.clearSyncTimers();
    this.bestSyncRtt = Infinity;
    this.syncSampleCount = 0;

    for (let i = 0; i < TIME_SYNC_SAMPLES; i++) {
      this.syncTimers.push(
        setTimeout(() => {
          if (this.socket !== socket || !socket.connected) return;
          let clientTime = Date.now();
          while (this.pendingSyncClientTimes.has(clientTime)) clientTime++;
          this.pendingSyncClientTimes.add(clientTime);
          socket.emit("time-sync", { clientTime });
        }, i * TIME_SYNC_SPACING_MS),
      );
    }

    this.syncTimers.push(
      setTimeout(
        () => {
          this.pendingSyncClientTimes.clear();
          if (this.socket !== socket || !socket.connected) return;
          if (this.syncSampleCount === 0) {
            if (attempt < TIME_SYNC_MAX_RETRIES) {
              console.warn("Time sync: no reply, retrying");
              this.startTimeSync(attempt + 1);
            } else {
              console.warn("Time sync failed; using local clock offset", this.serverTimeOffset);
            }
          }
        },
        (TIME_SYNC_SAMPLES - 1) * TIME_SYNC_SPACING_MS + TIME_SYNC_REPLY_TIMEOUT_MS,
      ),
    );
  }

  private handleTimeSyncReply = (data: { clientTime: number; serverTime: number }) => {
    if (!data || !this.pendingSyncClientTimes.has(data.clientTime)) return;
    this.pendingSyncClientTimes.delete(data.clientTime);
    const now = Date.now();
    const rtt = now - data.clientTime;
    if (rtt < 0) return;
    this.syncSampleCount++;
    // Keep the sample with the lowest round-trip time (least asymmetric delay).
    if (rtt < this.bestSyncRtt) {
      this.bestSyncRtt = rtt;
      this.serverTimeOffset = data.serverTime - (data.clientTime + rtt / 2);
    }
  };

  /** Re-run time sync manually (also runs automatically on every connect). */
  resyncTime() {
    if (this.socket?.connected) this.startTimeSync();
  }

  // ---- Listener registry ----

  private attach(event: string, handler: Handler) {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    if (set.has(handler)) return;
    set.add(handler);
    this.socket?.on(event, handler);
  }

  private detach(event: string, handler?: Handler) {
    const set = this.listeners.get(event);
    if (handler) {
      set?.delete(handler);
      this.socket?.off(event, handler);
    } else {
      set?.forEach((h) => this.socket?.off(event, h));
      set?.clear();
    }
    if (set && set.size === 0) this.listeners.delete(event);
  }

  /** Called on every successful re-connect (not the first connect of a socket). */
  onReconnect(callback: () => void) {
    this.reconnectCallbacks.add(callback);
    return () => {
      this.reconnectCallbacks.delete(callback);
    };
  }

  // Add global listener (Redux action or API call)
  addGlobalListener(
    event: string,
    handler: Handler,
    type: "redux" | "api",
  ) {
    void type; // kept for API compatibility / readability at call sites
    this.attach(event, handler);
    return () => this.detach(event, handler);
  }

  // Add component listener
  addComponentListener(event: string, componentId: string, handler: Handler) {
    const list = this.componentListeners.get(componentId) ?? [];
    list.push({ event, handler });
    this.componentListeners.set(componentId, list);
    this.attach(event, handler);
    return () => this.removeComponentListener(event, componentId, handler);
  }

  private removeComponentListener(event: string, componentId: string, handler: Handler) {
    const list = this.componentListeners.get(componentId);
    if (list) {
      const remaining = list.filter((l) => !(l.event === event && l.handler === handler));
      if (remaining.length) this.componentListeners.set(componentId, remaining);
      else this.componentListeners.delete(componentId);
    }
    this.detach(event, handler);
  }

  // Remove all listeners for a component (useful for cleanup)
  removeAllComponentListeners(componentId: string) {
    const list = this.componentListeners.get(componentId) ?? [];
    this.componentListeners.delete(componentId);
    list.forEach(({ event, handler }) => this.detach(event, handler));
  }

  // Emit event
  emit(event: string, data?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket.IO is not connected. Cannot emit event:", event);
    }
  }

  // Direct listener registration. Works before the socket exists (queued) and
  // survives socket recreation.
  on(event: string, handler: Handler) {
    this.attach(event, handler);
  }

  off(event: string, handler?: Handler) {
    this.detach(event, handler);
  }

  // Join room
  joinRoom(roomId: string) {
    this.emit("join_room", { roomId });
  }

  // Leave room
  leaveRoom(roomId: string) {
    this.emit("leave_room", { roomId });
  }

  // Disconnect the socket. Registered listeners are kept so they are attached
  // again to the next socket (components remove their own on unmount).
  disconnect() {
    this.teardownSocket();
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get Socket.IO instance for advanced usage
  getSocket(): Socket | null {
    return this.socket;
  }

  // Get current timestamp synchronized with server clock
  getSynchronizedTime(): number {
    // Round to whole milliseconds so downstream BigInt parsing for buzzer
    // timestamps never receives values like "1712345678901.5".
    return Math.round(Date.now() + this.serverTimeOffset);
  }
}

// Create singleton instance
export const websocketService = new SocketService();
