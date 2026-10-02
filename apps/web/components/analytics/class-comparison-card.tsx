'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Trophy, TrendingUp, Medal } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface ClassComparison {
    studentAverage: number | null;
    classAverage: number | null;
    studentRank: number | null;
    totalStudents: number;
    percentile: number | null;
}

interface ClassComparisonCardProps {
    studentId: string;
    data?: ClassComparison;
}

export function ClassComparisonCard({ studentId, data: propData }: ClassComparisonCardProps) {
    const [data, setData] = useState<ClassComparison | null>(propData || null);
    const [loading, setLoading] = useState(!propData);

    useEffect(() => {
        if (!propData) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get(`/analytics/student/${studentId}/comparison`);
            setData(data);
        } catch {
            console.error('Failed to fetch class comparison');
        } finally {
            setLoading(false);
        }
    };

    const getMedalColor = (rank: number, total: number) => {
        const percentage = (rank / total) * 100;
        if (percentage <= 10) return 'text-yellow-500'; // Gold
        if (percentage <= 25) return 'text-gray-400'; // Silver
        if (percentage <= 50) return 'text-amber-700'; // Bronze
        return 'text-gray-600';
    };

    const getPerformanceMessage = (percentile: number) => {
        if (percentile >= 90) return { message: 'أداء متميز! من أفضل 10% في الفصل', color: 'text-green-600' };
        if (percentile >= 75) return { message: 'أداء ممتاز! من أفضل 25% في الفصل', color: 'text-blue-600' };
        if (percentile >= 50) return { message: 'أداء جيد! فوق المتوسط', color: 'text-teal-600' };
        if (percentile >= 25) return { message: 'أداء مقبول، يحتاج تحسين', color: 'text-orange-600' };
        return { message: 'يحتاج متابعة ودعم إضافي', color: 'text-red-600' };
    };

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                    لا توجد بيانات للمقارنة
                </CardContent>
            </Card>
        );
    }

    if (data.studentAverage === null || data.classAverage === null || data.studentRank === null || data.percentile === null) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />مقارنة مع الفصل</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 text-center text-gray-500">
                    لا توجد درجات مسجلة كافية لحساب الترتيب والمقارنة.
                </CardContent>
            </Card>
        );
    }

    const performance = getPerformanceMessage(data.percentile);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    مقارنة مع الفصل
                </CardTitle>
                <CardDescription>مستوى الطالب مقارنة بزملائه</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Student Rank */}
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center">
                            <Medal className={`w-16 h-16 ${getMedalColor(data.studentRank, data.totalStudents)}`} />
                            <span className="absolute text-lg font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                {data.studentRank}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            الترتيب من {data.totalStudents} طالب
                        </p>
                    </div>

                    {/* Comparison Bars */}
                    <div className="space-y-4 md:col-span-2">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">الطالب</span>
                                <span className="text-blue-600 font-bold">{data.studentAverage}%</span>
                            </div>
                            <Progress 
                                value={data.studentAverage} 
                                className="h-3 bg-blue-100" 
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">متوسط الفصل</span>
                                <span className="text-gray-600 font-bold">{data.classAverage}%</span>
                            </div>
                            <Progress 
                                value={data.classAverage} 
                                className="h-3 bg-gray-200" 
                            />
                        </div>

                        {/* Percentile */}
                        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-medium">التصنيف: في أفضل {100 - data.percentile}% من الفصل</span>
                            </div>
                            <p className={`mt-2 text-sm font-medium ${performance.color}`}>
                                {performance.message}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Difference indicator */}
                <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-center gap-2">
                        <TrendingUp className={`w-5 h-5 ${data.studentAverage >= data.classAverage ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="text-lg font-bold">
                            {data.studentAverage >= data.classAverage ? '+' : ''}
                            {(data.studentAverage - data.classAverage).toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-600">
                            {data.studentAverage >= data.classAverage ? 'فوق المتوسط' : 'تحت المتوسط'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
