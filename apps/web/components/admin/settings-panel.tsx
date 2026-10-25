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
import { TimeSelect } from '@/components/ui/time-select';
import { useLocale } from 'next-intl';
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
    const isEnglish = useLocale() === 'en';
    const text = (ar: string, en: string) => isEnglish ? en : ar;
    const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
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
        setSaveError('');
        try {
            const { data } = await apiClient.put<SchoolSettings>('/admin/settings', settings);
            setSettings(data);
            setSavedSettings(data);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            setSaved(false);
            setSaveError(text('تعذر حفظ الإعدادات. حاول مرة أخرى.', 'Could not save settings. Please try again.'));
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

    if (fetching) return <div className="p-8 text-center text-muted-foreground">{text('جاري تحميل إعدادات المدرسة...', 'Loading school settings…')}</div>;
    if (loadFailed) return <div role="alert" className="p-8 text-center text-destructive">{text('تعذر تحميل إعدادات المدرسة من قاعدة البيانات.', 'Could not load school settings from the database.')}</div>;

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
                        {text('إعدادات المدرسة', 'School settings')}
                    </h1>
                    <p className="text-gray-600">{text('تحكم في جميع إعدادات النظام', 'Manage all system settings')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 ml-2" />
                        {text('استعادة آخر نسخة محفوظة', 'Restore last saved version')}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {saved ? (
                            <>
                                <CheckCircle className="w-4 h-4 ml-2" />
                                {text('تم الحفظ', 'Saved')}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 ml-2" />
                                {text('حفظ التغييرات', 'Save changes')}
                            </>
                        )}
                    </Button>
                </div>
            </motion.div>

            {saveError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{saveError}</p>}

            {/* Settings Tabs */}
            <Tabs defaultValue="grading" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="grading" className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="hidden sm:inline">{text('نظام الدرجات', 'Grading')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="periods" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="hidden sm:inline">{text('الحصص', 'Periods')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex items-center gap-2">
                        <UserX className="w-4 h-4" />
                        <span className="hidden sm:inline">{text('سياسة الغياب', 'Attendance policy')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">{text('التقارير', 'Reports')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Grading System */}
                <TabsContent value="grading">
                    <Card>
                        <CardHeader>
                            <CardTitle>{text('نظام الدرجات', 'Grading system')}</CardTitle>
                            <CardDescription>{text('حدد الدرجة القصوى ودرجة النجاح', 'Set the maximum and passing scores')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{text('الدرجة القصوى', 'Maximum score')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.gradingSystem.maxScore}
                                        onChange={(e) => updateGrading('maxScore', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('درجة النجاح', 'Passing score')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.gradingSystem.passingScore}
                                        onChange={(e) => updateGrading('passingScore', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Grade Scale Preview */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h4 className="font-medium mb-3">{text('سلم الدرجات', 'Grade scale')}</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className="bg-green-100 text-green-800">{text('90-100: ممتاز (A)', '90–100: Excellent (A)')}</Badge>
                                    <Badge className="bg-blue-100 text-blue-800">{text('80-89: جيد جداً (B)', '80–89: Very good (B)')}</Badge>
                                    <Badge className="bg-yellow-100 text-yellow-800">{text('70-79: جيد (C)', '70–79: Good (C)')}</Badge>
                                    <Badge className="bg-orange-100 text-orange-800">{text('60-69: مقبول (D)', '60–69: Pass (D)')}</Badge>
                                    <Badge className="bg-red-100 text-red-800">{text('0-59: راسب (F)', '0–59: Fail (F)')}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Periods Config */}
                <TabsContent value="periods">
                    <Card>
                        <CardHeader>
                            <CardTitle>{text('إعدادات الحصص', 'Period settings')}</CardTitle>
                            <CardDescription>{text('حدد عدد الحصص ومدتها', 'Set the number and length of periods')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{text('عدد الحصص يومياً', 'Periods per day')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.periodsConfig.periodsPerDay}
                                        onChange={(e) => updatePeriods('periodsPerDay', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('مدة الحصة (بالدقائق)', 'Period length (minutes)')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.periodsConfig.periodDuration}
                                        onChange={(e) => updatePeriods('periodDuration', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('مدة الاستراحة (بالدقائق)', 'Break length (minutes)')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.periodsConfig.breakDuration}
                                        onChange={(e) => updatePeriods('breakDuration', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('وقت بداية الدوام', 'School start time')}</Label>
                                    <TimeSelect
                                        value={settings.periodsConfig.startTime}
                                        onChange={(value) => updatePeriods('startTime', value)}
                                        placeholder={text('اختر وقت بداية الدوام', 'Choose a school start time')}
                                        className="h-10 rounded-md shadow-none"
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
                            <CardTitle>{text('سياسة الغياب', 'Attendance policy')}</CardTitle>
                            <CardDescription>{text('حدد قواعد الحضور والغياب', 'Set attendance and absence rules')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{text('الحد الأقصى لأيام الغياب', 'Maximum absence days')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.attendancePolicy.maxAbsenceDays}
                                        onChange={(e) => updateAttendance('maxAbsenceDays', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('حد التأخير (بالدقائق)', 'Late threshold (minutes)')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.attendancePolicy.lateThreshold}
                                        onChange={(e) => updateAttendance('lateThreshold', Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('نسبة التحذير (%)', 'Warning threshold (%)')}</Label>
                                    <Input
                                        type="number"
                                        value={settings.attendancePolicy.warningThreshold}
                                        onChange={(e) => updateAttendance('warningThreshold', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>{text('إشعار ولي الأمر', 'Notify parent')}</Label>
                                    <p className="text-sm text-gray-500">{text('إرسال إشعار عند غياب الطالب', 'Send a notification when a student is absent')}</p>
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
                            <CardTitle>{text('إعدادات التقارير', 'Report settings')}</CardTitle>
                            <CardDescription>{text('تخصيص شكل التقارير المطبوعة', 'Customize printed report formatting')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{text('اسم المدرسة', 'School name')}</Label>
                                    <Input
                                        value={settings.reportSettings.schoolName}
                                        onChange={(e) => updateReports('schoolName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('نص الترويسة', 'Header text')}</Label>
                                    <Input
                                        value={settings.reportSettings.headerText}
                                        onChange={(e) => updateReports('headerText', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{text('نص التذييل', 'Footer text')}</Label>
                                    <Input
                                        value={settings.reportSettings.footerText}
                                        onChange={(e) => updateReports('footerText', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium">{text('خيارات العرض', 'Display options')}</h4>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>{text('عرض الترتيب', 'Show ranking')}</Label>
                                    <Switch
                                        checked={settings.reportSettings.showRank}
                                        onCheckedChange={(checked) => updateReports('showRank', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>{text('عرض الحضور', 'Show attendance')}</Label>
                                    <Switch
                                        checked={settings.reportSettings.showAttendance}
                                        onCheckedChange={(checked) => updateReports('showAttendance', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>{text('عرض السلوك', 'Show behavior')}</Label>
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
