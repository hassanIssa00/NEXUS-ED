'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api/client';
import { 
    Users, GraduationCap, BookOpen, Building2, 
    CalendarCheck, AlertTriangle, TrendingUp, Download,
    CheckCircle, XCircle, Clock, FileText
} from 'lucide-react';

interface AdminOverview {
    stats: {
        totalStudents: number;
        totalTeachers: number;
        totalClasses: number;
        totalSubjects: number;
        totalAssignments: number;
        activeUsers: number;
    };
    attendance: {
        todayPresent: number;
        todayAbsent: number;
        todayLate: number;
        weeklyRate: number;
    };
    assignments: {
        pending: number;
        submitted: number;
        graded: number;
        overdueRate: number;
    };
}

interface AdminDashboardProps {
    data?: AdminOverview;
}

export function AdminDashboard({ data: propData }: AdminDashboardProps) {
    const [data, setData] = useState<AdminOverview | null>(propData || null);
    const [loading, setLoading] = useState(!propData);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (!propData) {
            fetchData();
        }
    }, [propData]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<AdminOverview>('/admin/dashboard/overview');
            setData(response.data);
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type: 'overview' | 'teachers' | 'classes' | 'full') => {
        try {
            const response = await apiClient.get<Blob>('/admin/dashboard/export/data', {
                params: { type },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nexus-admin-report-${type}-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            setLoadError(true);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="pt-6">
                            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                {loadError ? 'تعذر تحميل بيانات لوحة الإدارة من الخادم.' : 'لا توجد بيانات مدرسية مسجلة بعد.'}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Export */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">لوحة تحكم الإدارة</h1>
                    <p className="text-gray-600">نظرة عامة على أداء المدرسة</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('overview')}>
                        <Download className="w-4 h-4 ml-2" />
                        تقرير سريع (JSON)
                    </Button>
                    <Button onClick={() => handleExport('full')}>
                        <FileText className="w-4 h-4 ml-2" />
                        تقرير شامل (JSON)
                    </Button>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">الطلاب</p>
                                <p className="text-2xl font-bold text-blue-600">{data.stats.totalStudents}</p>
                            </div>
                            <GraduationCap className="w-8 h-8 text-blue-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">المدرسين</p>
                                <p className="text-2xl font-bold text-green-600">{data.stats.totalTeachers}</p>
                            </div>
                            <Users className="w-8 h-8 text-green-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">الفصول</p>
                                <p className="text-2xl font-bold text-purple-600">{data.stats.totalClasses}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-purple-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">المواد</p>
                                <p className="text-2xl font-bold text-orange-600">{data.stats.totalSubjects}</p>
                            </div>
                            <BookOpen className="w-8 h-8 text-orange-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-200 dark:border-cyan-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">الواجبات</p>
                                <p className="text-2xl font-bold text-cyan-600">{data.stats.totalAssignments}</p>
                            </div>
                            <CalendarCheck className="w-8 h-8 text-cyan-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200 dark:border-indigo-800">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">نشط</p>
                                <p className="text-2xl font-bold text-indigo-600">{data.stats.activeUsers}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-indigo-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance and Assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5" />
                            الحضور اليوم
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
                                <p className="text-2xl font-bold text-green-600">{data.attendance.todayPresent}</p>
                                <p className="text-xs text-gray-600">حاضر</p>
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <XCircle className="w-6 h-6 mx-auto text-red-600 mb-1" />
                                <p className="text-2xl font-bold text-red-600">{data.attendance.todayAbsent}</p>
                                <p className="text-xs text-gray-600">غائب</p>
                            </div>
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <Clock className="w-6 h-6 mx-auto text-yellow-600 mb-1" />
                                <p className="text-2xl font-bold text-yellow-600">{data.attendance.todayLate}</p>
                                <p className="text-xs text-gray-600">متأخر</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>نسبة الحضور الأسبوعي</span>
                                <span className="font-bold">{data.attendance.weeklyRate}%</span>
                            </div>
                            <Progress value={data.attendance.weeklyRate} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                {/* Assignments Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            الواجبات
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">تسليمات بانتظار التصحيح</span>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    {data.assignments.pending}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">إجمالي التسليمات</span>
                                <Badge variant="secondary">{data.assignments.submitted}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">تم تصحيحها</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    {data.assignments.graded}
                                </Badge>
                            </div>

                            {data.assignments.overdueRate > 20 && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <span className="text-sm text-red-700">
                                        {data.assignments.overdueRate}% واجبات متأخرة غير مسلمة
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
