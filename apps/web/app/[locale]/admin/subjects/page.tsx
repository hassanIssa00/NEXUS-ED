'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, BookOpen, UserCheck, Clock, Layers } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { nexusBridge, SchoolSubject, SchoolClass, TeacherRecord } from '@/lib/nexusDataBridge';

export default function SubjectsPage() {
    const { toast } = useToast();
    const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        gradeLevel: 1,
        weeklyPeriods: 4,
        defaultTeacherId: '',
        classId: 'CLS-101',
        color: '#10B981',
    });

    const loadData = () => {
        try {
            const allSub = nexusBridge.getSubjects();
            const allCls = nexusBridge.getClasses();
            const allTch = nexusBridge.getTeachers();

            setSubjects(allSub);
            setClasses(allCls);
            setTeachers(allTch);
        } catch (e) {
            console.error('Failed to load subjects:', e);
            toast({ title: 'خطأ', description: 'فشل تحميل المواد الدراسية', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const handleSync = () => loadData();
        window.addEventListener('nexus:data-changed', handleSync);
        return () => window.removeEventListener('nexus:data-changed', handleSync);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const teacher = teachers.find(
                (t) => t.id === formData.defaultTeacherId || t.teacherId === formData.defaultTeacherId
            );
            const teacherName = teacher?.name || 'د. إسماعيل عيسى';

            if (editingSubject) {
                const updated: SchoolSubject = {
                    ...editingSubject,
                    name: formData.name,
                    code: formData.code,
                    gradeLevel: Number(formData.gradeLevel),
                    weeklyPeriods: Number(formData.weeklyPeriods),
                    defaultTeacherId: formData.defaultTeacherId,
                    defaultTeacherName: teacherName,
                    classIds: [formData.classId],
                    color: formData.color,
                };
                nexusBridge.saveSubject(updated);
                toast({ title: 'تم بنجاح', description: 'تم تحديث بيانات المادة الدراسية' });
            } else {
                const newId = `SUB-${formData.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'MOD'}-${Date.now().toString().slice(-3)}`;
                const newSubject: SchoolSubject = {
                    id: newId,
                    name: formData.name,
                    code: formData.code,
                    gradeLevel: Number(formData.gradeLevel),
                    weeklyPeriods: Number(formData.weeklyPeriods),
                    defaultTeacherId: formData.defaultTeacherId,
                    defaultTeacherName: teacherName,
                    classIds: [formData.classId],
                    color: formData.color,
                };
                nexusBridge.saveSubject(newSubject);
                toast({ title: 'تم بنجاح 🎉', description: `تمت إضافة مادة: ${newSubject.name} (${newSubject.code})` });
            }

            loadData();
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            toast({ title: 'خطأ', description: err.message || 'فشل حفظ المادة الدراسية', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingSubject(null);
        setFormData({
            name: '',
            code: '',
            gradeLevel: 1,
            weeklyPeriods: 4,
            defaultTeacherId: '',
            classId: classes[0]?.id || 'CLS-101',
            color: '#10B981',
        });
    };

    const handleEdit = (sub: SchoolSubject) => {
        setEditingSubject(sub);
        setFormData({
            name: sub.name,
            code: sub.code,
            gradeLevel: sub.gradeLevel,
            weeklyPeriods: sub.weeklyPeriods,
            defaultTeacherId: sub.defaultTeacherId || '',
            classId: sub.classIds?.[0] || 'CLS-101',
            color: sub.color || '#10B981',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المادة الدراسية من النظام؟')) return;
        try {
            nexusBridge.deleteSubject(id);
            setSubjects((prev) => prev.filter((s) => s.id !== id));
            toast({ title: 'تم بنجاح', description: 'تم حذف المادة الدراسية' });
        } catch {
            toast({ title: 'خطأ', description: 'فشل حذف المادة', variant: 'destructive' });
        }
    };

    const filteredSubjects = subjects.filter((sub) => {
        const query = searchQuery.toLowerCase();
        return (
            sub.name.toLowerCase().includes(query) ||
            sub.code.toLowerCase().includes(query) ||
            (sub.defaultTeacherName || '').toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">المناهج والمواد الدراسية</h1>
                    <p className="text-muted-foreground">
                        إدارة الخطط الدراسية، والأنصبة الأسبوعية، وربط المواد بالمعلمين المعتمدين والفصول
                    </p>
                </div>
                <Dialog open={isModalOpen} onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                            إضافة مادة دراسية جديدة
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingSubject ? 'تعديل بيانات المادة' : 'إضافة مادة دراسية للمدرسة'}</DialogTitle>
                            <DialogDescription>
                                {editingSubject ? 'تعديل بيانات المادة والمعلم والنصاب الأسبوعي' : 'تسجيل مادة دراسية وربطها بالخطة الدراسية والمعلمين'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">اسم المادة الدراسية</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="مثال: لغتي الجميلة / القرآن الكريم"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">رمز المادة (Code)</label>
                                    <Input
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="مثال: ARB-101"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">الصف الدراسي</label>
                                    <Select
                                        value={formData.gradeLevel.toString()}
                                        onValueChange={(val) => setFormData({ ...formData, gradeLevel: Number(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="الصف" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">الصف الأول</SelectItem>
                                            <SelectItem value="2">الصف الثاني</SelectItem>
                                            <SelectItem value="3">الصف الثالث</SelectItem>
                                            <SelectItem value="4">الصف الرابع</SelectItem>
                                            <SelectItem value="5">الصف الخامس</SelectItem>
                                            <SelectItem value="6">الصف السادس</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">المعلم المعتمد للمادة</label>
                                <Select
                                    value={formData.defaultTeacherId}
                                    onValueChange={(val) => setFormData({ ...formData, defaultTeacherId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر المعلم من الهيئة التعليمية" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name} — {t.specialization} ({t.universalId || t.teacherId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">الحصص الأسبوعية</label>
                                    <Input
                                        type="number"
                                        value={formData.weeklyPeriods}
                                        onChange={(e) => setFormData({ ...formData, weeklyPeriods: Number(e.target.value) })}
                                        placeholder="5"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">الفصل المستهدف</label>
                                    <Select
                                        value={formData.classId}
                                        onValueChange={(val) => setFormData({ ...formData, classId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الفصل" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    إلغاء
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ المادة واعتمادها'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Overview Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">إجمالي المواد الدراسية</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{subjects.length}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">إجمالي الحصص الأسبوعية</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">
                        {subjects.reduce((sum, s) => sum + (s.weeklyPeriods || 0), 0)} حصة
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">المعلمون المكلفون</p>
                    <p className="text-2xl font-bold mt-1 text-purple-600">{teachers.length} معلم</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">الفصول المغطاة</p>
                    <p className="text-2xl font-bold mt-1 text-amber-600">{classes.length} فصول</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="بحث عن مادة دراسية بالاسم، الرمز (Code)، أو اسم المعلم..."
                        className="pr-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">رمز المادة (Code)</TableHead>
                            <TableHead className="text-right">اسم المادة</TableHead>
                            <TableHead className="text-right">المعلم المعتمد</TableHead>
                            <TableHead className="text-right">الصف</TableHead>
                            <TableHead className="text-right">الحصص الأسبوعية</TableHead>
                            <TableHead className="text-right">الفصول المستفيدة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubjects.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    لا يوجد مواد دراسية تطابق البحث
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubjects.map((sub) => (
                                <TableRow key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                        {sub.code}
                                    </TableCell>
                                    <TableCell className="font-semibold flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: sub.color || '#10B981' }}
                                        />
                                        {sub.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-800">
                                            <UserCheck className="w-3 h-3" />
                                            {sub.defaultTeacherName || 'د. إسماعيل عيسى'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">الصف {sub.gradeLevel}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                            {sub.weeklyPeriods} حصص
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {sub.classIds && sub.classIds.length > 0 ? (
                                                sub.classIds.map((cid) => (
                                                    <Badge key={cid} variant="outline" className="text-xs font-mono">
                                                        {cid}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">جميع الفصول</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(sub)}
                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                title="تعديل"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(sub.id)}
                                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
