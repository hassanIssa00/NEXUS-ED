'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Medal } from 'lucide-react';

// Import gamification components
import { Leaderboard } from '@/components/gamification/leaderboard';
import { StudentGamificationCard } from '@/components/gamification/student-stats-card';
import { useAuth } from '@/contexts/auth-context';

function LoadingCard() {
    return (
        <Card className="animate-pulse">
            <CardContent className="pt-6">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
        </Card>
    );
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const studentId = user?.id;

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl p-8 text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-30">
                    <Trophy className="w-full h-full" />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        🏆 لوحة الشرف
                    </h1>
                    <p className="text-yellow-100 text-lg">تنافس مع زملائك واجمع النقاط!</p>
                </div>
            </motion.div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Leaderboard */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Suspense fallback={<LoadingCard />}>
                            <Leaderboard />
                        </Suspense>
                    </motion.div>
                </div>

                {/* Student Stats Sidebar */}
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Suspense fallback={<LoadingCard />}>
                            {studentId ? <StudentGamificationCard studentId={studentId} /> : <p className="p-6 text-center text-muted-foreground">سجّل الدخول لعرض بياناتك.</p>}
                        </Suspense>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
