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
import { TrendingUp, TrendingDown, Minus, Award, BookOpen, Clock, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface StudentProgressPoint {
    date: string;
    averageGrade: number | null;
    attendanceRate: number | null;
    assignmentsCompleted: number;
}

interface StudentProgressChartProps {
    studentId: string;
    days?: number;
    data?: StudentProgressPoint[];
}

export function StudentProgressChart({ studentId, days = 30, data: propData }: StudentProgressChartProps) {
    const [data, setData] = useState<StudentProgressPoint[]>(propData ?? []);
    const [loading, setLoading] = useState(propData === undefined);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (propData !== undefined) {
            setData(propData);
            setLoading(false);
            setLoadError(false);
            return;
        }

        let active = true;
        setLoading(true);
        setLoadError(false);
        apiClient.get(`/analytics/student/${studentId}/progress`, { params: { days } })
            .then(({ data: responseData }) => {
                if (active) setData(Array.isArray(responseData) ? responseData : []);
            })
            .catch(() => {
                if (active) {
                    setData([]);
                    setLoadError(true);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [studentId, days, propData, reloadKey]);

    const calculateTrend = (values: number[]) => {
        if (values.length < 2) return null;
        const midpoint = Math.ceil(values.length / 2);
        const first = values.slice(0, midpoint);
        const second = values.slice(midpoint);
        const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
        const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;

        if (secondAvg > firstAvg + 5) return 'up';
        if (secondAvg < firstAvg - 5) return 'down';
        return 'stable';
    };

    const gradeTrend = calculateTrend(data.flatMap(point => point.averageGrade === null ? [] : [point.averageGrade]));
    const attendanceTrend = calculateTrend(data.flatMap(point => point.attendanceRate === null ? [] : [point.attendanceRate]));

    const TrendIcon = ({ trend }: { trend: string | null }) => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
        if (trend === 'stable') return <Minus className="w-4 h-4 text-gray-400" />;
        return null;
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

    if (loadError || data.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                        {loadError ? 'تعذر تحميل سجلات التقدم من المدرسة.' : 'لا توجد سجلات درجات أو حضور أو واجبات لهذه الفترة.'}
                    </p>
                    {loadError && (
                        <button onClick={() => setReloadKey(key => key + 1)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
                        </button>
                    )}
                </CardContent>
            </Card>
        );
    }

    const latestData = data[data.length - 1];
    const displayValue = (value: number | null, suffix = '') => value === null ? '—' : `${value}${suffix}`;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">متوسط الدرجات</p>
                                <p className="text-2xl font-bold text-blue-600">{displayValue(latestData.averageGrade, '%')}</p>
                            </div>
                            <div className="flex items-center gap-1"><TrendIcon trend={gradeTrend} /><Award className="w-8 h-8 text-blue-500/50" /></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 dark:border-green-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">نسبة الحضور</p>
                                <p className="text-2xl font-bold text-green-600">{displayValue(latestData.attendanceRate, '%')}</p>
                            </div>
                            <div className="flex items-center gap-1"><TrendIcon trend={attendanceTrend} /><Clock className="w-8 h-8 text-green-500/50" /></div>
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
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> تطور المستوى</CardTitle>
                    <CardDescription>السجلات الفعلية المتاحة خلال الفترة الماضية</CardDescription>
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
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', direction: 'rtl' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="averageGrade" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} name="الدرجات" />
                                    <Line type="monotone" dataKey="attendanceRate" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} name="الحضور" />
                                </LineChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="grades" className="mt-4">
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="averageGrade" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.12} name="متوسط الدرجات" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="attendance" className="mt-4">
                            <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="attendanceRate" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.12} name="نسبة الحضور" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
