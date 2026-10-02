'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, AlertOctagon, User, TrendingDown, Clock, BookX, UserMinus } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface EarlyWarningAlert {
    type: 'GRADE_DROP' | 'LOW_ATTENDANCE' | 'MISSING_ASSIGNMENTS' | 'BEHAVIOR';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    value: number;
    threshold: number;
}

interface EarlyWarning {
    studentId: string;
    studentName: string;
    alerts: EarlyWarningAlert[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface EarlyWarningDashboardProps {
    classId?: string;
    data?: EarlyWarning[];
}

export function EarlyWarningDashboard({ classId, data: propData }: EarlyWarningDashboardProps) {
    const [data, setData] = useState<EarlyWarning[]>(propData || []);
    const [loading, setLoading] = useState(!propData);
    const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

    useEffect(() => {
        if (!propData) {
            fetchData();
        }
    }, [classId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (!classId) {
                setData([]);
                return;
            }
            const { data } = await apiClient.get('/analytics/student/early-warnings', { params: { classId } });
            setData(Array.isArray(data) ? data : []);
        } catch {
            console.error('Failed to fetch early warnings');
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'bg-red-500 text-white border-red-600';
            case 'HIGH': return 'bg-orange-500 text-white border-orange-600';
            case 'MEDIUM': return 'bg-yellow-500 text-black border-yellow-600';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'CRITICAL': return <AlertOctagon className="w-5 h-5" />;
            case 'HIGH': return <AlertTriangle className="w-5 h-5" />;
            default: return <AlertCircle className="w-5 h-5" />;
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'GRADE_DROP': return <TrendingDown className="w-4 h-4" />;
            case 'LOW_ATTENDANCE': return <Clock className="w-4 h-4" />;
            case 'MISSING_ASSIGNMENTS': return <BookX className="w-4 h-4" />;
            case 'BEHAVIOR': return <UserMinus className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const filteredData = filter === 'ALL' 
        ? data 
        : data.filter((w) => w.riskLevel === filter);

    const stats = {
        critical: data.filter((w) => w.riskLevel === 'CRITICAL').length,
        high: data.filter((w) => w.riskLevel === 'HIGH').length,
        medium: data.filter((w) => w.riskLevel === 'MEDIUM').length,
        total: data.length,
    };

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            نظام الإنذار المبكر
                        </CardTitle>
                        <CardDescription>متابعة الطلاب المتعثرين</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge 
                            variant={filter === 'ALL' ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setFilter('ALL')}
                        >
                            الكل ({stats.total})
                        </Badge>
                        <Badge 
                            variant={filter === 'CRITICAL' ? 'destructive' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setFilter('CRITICAL')}
                        >
                            حرج ({stats.critical})
                        </Badge>
                        <Badge 
                            variant={filter === 'HIGH' ? 'default' : 'outline'}
                            className={`cursor-pointer ${filter === 'HIGH' ? 'bg-orange-500' : ''}`}
                            onClick={() => setFilter('HIGH')}
                        >
                            عالي ({stats.high})
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredData.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <p className="text-lg font-medium text-green-600">لا توجد تنبيهات!</p>
                        <p className="text-sm">جميع الطلاب بأداء جيد</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredData.map((warning) => (
                            <div 
                                key={warning.studentId}
                                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                                    warning.riskLevel === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' :
                                    warning.riskLevel === 'HIGH' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' :
                                    warning.riskLevel === 'MEDIUM' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' :
                                    'bg-blue-50 dark:bg-blue-900/20 border-blue-200'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{warning.studentName}</h4>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {warning.alerts.map((alert, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                                            alert.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                            alert.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}
                                                    >
                                                        {getAlertIcon(alert.type)}
                                                        <span>{alert.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={getRiskColor(warning.riskLevel)}>
                                        {getRiskIcon(warning.riskLevel)}
                                        <span className="mr-1">
                                            {warning.riskLevel === 'CRITICAL' ? 'حرج' :
                                             warning.riskLevel === 'HIGH' ? 'عالي' :
                                             warning.riskLevel === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                                        </span>
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
