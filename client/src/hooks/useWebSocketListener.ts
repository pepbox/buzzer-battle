import { useEffect, useRef, useState } from "react";
import { websocketService } from "../services/websocket/websocketService";
import { Events } from "../services/websocket/enums/Events";

/**
 * Custom hook for WebSocket component listeners
 * Automatically cleans up listener on unmount
 * 
 * @param event - The WebSocket event to listen for
 * @param handler - Callback function when event is received
 * @param componentId - Unique identifier for the component
 * @param deps - Dependencies array (like useEffect)
 */
export const useWebSocketListener = (
  event: Events,
  handler: (data: any) => void,
  componentId: string,
  deps: React.DependencyList = []
) => {
  const handlerRef = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Stable handler that calls the latest version
    const stableHandler = (data: any) => {
      handlerRef.current(data);
    };

    // Add listener
    const cleanup = websocketService.addComponentListener(
      event,
      componentId,
      stableHandler
    );

    // Cleanup on unmount or when dependencies change
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, componentId, ...deps]);
};

/**
 * Hook for listening to multiple events
 * 
 * @param listeners - Array of event listeners
 * @param componentId - Unique identifier for the component
 */
export const useWebSocketListeners = (
  listeners: Array<{ event: Events; handler: (data: any) => void }>,
  componentId: string
) => {
  useEffect(() => {
    const cleanups = listeners.map(({ event, handler }) =>
      websocketService.addComponentListener(event, componentId, handler)
    );

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [listeners, componentId]);
};

/**
 * Hook to check WebSocket connection status
 */
export const useWebSocketStatus = () => {
  const [isConnected, setIsConnected] = useState(
    websocketService.getConnectionStatus()
  );

  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(websocketService.getConnectionStatus());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);

  return isConnected;
};
