'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventsSocket } from '@/hooks/use-events-socket';
import { useLocale } from 'next-intl';
import { Zap, Trophy } from 'lucide-react';

interface XpEvent {
  amount: number;
  reason: string;
  totalXP: number;
  newLevel?: number;
  levelName?: string;
}

export function XpToast() {
  const isEnglish = useLocale() === 'en';
  const { socket, isConnected } = useEventsSocket();
  const [events, setEvents] = useState<(XpEvent & { id: string })[]>([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleXpAwarded = (data: XpEvent) => {
      const id = Math.random().toString(36).substring(7);
      setEvents(prev => [...prev, { ...data, id }]);

      // Remove after 4 seconds
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e.id !== id));
      }, 4000);
    };

    socket.on('gamification.xp_awarded', handleXpAwarded);

    return () => {
      socket.off('gamification.xp_awarded', handleXpAwarded);
    };
  }, [socket, isConnected]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            {event.newLevel ? (
              // Level Up Toast
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 shadow-2xl flex items-center gap-4 text-white min-w-[300px]">
                <div className="bg-white/20 p-3 rounded-full">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{isEnglish ? 'Level up!' : 'مستوى جديد!'}</h4>
                  <p className="text-white/90 text-sm">{isEnglish ? `You reached ${event.levelName}` : `لقد وصلت إلى ${event.levelName}`}</p>
                </div>
              </div>
            ) : (
              // Normal XP Toast
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4 min-w-[250px]">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-xl text-yellow-500">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">{isEnglish ? `+${event.amount} points` : `+${event.amount} نقطة`}</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{event.reason}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
