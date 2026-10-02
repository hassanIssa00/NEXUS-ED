'use client';

import { useEffect, useState } from 'react';
import { DrawerPanel } from '../sidebar/DrawerPanel';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface Grade {
    id: string;
    subject: string;
    score: number;
    maxScore: number;
    percentage: number;
    examType: string;
    date: Date;
}

export function GradesDrawer() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [gpa, setGpa] = useState<number | null>(null);

    useEffect(() => {
        let active = true;
        apiClient.get('/grades').then(({ data }) => {
            if (!active) return;
            const rows = (data.grades ?? []).map((grade: any): Grade => ({
                id: grade.id,
                subject: grade.subjectName,
                score: Number(grade.grade),
                maxScore: Number(grade.maxGrade),
                percentage: Number(grade.percentage),
                examType: grade.semester || 'تقييم مسجل',
                date: new Date(grade.date),
            }));
            setGrades(rows);
            setGpa(rows.length ? Math.round(rows.reduce((sum, grade) => sum + grade.percentage, 0) / rows.length * 10) / 10 : null);
        }).catch(() => {
            if (!active) return;
            setGrades([]);
            setGpa(null);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return 'text-green-600';
        if (percentage >= 80) return 'text-blue-600';
        if (percentage >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getGradeLetter = (percentage: number) => {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    return (
        <DrawerPanel drawerId="grades" title="الدرجات">
            <div className="space-y-4">
                {/* GPA Card */}
                <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-6 h-6" />
                            المعدل التراكمي
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-bold">{gpa === null ? '—' : `${gpa}%`}</div>
                        <div className="flex items-center gap-2 mt-2 text-white/80">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">{gpa === null ? 'لا توجد درجات مسجلة' : 'متوسط الدرجات المسجلة'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Grades List */}
                {loading ? (
                    <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                ) : grades.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>لا توجد درجات حالياً</p>
                    </div>
                ) : (
                    grades.map((grade) => (
                        <Card key={grade.id}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg">{grade.subject}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {grade.examType}
                                        </p>
                                    </div>
                                    <div className={`text-3xl font-bold ${getGradeColor(grade.percentage)}`}>
                                        {getGradeLetter(grade.percentage)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="text-sm text-gray-500">الدرجة</div>
                                            <div className="font-bold">
                                                {grade.score} / {grade.maxScore}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">النسبة</div>
                                            <div className={`font-bold ${getGradeColor(grade.percentage)}`}>
                                                {grade.percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {grade.date.toLocaleDateString('ar-SA')}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-3 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                                        style={{ width: `${grade.percentage}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </DrawerPanel>
    );
}

export default GradesDrawer;
