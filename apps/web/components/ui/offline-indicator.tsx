'use client';

import { useOffline } from '@/hooks/use-offline';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, CloudOff, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
    const isEnglish = useLocale() === 'en';
    const { isOnline, isServiceWorkerReady, pendingActions, syncPendingActions } = useOffline();

    return (
        <AnimatePresence>
            {/* Offline Banner */}
            {!isOnline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white py-2 px-4 flex items-center justify-center gap-2"
                >
                    <WifiOff className="w-5 h-5" />
                    <span className="font-medium">{isEnglish ? 'You are offline' : 'أنت غير متصل بالإنترنت'}</span>
                    <span className="text-sm opacity-80">{isEnglish ? '— Changes will sync when you reconnect' : '- التغييرات ستُزامَن عند عودة الاتصال'}</span>
                </motion.div>
            )}

            {/* Pending sync indicator */}
            {pendingActions > 0 && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="fixed bottom-4 left-4 z-50"
                >
                    <div className="bg-blue-600 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                        <CloudOff className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            {isEnglish ? `${pendingActions} pending ${pendingActions === 1 ? 'action' : 'actions'}` : `${pendingActions} إجراء في الانتظار`}
                        </span>
                        {isOnline && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-blue-700 p-1"
                                onClick={syncPendingActions}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function ConnectionStatus() {
    const isEnglish = useLocale() === 'en';
    const { isOnline, isServiceWorkerReady } = useOffline();

    return (
        <div className="flex items-center gap-2">
            {isOnline ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <Wifi className="w-3 h-3 mr-1" />
                    {isEnglish ? 'Online' : 'متصل'}
                </Badge>
            ) : (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    <WifiOff className="w-3 h-3 mr-1" />
                    {isEnglish ? 'Offline' : 'غير متصل'}
                </Badge>
            )}
            {isServiceWorkerReady && (
                <Badge variant="outline" className="text-xs">
                    <Cloud className="w-3 h-3 mr-1" />
                    {isEnglish ? 'Ready to work offline' : 'جاهز للعمل بدون إنترنت'}
                </Badge>
            )}
        </div>
    );
}
