'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, Award, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from 'next-intl';

// Import new analytics components
import { StudentProgressChart } from '@/components/analytics/student-progress-chart';
import { ClassComparisonCard } from '@/components/analytics/class-comparison-card';
import { ParentReportView } from '@/components/analytics/parent-report-view';
import { StudentGamificationCard } from '@/components/gamification/student-stats-card';

function LoadingCard() {
    return (
        <Card className="animate-pulse">
            <CardContent className="pt-6">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
        </Card>
    );
}

export default function StudentAnalyticsPage() {
    const isEnglish = useLocale() === 'en';
    const t = (ar: string, en: string) => isEnglish ? en : ar;
    const { user, profile } = useAuth();
    const studentId = user?.id;

    return (
        <div className="space-y-6" dir={isEnglish ? 'ltr' : 'rtl'}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold mb-2">📊 {t('تحليلات الأداء', 'Performance analytics')}</h1>
                    <p className="text-blue-100 text-lg">{t('تابع تقدمك وقارن مستواك بزملائك', 'Track your progress and compare your performance with classmates')}</p>
                </div>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue="progress" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="progress" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('تطور المستوى', 'Progress')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('مقارنة بالفصل', 'Class comparison')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="achievements" className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('الإنجازات', 'Achievements')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="report" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('التقرير', 'Report')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Progress Tab */}
                <TabsContent value="progress">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Suspense fallback={<LoadingCard />}>
                            {studentId ? <StudentProgressChart studentId={studentId} /> : <p className="p-6 text-center text-muted-foreground">{t('سجّل الدخول لعرض بياناتك.', 'Sign in to view your data.')}</p>}
                        </Suspense>
                    </motion.div>
                </TabsContent>

                {/* Comparison Tab */}
                <TabsContent value="comparison">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Suspense fallback={<LoadingCard />}>
                            {studentId ? <ClassComparisonCard studentId={studentId} /> : <p className="p-6 text-center text-muted-foreground">{t('سجّل الدخول لعرض بياناتك.', 'Sign in to view your data.')}</p>}
                        </Suspense>
                    </motion.div>
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Suspense fallback={<LoadingCard />}>
                            {studentId ? <StudentGamificationCard studentId={studentId} /> : <p className="p-6 text-center text-muted-foreground">{t('سجّل الدخول لعرض بياناتك.', 'Sign in to view your data.')}</p>}
                        </Suspense>
                    </motion.div>
                </TabsContent>

                {/* Report Tab */}
                <TabsContent value="report">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Suspense fallback={<LoadingCard />}>
                            {studentId ? <ParentReportView studentId={studentId} /> : <p className="p-6 text-center text-muted-foreground">{t('سجّل الدخول لعرض بياناتك.', 'Sign in to view your data.')}</p>}
                        </Suspense>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
