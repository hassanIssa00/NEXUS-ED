'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../api/endpoints';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface RealtimeNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface RealtimeAssignment {
  id: string;
  title: string;
  subject: string;
  dueDate?: string;
  teacherName?: string;
  createdAt: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  /** Join a class room to receive class-level events */
  joinClass: (classId: string) => void;
  leaveClass: (classId: string) => void;
  /** Subscribe to an event. Returns an unsubscribe function. */
  on: <T = any>(event: string, handler: (data: T) => void) => () => void;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────
const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  joinClass: () => {},
  leaveClass: () => {},
  on: () => () => {},
});

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────
export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = getSocketBaseUrl();
    if (!socketUrl) return;

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') || localStorage.getItem('token')
        : null;

    const socket = io(`${socketUrl}/events`, {
      auth: { token: token ?? '' },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 5000,
      reconnectionAttempts: 3,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.debug('[Socket] Connected to /events');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.debug('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.debug('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinClass = useCallback((classId: string) => {
    socketRef.current?.emit('joinClass', { classId });
  }, []);

  const leaveClass = useCallback((classId: string) => {
    socketRef.current?.emit('leaveClass', { classId });
  }, []);

  const on = useCallback(
    <T = any>(event: string, handler: (data: T) => void) => {
      const socket = socketRef.current;
      socket?.on(event, handler);
      return () => {
        socket?.off(event, handler);
      };
    },
    [],
  );

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, joinClass, leaveClass, on }}
    >
      {children}
    </SocketContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────
export function useSocket() {
  return useContext(SocketContext);
}

/** Subscribe to real-time notifications for the current user */
export function useRealtimeNotifications(
  onNotification: (n: RealtimeNotification) => void,
) {
  const { on } = useSocket();
  useEffect(() => {
    return on<RealtimeNotification>('new_notification', onNotification);
  }, [on, onNotification]);
}

/** Subscribe to new assignments pushed to a class */
export function useRealtimeAssignments(
  onAssignment: (a: RealtimeAssignment) => void,
) {
  const { on } = useSocket();
  useEffect(() => {
    return on<RealtimeAssignment>('new_assignment', onAssignment);
  }, [on, onAssignment]);
}

/** Subscribe to grade updates */
export function useRealtimeGrades(onGrade: (g: any) => void) {
  const { on } = useSocket();
  useEffect(() => {
    return on('grade_updated', onGrade);
  }, [on, onGrade]);
}

/** Subscribe to attendance events */
export function useRealtimeAttendance(onAttendance: (a: any) => void) {
  const { on } = useSocket();
  useEffect(() => {
    return on('attendance_marked', onAttendance);
  }, [on, onAttendance]);
}
