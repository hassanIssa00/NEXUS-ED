'use client';

import { useEffect, useState } from 'react';
import { DrawerPanel } from '../sidebar/DrawerPanel';
import { Calendar, Check, X, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface AttendanceRecord {
    id: string;
    date: Date;
    status: 'present' | 'absent' | 'late' | 'excused';
    checkInTime?: string;
}

export function AttendanceDrawer() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState({ percentage: 0, present: 0, absent: 0, late: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        let active = true;
        apiClient.get('/attendance').then(({ data }) => {
            if (!active) return;
            const summary = data.summary ?? {};
            setAttendance((data.history ?? []).map((record: any, index: number) => ({
                id: `${record.date}-${index}`,
                date: new Date(record.date),
                status: String(record.status).toLowerCase() as AttendanceRecord['status'],
            })));
            setStats({
                percentage: Number(summary.attendanceRate ?? 0),
                present: Number(summary.present ?? 0),
                absent: Number(summary.absent ?? 0),
                late: Number(summary.late ?? 0),
                total: Number(summary.totalDays ?? 0),
            });
        }).catch(() => {
            if (active) setLoadFailed(true);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    const getStatusIcon = (status: AttendanceRecord['status']) => {
        switch (status) {
            case 'present':
                return <Check className="w-5 h-5 text-green-600" />;
            case 'absent':
                return <X className="w-5 h-5 text-red-600" />;
            case 'late':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case 'excused':
                return <Check className="w-5 h-5 text-blue-600" />;
        }
    };

    const getStatusLabel = (status: AttendanceRecord['status']) => {
        switch (status) {
            case 'present':
                return 'حاضر';
            case 'absent':
                return 'غائب';
            case 'late':
                return 'متأخر';
            case 'excused':
                return 'غياب بعذر';
        }
    };

    const getStatusColor = (status: AttendanceRecord['status']) => {
        switch (status) {
            case 'present':
                return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
            case 'absent':
                return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
            case 'late':
                return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
            case 'excused':
                return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
        }
    };

    return (
        <DrawerPanel drawerId="attendance" title="الحضور">
            <div className="space-y-4">
                {/* Stats Card */}
                <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-6 h-6" />
                            نسبة الحضور
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-bold">{loadFailed ? '—' : `${stats.percentage}%`}</div>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                            <div>
                                <div className="opacity-80">حاضر</div>
                                <div className="font-bold text-lg">{stats.present}</div>
                            </div>
                            <div>
                                <div className="opacity-80">غائب</div>
                                <div className="font-bold text-lg">{stats.absent}</div>
                            </div>
                            <div>
                                <div className="opacity-80">متأخر</div>
                                <div className="font-bold text-lg">{stats.late}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance Records */}
                {loading ? (
                    <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                ) : attendance.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>{loadFailed ? 'تعذر تحميل الحضور من النظام' : 'لا توجد سجلات حضور'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {attendance.map((record) => (
                            <div
                                key={record.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${getStatusColor(record.status)}`}>
                                        {getStatusIcon(record.status)}
                                    </div>
                                    <div>
                                        <div className="font-medium">
                                            {record.date.toLocaleDateString('ar-SA', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        {record.checkInTime && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                وقت الحضور: {record.checkInTime}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(record.status)}`}>
                                    {getStatusLabel(record.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DrawerPanel>
    );
}

export default AttendanceDrawer;
