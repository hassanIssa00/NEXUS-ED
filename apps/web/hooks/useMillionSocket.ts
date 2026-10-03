import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../lib/api/endpoints';

interface Player {
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
}

interface Question {
    id: number;
    text_ar: string;
    options: string[];
}

interface LeaderboardEntry {
    userId: string;
    name: string;
    avatar?: string;
    totalPoints: number;
    correctAnswers: number;
    questionsAnswered: number;
    rank: number;
}

/**
 * Custom hook for Million Dialogue Socket.IO connection
 */
export function useMillionSocket(roomId?: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Initialize socket connection
    useEffect(() => {
        // Get JWT token from localStorage or cookie
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
        const socketUrl = getSocketBaseUrl();

        if (!token) {
            setError('Authentication token not found');
            return;
        }
        if (!socketUrl) {
            setError('Realtime service is not configured for this deployment');
            return;
        }

        // Create socket connection
        const newSocket = io(`${socketUrl}/million`, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection events
        newSocket.on('connect', () => {
            console.log('✅ Connected to Million Dialogue server');
            setConnected(true);
            setError(null);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            setConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setError(err.message);
            setConnected(false);
        });

        // Cleanup on unmount
        return () => {
            newSocket.close();
        };
    }, []);

    // Auto-join room if roomId provided
    useEffect(() => {
        if (socket && connected && roomId) {
            joinRoom(roomId);
        }
    }, [socket, connected, roomId]);

    /**
     * Create a new room
     */
    const createRoom = useCallback((data: {
        title: string;
        type: 'public' | 'private';
        settings?: any;
    }): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit('create-room', data, (response: any) => {
                if (response.success) {
                    resolve(response.room);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, [socket]);

    /**
     * Join an existing room
     */
    const joinRoom = useCallback((roomId: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit('join-room', { roomId }, (response: any) => {
                if (response.success) {
                    resolve(response.room);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, [socket]);

    /**
     * Leave a room
     */
    const leaveRoom = useCallback((roomId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit('leave-room', { roomId }, (response: any) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, [socket]);

    /**
     * Start a new round (host only)
     */
    const startRound = useCallback((roomId: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit('start-round', { roomId }, (response: any) => {
                if (response.success) {
                    resolve(response.round);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, [socket]);

    /**
     * Submit an answer
     */
    const submitAnswer = useCallback((data: {
        roomId: string;
        questionId: number;
        chosenIndex: number;
        timeTaken: number;
    }): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('Socket not connected'));
                return;
            }

            socket.emit('submit-answer', data, (response: any) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, [socket]);

    /**
     * Listen for room created event
     */
    const onRoomCreated = useCallback((callback: (data: any) => void) => {
        if (socket) {
            socket.on('room.created', callback);
            return () => socket.off('room.created', callback);
        }
    }, [socket]);

    /**
     * Listen for room joined event
     */
    const onRoomJoined = useCallback((callback: (data: { player: Player; participantCount: number }) => void) => {
        if (socket) {
            socket.on('room.joined', callback);
            return () => socket.off('room.joined', callback);
        }
    }, [socket]);

    /**
     * Listen for round started event
     */
    const onRoundStarted = useCallback((callback: (data: any) => void) => {
        if (socket) {
            socket.on('round.started', callback);
            return () => socket.off('round.started', callback);
        }
    }, [socket]);

    /**
     * Listen for question sent event
     */
    const onQuestionSent = useCallback((callback: (data: {
        question: Question;
        timeLimit: number;
        orderIndex: number;
        totalQuestions: number;
    }) => void) => {
        if (socket) {
            socket.on('question.sent', callback);
            return () => socket.off('question.sent', callback);
        }
    }, [socket]);

    /**
     * Listen for question result event
     */
    const onQuestionResult = useCallback((callback: (data: any) => void) => {
        if (socket) {
            socket.on('question.result', callback);
            return () => socket.off('question.result', callback);
        }
    }, [socket]);

    /**
     * Listen for leaderboard updated event
     */
    const onLeaderboardUpdated = useCallback((callback: (data: { leaderboard: LeaderboardEntry[] }) => void) => {
        if (socket) {
            socket.on('leaderboard.updated', callback);
            return () => socket.off('leaderboard.updated', callback);
        }
    }, [socket]);

    /**
     * Listen for round finished event
     */
    const onRoundFinished = useCallback((callback: (data: any) => void) => {
        if (socket) {
            socket.on('round.finished', callback);
            return () => socket.off('round.finished', callback);
        }
    }, [socket]);

    /**
     * Listen for room left event
     */
    const onRoomLeft = useCallback((callback: (data: any) => void) => {
        if (socket) {
            socket.on('room.left', callback);
            return () => socket.off('room.left', callback);
        }
    }, [socket]);

    return {
        socket,
        connected,
        error,
        // Actions
        createRoom,
        joinRoom,
        leaveRoom,
        startRound,
        submitAnswer,
        // Event listeners
        onRoomCreated,
        onRoomJoined,
        onRoundStarted,
        onQuestionSent,
        onQuestionResult,
        onLeaderboardUpdated,
        onRoundFinished,
        onRoomLeft
    };
}

export default useMillionSocket;
