import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../lib/api/endpoints';

export function useEventsSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const socketUrl = getSocketBaseUrl();
    if (!token || !socketUrl) return;

    socketRef.current = io(`${socketUrl}/events`, {
        auth: { token },
        transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
        console.log('Events Socket connected:', socket.id);
        setIsConnected(true);
    });

    socket.on('disconnect', () => {
        console.log('Events Socket disconnected');
        setIsConnected(false);
    });

    return () => {
        socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, isConnected };
}
