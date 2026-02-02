"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const socketInstance = io(apiUrl, {
      path: "/socket.io",
      addTrailingSlash: false,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    // Presence Heartbeat
    const interval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit("presence", { status: "online" });
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(interval);
      socketInstance.disconnect();
    };
  }, []);

  const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
