'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Trophy, Flame, Target, Zap, Award, Lock } from 'lucide-react';

interface XpTransaction {
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
}

interface StudentGamificationStats {
    totalPoints: number;
    level: number;
    levelName: string;
    currentLevelPoints: number;
    nextLevelPoints: number;
    rank: number;
    totalStudents: number;
    streak: number;
    recentTransactions: XpTransaction[];
}

interface StudentGamificationCardProps {
    studentId: string;
    data?: StudentGamificationStats;
}

const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000, 12000, 20000];
const LEVEL_NAMES = ['مبتدئ', 'مستكشف', 'مبادر', 'متميز', 'محترف', 'عبقري', 'أسطوري', 'بطل نكسس'];

export function StudentGamificationCard({ studentId, data: propData }: StudentGamificationCardProps) {
    const [data, setData] = useState<StudentGamificationStats | null>(propData || null);
    const [loading, setLoading] = useState(!propData);

    useEffect(() => {
        if (!propData) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { apiClient } = await import('@/lib/api/client');
            const response = await apiClient.get(`/gamification/rank`);
            
            if (response.data) {
                const apiData = response.data;
                
                const currentLevelPoints = apiData.points;
                const nextLevelPoints = LEVEL_THRESHOLDS[apiData.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

                setData({
                    totalPoints: apiData.points,
                    level: apiData.level,
                    levelName: apiData.levelName,
                    currentLevelPoints,
                    nextLevelPoints,
                    rank: apiData.rank,
                    totalStudents: 100, // This could be fetched from API later
                    streak: 0, // Fallback, could be added to backend
                    recentTransactions: apiData.recentTransactions || [],
                });
            }
        } catch (err) {
            console.error('Failed to fetch gamification stats', err);
            // Fallback to minimal data if API fails
            setData({
                totalPoints: 0,
                level: 1,
                levelName: 'Beginner (مبتدئ)',
                currentLevelPoints: 0,
                nextLevelPoints: 500,
                rank: 0,
                totalStudents: 0,
                streak: 0,
                recentTransactions: [],
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardContent className="pt-6">
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const levelProgress = ((data.currentLevelPoints - LEVEL_THRESHOLDS[data.level - 1]!) / 
        (data.nextLevelPoints - LEVEL_THRESHOLDS[data.level - 1]!)) * 100;

    return (
        <div className="space-y-4">
            {/* Main Stats Card */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 p-6 text-white">
                    <div className="flex items-center justify-between">
                        {/* Level Badge */}
                        <motion.div 
                            className="text-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                        >
                            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-2">
                                <span className="text-3xl font-bold">{data.level}</span>
                            </div>
                            <p className="text-sm opacity-90">{LEVEL_NAMES[data.level - 1]}</p>
                        </motion.div>

                        {/* Points */}
                        <div className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                                <Star className="w-8 h-8 text-yellow-300" />
                                <span className="text-4xl font-bold">{data.totalPoints}</span>
                            </div>
                            <p className="text-sm opacity-90">نقطة</p>
                        </div>

                        {/* Streak */}
                        <div className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                                <Flame className="w-8 h-8 text-orange-300" />
                                <span className="text-4xl font-bold">{data.streak}</span>
                            </div>
                            <p className="text-sm opacity-90">يوم متتالي</p>
                        </div>

                        {/* Rank */}
                        <div className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                                <Trophy className="w-8 h-8 text-yellow-300" />
                                <span className="text-4xl font-bold">#{data.rank}</span>
                            </div>
                            <p className="text-sm opacity-90">من {data.totalStudents}</p>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="mt-6">
                        <div className="flex justify-between text-sm mb-2">
                            <span>المستوى {data.level}</span>
                            <span>{data.currentLevelPoints}/{data.nextLevelPoints} نقطة</span>
                        </div>
                        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-white rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${levelProgress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Recent Transactions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        سجل النقاط
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.recentTransactions.length === 0 ? (
                            <p className="text-sm text-center text-gray-500 py-4">لا توجد نقاط مسجلة بعد</p>
                        ) : (
                            data.recentTransactions.map((tx, index) => (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20"
                                >
                                    <div>
                                        <p className="font-medium text-sm">{tx.reason}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(tx.createdAt).toLocaleDateString('ar-SA')}
                                        </p>
                                    </div>
                                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                                        +{tx.amount} نقطة
                                    </Badge>
                                </motion.div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
