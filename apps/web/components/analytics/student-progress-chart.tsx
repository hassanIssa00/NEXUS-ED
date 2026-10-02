'use client';

import { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, Award, BookOpen, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface StudentProgressPoint {
    date: string;
    averageGrade: number;
    attendanceRate: number;
    assignmentsCompleted: number;
    overallScore: number;
}

interface StudentProgressChartProps {
    studentId: string;
    days?: number;
    data?: StudentProgressPoint[];
}

export function StudentProgressChart({ studentId, days = 30, data: propData }: StudentProgressChartProps) {
    const [data, setData] = useState<StudentProgressPoint[]>(propData || []);
    const [loading, setLoading] = useState(!propData);

    useEffect(() => {
        if (!propData) {
            fetchData();
        }
    }, [studentId, days]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get(`/analytics/student/${studentId}/progress`, { params: { days } });
            setData(Array.isArray(data) ? data : []);
        } catch {
            console.error('Failed to fetch student progress');
        } finally {
            setLoading(false);
        }
    };

    // Calculate trends
    const calculateTrend = (values: number[]) => {
        if (values.length < 2) return 'stable';
        const first = values.slice(0, Math.ceil(values.length / 2));
        const second = values.slice(Math.ceil(values.length / 2));
        const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
        const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
        
        if (secondAvg > firstAvg + 5) return 'up';
        if (secondAvg < firstAvg - 5) return 'down';
        return 'stable';
    };

    const gradeTrend = calculateTrend(data.map(d => d.averageGrade));
    const attendanceTrend = calculateTrend(data.map(d => d.attendanceRate));

    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const latestData = data[data.length - 1] || {
        averageGrade: 0,
        attendanceRate: 0,
        assignmentsCompleted: 0,
        overallScore: 0,
    };

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">متوسط الدرجات</p>
                                <p className="text-2xl font-bold text-blue-600">{latestData.averageGrade}%</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <TrendIcon trend={gradeTrend} />
                                <Award className="w-8 h-8 text-blue-500/50" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 dark:border-green-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">نسبة الحضور</p>
                                <p className="text-2xl font-bold text-green-600">{latestData.attendanceRate}%</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <TrendIcon trend={attendanceTrend} />
                                <Clock className="w-8 h-8 text-green-500/50" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50 dark:border-purple-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">واجبات مسلمة</p>
                                <p className="text-2xl font-bold text-purple-600">{latestData.assignmentsCompleted}</p>
                            </div>
                            <BookOpen className="w-8 h-8 text-purple-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50 dark:border-orange-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">الأداء العام</p>
                                <p className="text-2xl font-bold text-orange-600">{latestData.overallScore}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-orange-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        تطور المستوى
                    </CardTitle>
                    <CardDescription>متابعة أداء الطالب خلال الفترة الماضية</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="combined" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-3">
                            <TabsTrigger value="combined">الكل</TabsTrigger>
                            <TabsTrigger value="grades">الدرجات</TabsTrigger>
                            <TabsTrigger value="attendance">الحضور</TabsTrigger>
                        </TabsList>

                        <TabsContent value="combined" className="mt-4">
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={data}>
                                    <defs>
                                        <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'var(--background)', 
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            direction: 'rtl'
                                        }} 
                                    />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="averageGrade" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                        name="الدرجات"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="attendanceRate" 
                                        stroke="#10b981" 
                                        strokeWidth={3}
                                        dot={{ fill: '#10b981', strokeWidth: 2 }}
                                        name="الحضور"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="overallScore" 
                                        stroke="#f59e0b" 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        name="الأداء العام"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="grades" className="mt-4">
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'var(--background)', 
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px'
                                        }} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="averageGrade" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        fill="url(#gradeGradient)"
                                        name="متوسط الدرجات"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="attendance" className="mt-4">
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'var(--background)', 
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px'
                                        }} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="attendanceRate" 
                                        stroke="#10b981" 
                                        strokeWidth={3}
                                        fill="url(#attendanceGradient)"
                                        name="نسبة الحضور"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
