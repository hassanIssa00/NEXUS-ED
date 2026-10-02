'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import {
    Settings,
    GraduationCap,
    Clock,
    UserX,
    FileText,
    Save,
    RotateCcw,
    CheckCircle
} from 'lucide-react';

interface SchoolSettings {
    gradingSystem: {
        maxScore: number;
        passingScore: number;
    };
    periodsConfig: {
        periodsPerDay: number;
        periodDuration: number;
        breakDuration: number;
        startTime: string;
    };
    attendancePolicy: {
        maxAbsenceDays: number;
        lateThreshold: number;
        parentNotification: boolean;
        warningThreshold: number;
    };
    reportSettings: {
        schoolName: string;
        headerText: string;
        footerText: string;
        showRank: boolean;
        showAttendance: boolean;
        showBehavior: boolean;
    };
}

const defaultSettings: SchoolSettings = {
    gradingSystem: { maxScore: 100, passingScore: 50 },
    periodsConfig: { periodsPerDay: 7, periodDuration: 45, breakDuration: 10, startTime: '07:30' },
    attendancePolicy: { maxAbsenceDays: 15, lateThreshold: 15, parentNotification: true, warningThreshold: 20 },
    reportSettings: { schoolName: '', headerText: 'بسم الله الرحمن الرحيم', footerText: 'نتمنى لكم التوفيق', showRank: true, showAttendance: true, showBehavior: true },
};

