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
import { Search, Plus, Pencil, Trash2, Users, BookOpen, UserCheck, School } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { nexusBridge, SchoolClass, TeacherRecord } from '@/lib/nexusDataBridge';

export default function ClassesPage() {
    const { toast } = useToast();
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        gradeLevel: 1,
        section: 'أ',
        academicYear: '2026-2027',
        homeroomTeacherId: '',
        roomNumber: '',
        capacity: 25,
    });

    const loadData = () => {
        try {
            const allCls = nexusBridge.getClasses();
            const allTch = nexusBridge.getTeachers();
            const allStd = nexusBridge.getStudents();
            const allSub = nexusBridge.getSubjects();

            // Recalculate live enrolledCount
            const updated = allCls.map((c) => {
                const count = allStd.filter((s) => s.classId === c.id).length;
                const subCount = allSub.filter((s) => s.classIds?.includes(c.id)).length;
                return {
                    ...c,
                    enrolledCount: count > 0 ? count : c.enrolledCount,
                    subjectIds: c.subjectIds || [],
                };
            });

            setClasses(updated);
            setTeachers(allTch);
        } catch (e) {
            console.error('Failed to load classes:', e);
            toast({ title: 'خطأ', description: 'فشل تحميل الفصول الدراسية', variant: 'destructive' });
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
            const teacher = teachers.find((t) => t.id === formData.homeroomTeacherId || t.teacherId === formData.homeroomTeacherId);
            const teacherName = teacher?.name || 'غير محدد';

            if (editingClass) {
                const updated: SchoolClass = {
                    ...editingClass,
                    name: formData.name,
                    gradeLevel: Number(formData.gradeLevel),
                    section: formData.section,
                    academicYear: formData.academicYear,
                    homeroomTeacherId: formData.homeroomTeacherId,
                    homeroomTeacherName: teacherName,
                    roomNumber: formData.roomNumber,
                    capacity: Number(formData.capacity),
                };
                nexusBridge.saveClass(updated);
                toast({ title: 'تم بنجاح', description: 'تم تحديث بيانات الفصل المدرسي' });
            } else {
                const newId = `CLS-${formData.gradeLevel}0${classes.filter(c => c.gradeLevel === formData.gradeLevel).length + 1}`;
                const newClass: SchoolClass = {
                    id: newId,
                    name: formData.name,
                    gradeLevel: Number(formData.gradeLevel),
                    section: formData.section,
                    academicYear: formData.academicYear,
                    homeroomTeacherId: formData.homeroomTeacherId,
                    homeroomTeacherName: teacherName,
                    roomNumber: formData.roomNumber || `قاعة ${newId}`,
                    capacity: Number(formData.capacity) || 25,
                    enrolledCount: 0,
                    subjectIds: ['SUB-ARB-1', 'SUB-MTH-1'],
                    createdAt: new Date().toISOString(),
                };
                nexusBridge.saveClass(newClass);
                toast({ title: 'تم بنجاح 🎉', description: `تم تأسيس الفصل الدراسي: ${newClass.name} بالمعرف ${newClass.id}` });
            }

            loadData();
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            toast({ title: 'خطأ', description: err.message || 'فشل حفظ الفصل', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingClass(null);
        setFormData({
            name: '',
            gradeLevel: 1,
            section: 'أ',
            academicYear: '2026-2027',
            homeroomTeacherId: '',
            roomNumber: '',
            capacity: 25,
        });
    };

    const handleEdit = (cls: SchoolClass) => {
        setEditingClass(cls);
        setFormData({
            name: cls.name,
            gradeLevel: cls.gradeLevel,
            section: cls.section,
            academicYear: cls.academicYear,
            homeroomTeacherId: cls.homeroomTeacherId,
            roomNumber: cls.roomNumber || '',
            capacity: cls.capacity,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الفصل من النظام؟')) return;
        try {
            nexusBridge.deleteClass(id);
            setClasses((prev) => prev.filter((c) => c.id !== id));
            toast({ title: 'تم بنجاح', description: 'تم حذف الفصل الدراسي' });
        } catch {
            toast({ title: 'خطأ', description: 'فشل حذف الفصل', variant: 'destructive' });
        }
    };

    const filteredClasses = classes.filter((cls) => {
        const query = searchQuery.toLowerCase();
        return (
            cls.name.toLowerCase().includes(query) ||
            cls.id.toLowerCase().includes(query) ||
            (cls.homeroomTeacherName || '').toLowerCase().includes(query) ||
            (cls.academicYear || '').toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">الفصول الدراسية في المدرسة</h1>
                    <p className="text-muted-foreground">
                        إدارة الشعب الصفية، وتعيين رواد الفصول، ومتابعة الطاقة الاستيعابية والطلاب المسجلين
                    </p>
                </div>
                <Dialog open={isModalOpen} onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                            تأسيس فصل دراسي جديد
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingClass ? 'تعديل بيانات الفصل' : 'تأسيس فصل جديد بالمدرسة'}</DialogTitle>
                            <DialogDescription>
                                {editingClass ? 'تعديل بيانات الفصل ورائد الفصل والسنة الدراسية' : 'إضافة فصل دراسي وربطه برائد الفصل والجدول المدرسي'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">اسم الفصل</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="مثال: الصف الأول الابتدائي — فصل (ج)"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">المرحلة / الصف</label>
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">الشعبة</label>
                                    <Input
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        placeholder="مثال: أ أو ب"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">رائد الفصل (المعلم المسؤول)</label>
                                <Select
                                    value={formData.homeroomTeacherId}
                                    onValueChange={(val) => setFormData({ ...formData, homeroomTeacherId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر رائد الفصل من المعلمين" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name} ({t.specialization})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">رقم القاعة</label>
                                    <Input
                                        value={formData.roomNumber}
                                        onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                                        placeholder="مثال: قاعة 101"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">السعة القصوى (طالب)</label>
                                    <Input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                        placeholder="25"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">السنة الدراسية</label>
                                <Input
                                    value={formData.academicYear}
                                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                                    placeholder="2026-2027"
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    إلغاء
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفصل وتأكيده'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">إجمالي الفصول المعتمدة</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{classes.length}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">إجمالي الطلاب المسجلين بالفصول</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">
                        {classes.reduce((sum, c) => sum + (c.enrolledCount || 0), 0)}
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">الطاقة الاستيعابية الإجمالية</p>
                    <p className="text-2xl font-bold mt-1 text-purple-600">
                        {classes.reduce((sum, c) => sum + (c.capacity || 25), 0)}
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">نسبة إشغال الفصول</p>
                    <p className="text-2xl font-bold mt-1 text-amber-600">
                        {Math.round((classes.reduce((sum, c) => sum + (c.enrolledCount || 0), 0) / (classes.reduce((sum, c) => sum + (c.capacity || 25), 0) || 1)) * 100)}%
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="بحث عن فصل دراسي بالمعرف (ID) أو الاسم أو اسم رائد الفصل..."
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
                            <TableHead className="text-right">معرف الفصل (ID)</TableHead>
                            <TableHead className="text-right">اسم الفصل والشعبة</TableHead>
                            <TableHead className="text-right">رائد الفصل</TableHead>
                            <TableHead className="text-right">القاعة</TableHead>
                            <TableHead className="text-right">السنة الدراسية</TableHead>
                            <TableHead className="text-right">الطلاب / السعة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClasses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    لا يوجد فصول دراسية تطابق البحث
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClasses.map((cls) => (
                                <TableRow key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                        {cls.id}
                                    </TableCell>
                                    <TableCell className="font-semibold">{cls.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-800">
                                            <UserCheck className="w-3 h-3" />
                                            {cls.homeroomTeacherName || 'د. إسماعيل عيسى'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{cls.roomNumber || 'قاعة مخصصة'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{cls.academicYear}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="gap-1 font-mono">
                                                <Users className="w-3 h-3 text-emerald-600" />
                                                {cls.enrolledCount} / {cls.capacity}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(cls)}
                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                title="تعديل"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(cls.id)}
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
