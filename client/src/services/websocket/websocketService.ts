import { io, Socket } from "socket.io-client";
import {
  ComponentListener,
  GlobalListener,
  // SocketMessage,
} from "./types/websocketTypes";

class SocketService {
  private socket: Socket | null = null;
  public url: string = "";
  private globalListeners: Map<string, GlobalListener[]> = new Map();
  private componentListeners: Map<string, ComponentListener[]> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Initialize Socket.IO connection
  connect(url: string, options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.url = url;

        const defaultOptions = {
          transports: ["websocket", "polling"],
          upgrade: true,
          rememberUpgrade: true,
          timeout: 20000,
          forceNew: true,
          withCredentials: true,
          ...options,
        };

        this.socket = io(url, defaultOptions);

        this.socket.on("connect", () => {
          console.log("Socket.IO connected:", this.socket?.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on("disconnect", (reason) => {
          console.log("Socket.IO disconnected:", reason);
          this.isConnected = false;
          if (reason === "io server disconnect") {
            console.log("Server initiated disconnect");
          } else {
            console.log("Will attempt to reconnect...");
          }
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket.IO connection error:", error);
          this.isConnected = false;
          reject(error);
        });

        this.socket.on("reconnect", (attemptNumber) => {
          console.log("Socket.IO reconnected after", attemptNumber, "attempts");
          this.isConnected = true;
        });

        this.socket.on("reconnect_error", (error) => {
          console.error("Socket.IO reconnection error:", error);
          this.reconnectAttempts++;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(
              "Max reconnection attempts reached. Stopping reconnection."
            );
            this.socket?.disconnect();
          }
        });

        this.socket.on("reconnect_failed", () => {
          console.error("Socket.IO failed to reconnect");
          this.isConnected = false;
        });

        // Set up timeout for initial connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Connection timeout"));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Set up message listener to handle custom message format
  // private setupMessageListener() {
  //   if (!this.socket) return;

  //   // Listen for custom message events if you're using a specific format
  //   this.socket.on("message", (data: SocketMessage) => {
  //     this.handleMessage(data);
  //   });
  // }

  // Handle incoming messages (if using custom message format)
  // private handleMessage(message: SocketMessage) {
  //   try {
  //     const { type, payload } = message;

  //     // Handle global listeners
  //     this.handleGlobalListeners(type, payload);

  //     // Handle component listeners
  //     this.handleComponentListeners(type, payload);
  //   } catch (error) {
  //     console.error("Error handling Socket.IO message:", error);
  //   }
  // }

  // Handle global listeners (Redux/API)
  // private handleGlobalListeners(eventType: string, payload: any) {
  //   const listeners = this.globalListeners.get(eventType);
  //   if (listeners) {
  //     listeners.forEach((listener) => {
  //       try {
  //         listener.handler(payload);
  //       } catch (error) {
  //         console.error(`Error in global listener for ${eventType}:`, error);
  //       }
  //     });
  //   }
  // }

  // // Handle component-specific listeners
  // private handleComponentListeners(eventType: string, payload: any) {
  //   const listeners = this.componentListeners.get(eventType);
  //   if (listeners) {
  //     listeners.forEach((listener) => {
  //       try {
  //         listener.handler(payload);
  //       } catch (error) {
  //         console.error(`Error in component listener for ${eventType}:`, error);
  //       }
  //     });
  //   }
  // }

  // Add global listener (Redux action or API call)
  addGlobalListener(
    event: string,
    handler: (data: any) => void,
    type: "redux" | "api"
  ) {
    if (!this.globalListeners.has(event)) {
      this.globalListeners.set(event, []);
    }

    const listener: GlobalListener = { event, handler, type };
    this.globalListeners.get(event)!.push(listener);

    // Also register with Socket.IO directly
    if (this.socket) {
      this.socket.on(event, handler);
    }

    // Return cleanup function
    return () => this.removeGlobalListener(event, handler);
  }

  // Remove global listener
  private removeGlobalListener(event: string, handler: (data: any) => void) {
    const listeners = this.globalListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex((l) => l.handler === handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.globalListeners.delete(event);
      }
    }

    // Also remove from Socket.IO
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  // Add component listener
  addComponentListener(
    event: string,
    componentId: string,
    handler: (data: any) => void
  ) {
    if (!this.componentListeners.has(event)) {
      this.componentListeners.set(event, []);
    }

    const listener: ComponentListener = { event, componentId, handler };
    this.componentListeners.get(event)!.push(listener);

    // Also register with Socket.IO directly
    if (this.socket) {
      this.socket.on(event, handler);
    }

    // Return cleanup function
    return () => this.removeComponentListener(event, componentId, handler);
  }

  // Remove component listener
  private removeComponentListener(
    event: string,
    componentId: string,
    handler?: (data: any) => void
  ) {
    const listeners = this.componentListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(
        (l) =>
          l.componentId === componentId &&
          (handler ? l.handler === handler : true)
      );
      if (index > -1) {
        const listener = listeners[index];
        listeners.splice(index, 1);

        // Remove from Socket.IO
        if (this.socket) {
          this.socket.off(event, listener.handler);
        }
      }
      if (listeners.length === 0) {
        this.componentListeners.delete(event);
      }
    }
  }

  // Remove all listeners for a component (useful for cleanup)
  removeAllComponentListeners(componentId: string) {
    this.componentListeners.forEach((listeners, event) => {
      const listenersToRemove = listeners.filter(
        (l) => l.componentId === componentId
      );

      // Remove from Socket.IO
      listenersToRemove.forEach((listener) => {
        if (this.socket) {
          this.socket.off(event, listener.handler);
        }
      });

      // Remove from internal tracking
      const filteredListeners = listeners.filter(
        (l) => l.componentId !== componentId
      );
      if (filteredListeners.length === 0) {
        this.componentListeners.delete(event);
      } else {
        this.componentListeners.set(event, filteredListeners);
      }
    });
  }

  // Emit event
  emit(event: string, data?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket.IO is not connected. Cannot emit event:", event);
    }
  }

  // Direct Socket.IO methods for advanced usage
  on(event: string, handler: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event: string, handler?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  // Join room
  joinRoom(roomId: string) {
    this.emit("join_room", { roomId });
  }

  // Leave room
  leaveRoom(roomId: string) {
    this.emit("leave_room", { roomId });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.globalListeners.clear();
    this.componentListeners.clear();
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get Socket.IO instance for advanced usage
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
export const websocketService = new SocketService();