export function AdminSettingsPanel() {
    const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [savedSettings, setSavedSettings] = useState<SchoolSettings>(defaultSettings);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await apiClient.get<SchoolSettings>('/admin/settings');
            setSettings(data);
            setSavedSettings(data);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.put<SchoolSettings>('/admin/settings', settings);
            setSettings(data);
            setSavedSettings(data);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            console.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSettings(savedSettings);
    };

    const updateGrading = (key: keyof SchoolSettings['gradingSystem'], value: number) => {
        setSettings(prev => ({
            ...prev,
            gradingSystem: { ...prev.gradingSystem, [key]: value },
        }));
    };

    const updatePeriods = (key: keyof SchoolSettings['periodsConfig'], value: number | string) => {
        setSettings(prev => ({
            ...prev,
            periodsConfig: { ...prev.periodsConfig, [key]: value },
        }));
    };

    const updateAttendance = (key: keyof SchoolSettings['attendancePolicy'], value: number | boolean) => {
        setSettings(prev => ({
            ...prev,
            attendancePolicy: { ...prev.attendancePolicy, [key]: value },
        }));
    };

    const updateReports = (key: keyof SchoolSettings['reportSettings'], value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            reportSettings: { ...prev.reportSettings, [key]: value },
        }));
    };

    if (fetching) return <div className="p-8 text-center text-muted-foreground">جاري تحميل إعدادات المدرسة...</div>;
    if (loadFailed) return <div role="alert" className="p-8 text-center text-destructive">تعذر تحميل إعدادات المدرسة من قاعدة البيانات.</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        إعدادات المدرسة
                    </h1>
                    <p className="text-gray-600">تحكم في جميع إعدادات النظام</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 ml-2" />
                        استعادة الافتراضي
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {saved ? (
                            <>
                                <CheckCircle className="w-4 h-4 ml-2" />
                                تم الحفظ
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 ml-2" />
                                حفظ التغييرات
                            </>
                        )}
                    </Button>
                </div>
            </motion.div>

            {/* Settings Tabs */}
            <Tabs defaultValue="grading" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="grading" className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="hidden sm:inline">نظام الدرجات</span>
                    </TabsTrigger>
                    <TabsTrigger value="periods" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="hidden sm:inline">الحصص</span>
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex items-center gap-2">
                        <UserX className="w-4 h-4" />
                        <span className="hidden sm:inline">سياسة الغياب</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">التقارير</span>
                    </TabsTrigger>
                </TabsList>

                {/* Grading System */}
                <TabsContent value="grading">
                    <Card>
                        <CardHeader>
                            <CardTitle>نظام الدرجات</CardTitle>
                            <CardDescription>حدد الدرجة القصوى ودرجة النجاح</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>الدرجة القصوى</Label>
                                    <Input
                                        type="number"
                                        value={settings.gradingSystem.maxScore}
                                        onChange={(e) => updateGrading('maxScore', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>درجة النجاح</Label>
                                    <Input
                                        type="number"
                                        value={settings.gradingSystem.passingScore}
                                        onChange={(e) => updateGrading('passingScore', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Grade Scale Preview */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h4 className="font-medium mb-3">سلم الدرجات</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className="bg-green-100 text-green-800">90-100: ممتاز (A)</Badge>
                                    <Badge className="bg-blue-100 text-blue-800">80-89: جيد جداً (B)</Badge>
                                    <Badge className="bg-yellow-100 text-yellow-800">70-79: جيد (C)</Badge>
                                    <Badge className="bg-orange-100 text-orange-800">60-69: مقبول (D)</Badge>
                                    <Badge className="bg-red-100 text-red-800">0-59: راسب (F)</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Periods Config */}
                <TabsContent value="periods">
                    <Card>
                        <CardHeader>
                            <CardTitle>إعدادات الحصص</CardTitle>
                            <CardDescription>حدد عدد الحصص ومدتها</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>عدد الحصص يومياً</Label>
                                    <Input
                                        type="number"
                                        value={settings.periodsConfig.periodsPerDay}
                                        onChange={(e) => updatePeriods('periodsPerDay', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>مدة الحصة (بالدقائق)</Label>
                                    <Input
                                        type="number"
                                        value={settings.periodsConfig.periodDuration}
                                        onChange={(e) => updatePeriods('periodDuration', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>مدة الاستراحة (بالدقائق)</Label>
                                    <Input
                                        type="number"
                                        value={settings.periodsConfig.breakDuration}
                                        onChange={(e) => updatePeriods('breakDuration', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>وقت بداية الدوام</Label>
                                    <Input
                                        type="time"
                                        value={settings.periodsConfig.startTime}
                                        onChange={(e) => updatePeriods('startTime', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Attendance Policy */}
                <TabsContent value="attendance">
                    <Card>
                        <CardHeader>
                            <CardTitle>سياسة الغياب</CardTitle>
                            <CardDescription>حدد قواعد الحضور والغياب</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>الحد الأقصى لأيام الغياب</Label>
                                    <Input
                                        type="number"
                                        value={settings.attendancePolicy.maxAbsenceDays}
                                        onChange={(e) => updateAttendance('maxAbsenceDays', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>حد التأخير (بالدقائق)</Label>
                                    <Input
                                        type="number"
                                        value={settings.attendancePolicy.lateThreshold}
                                        onChange={(e) => updateAttendance('lateThreshold', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>نسبة التحذير (%)</Label>
                                    <Input
                                        type="number"
                                        value={settings.attendancePolicy.warningThreshold}
                                        onChange={(e) => updateAttendance('warningThreshold', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>إشعار ولي الأمر</Label>
                                    <p className="text-sm text-gray-500">إرسال إشعار عند غياب الطالب</p>
                                </div>
                                <Switch
                                    checked={settings.attendancePolicy.parentNotification}
                                    onCheckedChange={(checked) => updateAttendance('parentNotification', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Report Settings */}
                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>إعدادات التقارير</CardTitle>
                            <CardDescription>تخصيص شكل التقارير المطبوعة</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اسم المدرسة</Label>
                                    <Input
                                        value={settings.reportSettings.schoolName}
                                        onChange={(e) => updateReports('schoolName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>نص الترويسة</Label>
                                    <Input
                                        value={settings.reportSettings.headerText}
                                        onChange={(e) => updateReports('headerText', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>نص التذييل</Label>
                                    <Input
                                        value={settings.reportSettings.footerText}
                                        onChange={(e) => updateReports('footerText', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium">خيارات العرض</h4>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>عرض الترتيب</Label>
                                    <Switch
                                        checked={settings.reportSettings.showRank}
                                        onCheckedChange={(checked) => updateReports('showRank', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>عرض الحضور</Label>
                                    <Switch
                                        checked={settings.reportSettings.showAttendance}
                                        onCheckedChange={(checked) => updateReports('showAttendance', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>عرض السلوك</Label>
                                    <Switch
                                        checked={settings.reportSettings.showBehavior}
                                        onCheckedChange={(checked) => updateReports('showBehavior', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
