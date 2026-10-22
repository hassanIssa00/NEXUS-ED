'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, FileText, Award, Calendar, CheckCircle2, X, Zap, BrainCircuit, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { useRealtimeNotifications } from '@/lib/providers/socket-provider';

// ── Types ──────────────────────────────────────────────────
interface Notification {
    id: string;
    type: string;
    title: string;
    body?: string;
    message?: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
    isLive?: boolean;
}

// ── Icon map ───────────────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
    const map: Record<string, { icon: any; color: string; bg: string }> = {
        ASSIGNMENT_LATE: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        GRADE_POSTED:    { icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        STUDENT_ABSENT:  { icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
        ANNOUNCEMENT:    { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        EXAM_REMINDER:   { icon: BrainCircuit, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
        new_assignment:  { icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        grade_updated:   { icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        message:         { icon: MessageSquare, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    };
    const found = map[type] ?? { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' };
    const Icon = found.icon;
    return (
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', found.bg)}>
            <Icon className={cn('w-4 h-4', found.color)} />
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────
export function EnhancedNotifications() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [pulse, setPulse] = useState(false);

    const unread = notifications.filter(n => !n.isRead).length;

    // Load from API
    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/notifications/my');
            const items: Notification[] = (res.data?.data || res.data || []).map((n: any) => ({
                id: n.id,
                type: n.type || 'ANNOUNCEMENT',
                title: n.titleAr || n.title || 'إشعار جديد',
                body: n.bodyAr || n.body || n.message,
                isRead: n.isRead ?? false,
                createdAt: n.createdAt,
                actionUrl: n.data ? JSON.parse(n.data)?.actionUrl : undefined,
            }));
            setNotifications(items);
        } catch {
            // silently ignore — may not be authenticated yet
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    // Real-time push: prepend incoming notification
    const handleLiveNotif = useCallback((n: any) => {
        const item: Notification = {
            id: n.id || `live-${Date.now()}`,
            type: n.type || 'ANNOUNCEMENT',
            title: n.title || 'إشعار جديد',
            body: n.body,
            isRead: false,
            createdAt: n.createdAt || new Date().toISOString(),
            actionUrl: n.actionUrl,
            isLive: true,
        };
        setNotifications(prev => [item, ...prev]);
        setPulse(true);
        setTimeout(() => setPulse(false), 3000);
    }, []);

    useRealtimeNotifications(handleLiveNotif);

    // Mark all read
    const markAllRead = async () => {
        try {
            await apiClient.patch('/notifications/mark-all-read');
        } catch { /* ignore */ }
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    // Mark single read
    const markRead = async (id: string) => {
        if (id.startsWith('live-')) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            return;
        }
        try {
            await apiClient.patch(`/notifications/${id}/read`);
        } catch { /* ignore */ }
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    // Remove
    const dismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const recent   = notifications.slice(0, 20);
    const unreadNs = recent.filter(n => !n.isRead);
    const readNs   = recent.filter(n => n.isRead);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className={cn('h-4 w-4 transition-all', pulse && 'text-violet-600 scale-110')} />
                    <AnimatePresence>
                        {unread > 0 && (
                            <motion.span
                                key="badge"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                                {unread > 99 ? '99+' : unread}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {pulse && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-violet-400/40" />
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-[380px] p-0 shadow-2xl border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <h3 className="font-bold text-sm">الإشعارات</h3>
                        {unread > 0 && (
                            <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {unread} جديد
                            </span>
                        )}
                        {/* Live indicator */}
                        <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-white/80">مباشر</span>
                        </span>
                    </div>
                    {unread > 0 && (
                        <button onClick={markAllRead}
                            className="text-[11px] text-white/70 hover:text-white font-bold transition-colors">
                            تحديد الكل كمقروء
                        </button>
                    )}
                </div>

                <ScrollArea className="max-h-[420px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
                        </div>
                    ) : recent.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-bold text-foreground">لا توجد إشعارات</p>
                            <p className="text-xs text-muted-foreground">ستظهر هنا الإشعارات الجديدة فور وصولها</p>
                        </div>
                    ) : (
                        <div dir="rtl">
                            {/* Unread */}
                            {unreadNs.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wider">
                                        غير مقروء ({unreadNs.length})
                                    </p>
                                    <div className="divide-y divide-border/50">
                                        <AnimatePresence initial={false}>
                                            {unreadNs.map(n => (
                                                <NotifRow key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                            {/* Read */}
                            {readNs.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wider">
                                        مقروء
                                    </p>
                                    <div className="divide-y divide-border/50 opacity-60">
                                        {readNs.slice(0, 5).map(n => (
                                            <NotifRow key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/30">
                    <button onClick={loadNotifications}
                        className="text-xs text-muted-foreground hover:text-foreground font-bold transition-colors flex items-center gap-1">
                        <Zap className="w-3 h-3" /> تحديث
                    </button>
                    <a href="/student/notifications"
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors">
                        عرض الكل
                    </a>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ── Row Component ──────────────────────────────────────────
function NotifRow({ n, onRead, onDismiss }: {
    n: Notification;
    onRead: (id: string) => void;
    onDismiss: (id: string, e: React.MouseEvent) => void;
}) {
    const timeAgo = (() => {
        try {
            return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: arSA });
        } catch { return ''; }
    })();

    return (
        <motion.div
            initial={n.isLive ? { backgroundColor: '#234A6510', x: -4 } : { opacity: 0 }}
            animate={{ backgroundColor: 'transparent', x: 0, opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => { onRead(n.id); if (n.actionUrl) window.location.href = n.actionUrl; }}
            className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors relative group',
                !n.isRead && 'bg-violet-50/50 dark:bg-violet-900/10'
            )}>
            {/* Live badge */}
            {n.isLive && (
                <span className="absolute top-2 left-4 text-[9px] bg-violet-600 text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> مباشر
                </span>
            )}
            <NotifIcon type={n.type} />
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn('text-sm leading-snug truncate', !n.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground')}>
                    {n.title}
                </p>
                {(n.body || n.message) && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body || n.message}
                    </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1" />
                )}
                <button
                    onClick={e => onDismiss(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted">
                    <X className="w-3 h-3 text-muted-foreground" />
                </button>
            </div>
        </motion.div>
    );
}
