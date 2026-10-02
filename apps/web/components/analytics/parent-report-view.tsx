'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    FileText, Download, Printer, TrendingUp, TrendingDown, Minus, 
    User, Calendar, Award, Clock, BookOpen, Lightbulb, CheckCircle 
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface ParentReport {
    studentInfo: {
        name: string;
        class: string;
        period: string;
    };
    summary: {
        overallGrade: number | null;
        attendanceRate: number | null;
        assignmentsCompleted: number;
        totalAssignments: number;
        behaviorScore: number;
        rank: number | null;
        totalStudents: number;
    };
    subjects: {
        name: string;
        grade: number;
        trend: 'UP' | 'DOWN' | 'STABLE' | 'NO_BASELINE';
    }[];
    attendance: {
        present: number;
        absent: number;
        late: number;
        excused: number;
    };
    recentGrades: {
        subject: string;
        assignment: string;
        score: number;
        maxScore: number;
        date: Date;
    }[];
    recommendations: string[];
}

interface ParentReportViewProps {
    studentId: string;
    period?: 'week' | 'month';
    data?: ParentReport;
}

export function ParentReportView({ studentId, period = 'month', data: propData }: ParentReportViewProps) {
    const [data, setData] = useState<ParentReport | null>(propData || null);
    const [loading, setLoading] = useState(!propData);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!propData) {
            fetchData();
        }
    }, [studentId, period]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get(`/analytics/student/${studentId}/parent-report`, { params: { period } });
            setData(data);
        } catch {
            console.error('Failed to fetch parent report');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        handlePrint();
    };

    const TrendIcon = ({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' | 'NO_BASELINE' }) => {
        if (trend === 'UP') return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (trend === 'DOWN') return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getGradeColor = (grade: number) => {
        if (grade >= 90) return 'text-green-600 bg-green-100';
        if (grade >= 75) return 'text-blue-600 bg-blue-100';
        if (grade >= 60) return 'text-yellow-600 bg-yellow-100';
        if (grade >= 50) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
    };

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                    لا توجد بيانات للتقرير
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" ref={reportRef}>
            {/* Header with Actions */}
            <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8" />
                            <div>
                                <CardTitle className="text-xl">تقرير ولي الأمر</CardTitle>
                                <CardDescription className="text-blue-100">
                                    {data.studentInfo.period} - {new Date().toLocaleDateString('ar-EG')}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <Button variant="secondary" size="sm" onClick={handlePrint}>
                                <Printer className="w-4 h-4 ml-2" />
                                طباعة
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleDownload}>
                                <Download className="w-4 h-4 ml-2" />
                                تحميل PDF
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{data.studentInfo.name}</h2>
                            <p className="text-gray-600 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                الفصل: {data.studentInfo.class}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                    <CardContent className="pt-4">
                        <div className="text-center">
                            <Award className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                            <p className="text-3xl font-bold text-blue-600">{data.summary.overallGrade === null ? '—' : `${data.summary.overallGrade}%`}</p>
                            <p className="text-sm text-gray-600">المعدل العام</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
                    <CardContent className="pt-4">
                        <div className="text-center">
                            <Clock className="w-8 h-8 mx-auto text-green-500 mb-2" />
                            <p className="text-3xl font-bold text-green-600">{data.summary.attendanceRate === null ? '—' : `${data.summary.attendanceRate}%`}</p>
                            <p className="text-sm text-gray-600">نسبة الحضور</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                    <CardContent className="pt-4">
                        <div className="text-center">
                            <BookOpen className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                            <p className="text-3xl font-bold text-purple-600">
                                {data.summary.assignmentsCompleted}/{data.summary.totalAssignments}
                            </p>
                            <p className="text-sm text-gray-600">الواجبات</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                    <CardContent className="pt-4">
                        <div className="text-center">
                            <TrendingUp className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                            <p className="text-3xl font-bold text-orange-600">
                                {data.summary.rank === null ? '—' : `${data.summary.rank}/${data.summary.totalStudents}`}
                            </p>
                            <p className="text-sm text-gray-600">الترتيب</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Subjects Performance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        أداء المواد
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.subjects.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد درجات مسجلة لهذه الفترة</p>
                        ) : data.subjects.map((subject, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <div className="w-32 font-medium">{subject.name}</div>
                                <div className="flex-1">
                                    <Progress value={subject.grade} className="h-3" />
                                </div>
                                <Badge className={getGradeColor(subject.grade)}>
                                    {subject.grade}%
                                </Badge>
                                <TrendIcon trend={subject.trend} />
                                {subject.trend === 'NO_BASELINE' && <span className="text-xs text-muted-foreground">لا توجد مقارنة سابقة</span>}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Attendance Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        سجل الحضور
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{data.attendance.present}</p>
                            <p className="text-sm text-gray-600">حاضر</p>
                        </div>
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{data.attendance.absent}</p>
                            <p className="text-sm text-gray-600">غائب</p>
                        </div>
                        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">{data.attendance.late}</p>
                            <p className="text-sm text-gray-600">متأخر</p>
                        </div>
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{data.attendance.excused}</p>
                            <p className="text-sm text-gray-600">معذور</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Lightbulb className="w-5 h-5" />
                        التوصيات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {data.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
