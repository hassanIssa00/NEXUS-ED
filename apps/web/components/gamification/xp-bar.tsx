'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000];

export function XpBar() {
  const { user } = useAuth();
  const [points, setPoints] = useState<number | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setPoints(null);
    setLevel(null);
    setLoading(Boolean(user?.id));
    if (!user?.id) return () => { active = false; };

    const fetchRank = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');
        const res = await apiClient.get('/gamification/rank');
        const nextPoints = res.data?.points;
        const nextLevel = res.data?.level;
        if (active && typeof nextPoints === 'number' && Number.isFinite(nextPoints) &&
            Number.isInteger(nextLevel) && nextLevel >= 1 && nextLevel <= LEVEL_THRESHOLDS.length) {
          setPoints(nextPoints);
          setLevel(nextLevel);
        }
      } catch (err) {
        console.error('Failed to fetch rank for XP bar', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchRank();
    return () => { active = false; };
  }, [user?.id]);

  if (loading || !user || points === null || level === null) return null;

  const currentLevelMin = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const currentLevelMax = LEVEL_THRESHOLDS[level] ?? null;
  
  const progressPercentage = currentLevelMax === null
    ? 100
    : Math.min(100, Math.max(0, ((points - currentLevelMin) / (currentLevelMax - currentLevelMin)) * 100));

  return (
    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-1.5">
        <div className="bg-yellow-400 rounded-full p-1 shadow-sm">
          <Star className="w-4 h-4 text-yellow-900 fill-current" />
        </div>
        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{points}</span>
      </div>
      
      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
        <span className="text-white text-xs font-bold">{level}</span>
      </div>
    </div>
  );
}
