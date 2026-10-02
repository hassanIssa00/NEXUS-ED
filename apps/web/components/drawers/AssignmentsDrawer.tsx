'use client';

import { useEffect, useState } from 'react';
import { DrawerPanel } from '../sidebar/DrawerPanel';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';

interface Assignment {
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    status: 'pending' | 'submitted' | 'graded' | 'late';
    grade?: number;
    maxGrade?: number;
}

export function AssignmentsDrawer() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        let active = true;
        apiClient.get('/assignments/student').then(({ data }) => {
            if (!active) return;
            setAssignments((Array.isArray(data) ? data : []).map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description || '',
                dueDate: new Date(item.dueDate),
                status: item.status,
                grade: item.grade ?? undefined,
                maxGrade: item.maxScore ?? undefined,
            })));
        }).catch(() => {
            if (active) setLoadFailed(true);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    const getStatusBadge = (status: Assignment['status']) => {
        const styles = {
            pending: { label: 'معلق', variant: 'secondary' as const, icon: Clock },
            submitted: { label: 'مُسلّم', variant: 'default' as const, icon: CheckCircle },
            graded: { label: 'مُصحّح', variant: 'default' as const, icon: CheckCircle },
            late: { label: 'متأخر', variant: 'destructive' as const, icon: AlertCircle }
        };

        const style = styles[status];
        const Icon = style.icon;

        return (
            <Badge variant={style.variant} className="gap-1">
                <Icon className="w-3 h-3" />
                {style.label}
            </Badge>
        );
    };

    const getDaysUntilDue = (dueDate: Date) => {
        const now = new Date();
        const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diff < 0) return 'متأخر';
        if (diff === 0) return 'اليوم';
        if (diff === 1) return 'غداً';
        return `${diff} أيام`;
    };

    return (
        <DrawerPanel drawerId="assignments" title="الواجبات">
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>{loadFailed ? 'تعذر تحميل الواجبات من النظام' : 'لا توجد واجبات مسجلة'}</p>
                    </div>
                ) : (
                    assignments.map((assignment) => (
                        <Card key={assignment.id}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-lg">{assignment.title}</h3>
                                    {getStatusBadge(assignment.status)}
                                </div>

                                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">
                                    {assignment.description}
                                </p>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>موعد التسليم: {assignment.dueDate.toLocaleDateString('ar-SA')}</span>
                                    </div>
                                    <span className={`font-medium ${getDaysUntilDue(assignment.dueDate) === 'متأخر'
                                            ? 'text-red-600'
                                            : 'text-blue-600'
                                        }`}>
                                        {getDaysUntilDue(assignment.dueDate)}
                                    </span>
                                </div>

                                {assignment.grade !== undefined && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">الدرجة:</span>
                                            <span className="text-lg font-bold text-green-600">
                                                {assignment.grade} / {assignment.maxGrade}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </DrawerPanel>
    );
}

export default AssignmentsDrawer;
