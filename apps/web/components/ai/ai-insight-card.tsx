'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';

interface Prediction {
  averageGrade: number;
  gradeRecordCount: number;
  attendanceRate: number | null;
  attendanceRecordCount: number;
  riskFactors: string[];
  recommendations: string[];
}

export function AiInsightCard() {
  const { profile } = useAuth();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    const fetchInsight = async () => {
      try {
        const res = await apiClient.get(`/ai/predict/${profile.id}`);
        if (res.data) {
          setPrediction(res.data);
        }
      } catch (error) {
        console.error('Failed to load AI insight', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsight();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 p-6 rounded-[2rem] flex flex-col items-center justify-center min-h-[160px] animate-pulse">
        <BrainCircuit className="w-8 h-8 text-violet-400 mb-2 opacity-50" />
        <p className="text-sm font-bold text-violet-500/50">NEXUS AI يحلل أداءك...</p>
      </div>
    );
  }

  if (!prediction) return null;

  const isGood = prediction.averageGrade >= 80;
  const hasRisks = prediction.riskFactors.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm group hover:shadow-md transition-shadow"
    >
      {/* Decorative Background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-colors" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">NEXUS AI Insights</h3>
            <p className="text-[10px] text-gray-500">تحليل ذكي لمستواك</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-500 font-medium">متوسط الدرجات المسجل</span>
          <span className={`text-xl font-black ${isGood ? 'text-emerald-500' : 'text-amber-500'}`}>
            {prediction.averageGrade}%
          </span>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {/* Recommendation */}
        {prediction.recommendations.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3.5 rounded-2xl flex items-start gap-3">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
              {prediction.recommendations[0]}
            </p>
          </div>
        )}

        {/* Risk Factors */}
        {hasRisks && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] font-black text-amber-900 dark:text-amber-500 mb-1">نقاط تحتاج انتباهك:</p>
              <ul className="text-xs font-medium text-amber-800 dark:text-amber-200/80 space-y-1 list-disc list-inside">
                {prediction.riskFactors.slice(0, 2).map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <p className="text-[10px] text-gray-500">
          {prediction.gradeRecordCount} سجل درجات
          {prediction.attendanceRate === null
            ? ' · لا توجد سجلات حضور'
            : ` · الحضور ${prediction.attendanceRate}% من ${prediction.attendanceRecordCount} سجل`}
        </p>
      </div>
    </motion.div>
  );
}
