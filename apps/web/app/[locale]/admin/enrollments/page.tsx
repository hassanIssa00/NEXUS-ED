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
import { Search, Plus, Trash2, UserPlus, Users, ArrowRightLeft, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { nexusBridge, SchoolClass, ClassStudentRecord, EnrollmentRecord } from '@/lib/nexusDataBridge';

export default function EnrollmentsPage() {
    const { toast } = useToast();
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [allStudents, setAllStudents] = useState<ClassStudentRecord[]>([]);
    const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('CLS-101');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = () => {
        try {
            const clsList = nexusBridge.getClasses();
            const stdList = nexusBridge.getStudents();
            const enrList = nexusBridge.getEnrollments();

            setClasses(clsList);
            setAllStudents(stdList);
            setEnrollments(enrList);

            if (!selectedClassId && clsList.length > 0) {
                setSelectedClassId(clsList[0].id);
            }
        } catch (e) {
            console.error('Failed to load enrollments:', e);
            toast({ title: 'خطأ', description: 'فشل تحميل بيانات القيد والتسجيل', variant: 'destructive' });
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

    const selectedClass = classes.find((c) => c.id === selectedClassId);

    // Enrolled students in this class
    const classStudents = allStudents.filter((s) => s.classId === selectedClassId);

    // Students available to enroll (not currently in this class)
    const availableStudents = allStudents.filter((s) => s.classId !== selectedClassId);

    const handleBulkEnroll = async () => {
        if (selectedStudentIds.length === 0 || !selectedClass) return;

        try {
            for (const stdId of selectedStudentIds) {
                const std = allStudents.find((s) => s.id === stdId);
                if (std) {
                    nexusBridge.enrollStudent({
                        studentId: std.id,
                        studentName: std.fullName,
                        classId: selectedClass.id,
                        className: selectedClass.name,
                        academicYear: selectedClass.academicYear || '2026-2027',
                        status: 'active',
                    });
                }
            }

            toast({
                title: 'تم القيد بنجاح 🎉',
                description: `تم قيد ${selectedStudentIds.length} طالب في ${selectedClass.name}`,
            });

            setIsModalOpen(false);
            setSelectedStudentIds([]);
            loadData();
        } catch (e: any) {
            toast({ title: 'خطأ', description: e.message || 'فشل تسجيل الطلاب', variant: 'destructive' });
        }
    };

    const handleUnenroll = async (studentId: string) => {
        const student = allStudents.find((s) => s.id === studentId);
        if (!confirm(`هل أنت متأكد من إلغاء قيد الطالب ${student?.fullName || ''} من هذا الفصل؟`)) return;

        try {
            // Find enrollment record
            const enr = enrollments.find((e) => e.studentId === studentId && e.classId === selectedClassId);
            if (enr) {
                nexusBridge.unenrollStudent(enr.id);
            }
            if (student) {
                student.classId = '';
                student.grade = 'غير مقيد بفصل حالياً';
                nexusBridge.saveStudent(student);
            }
            toast({ title: 'تم بنجاح', description: 'تم إلغاء قيد الطالب من الفصل' });
            loadData();
        } catch {
            toast({ title: 'خطأ', description: 'فشل إلغاء القيد', variant: 'destructive' });
        }
    };

    const filteredClassStudents = classStudents.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
            s.fullName.toLowerCase().includes(q) ||
            (s.universalId || '').toLowerCase().includes(q) ||
            s.nationalId.includes(q) ||
            s.parentPhone.includes(q)
        );
    });

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">شؤون الطلاب وقيد الفصول</h1>
                    <p className="text-muted-foreground">
                        إدارة قيد وتسجيل وتوزيع الطلاب على الشعب والفصول الدراسية وربطهم برواد الفصول
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    disabled={availableStudents.length === 0}
                >
                    <UserPlus className="w-4 h-4" />
                    قيد ونقل طلاب لهذا الفصل ({availableStudents.length} متاح)
                </Button>
            </div>

            {/* Class Selector Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <label className="text-sm font-semibold whitespace-nowrap">اختر الفصل الدراسي:</label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-full sm:w-[360px] font-bold">
                            <SelectValue placeholder="اختر الفصل" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name} ({cls.homeroomTeacherName})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedClass && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm border-blue-200 bg-blue-50 text-blue-800">
                            رائد الفصل: {selectedClass.homeroomTeacherName}
                        </Badge>
                        <Badge variant="outline" className="text-sm border-emerald-200 bg-emerald-50 text-emerald-800 font-mono">
                            المقيدون: {classStudents.length} / {selectedClass.capacity} طالب
                        </Badge>
                    </div>
                )}
            </div>

            {/* Search within class */}
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="بحث في طلاب هذا الفصل بالاسم، معرف الطالب (ID)، أو رقم الهوية..."
                        className="pr-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table of Enrolled Students */}
            <div className="rounded-md border bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">معرف الطالب (ID)</TableHead>
                            <TableHead className="text-right">اسم الطالب الكامل</TableHead>
                            <TableHead className="text-right">رقم الهوية الوطنية</TableHead>
                            <TableHead className="text-right">ولي الأمر</TableHead>
                            <TableHead className="text-right">هاتف التواصل</TableHead>
                            <TableHead className="text-right">المعدل التراكمي</TableHead>
                            <TableHead className="text-right">نسبة الحضور</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClassStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    لا يوجد طلاب مقيدين بهذا الفصل يطابقون البحث
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClassStudents.map((std) => (
                                <TableRow key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                        {std.universalId || std.id}
                                    </TableCell>
                                    <TableCell className="font-semibold">{std.fullName}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{std.nationalId}</TableCell>
                                    <TableCell className="text-sm">{std.parentName}</TableCell>
                                    <TableCell className="font-mono text-xs">{std.parentPhone}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={
                                                std.averageGrade >= 95
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                            }
                                        >
                                            {std.averageGrade}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{std.attendanceRate}%</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUnenroll(std.id)}
                                            className="text-red-600 hover:bg-red-50 text-xs gap-1"
                                            title="إلغاء القيد"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            نقل / إلغاء
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Bulk Enroll Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>قيد ونقل طلاب إلى {selectedClass?.name}</DialogTitle>
                        <DialogDescription>
                            حدد الطلاب المراد قيدهم أو نقلهم إلى هذا الفصل الرسمي
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 my-4">
                        {availableStudents.length === 0 ? (
                            <p className="text-center py-6 text-muted-foreground">جميع طلاب المدرسة مقيدون بهذا الفصل بالفعل.</p>
                        ) : (
                            availableStudents.map((student) => {
                                const isChecked = selectedStudentIds.includes(student.id);
                                return (
                                    <label
                                        key={student.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                            isChecked ? 'bg-blue-50/80 border-blue-400 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-blue-600"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                    } else {
                                                        setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student.id));
                                                    }
                                                }}
                                            />
                                            <div>
                                                <div className="font-semibold text-sm">{student.fullName}</div>
                                                <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                                                    <span>المعرف: {student.universalId || student.id}</span>
                                                    <span>ولي الأمر: {student.parentName}</span>
                                                    <span>الحالي: {student.grade}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {student.averageGrade}%
                                        </Badge>
                                    </label>
                                );
                            })
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleBulkEnroll}
                            disabled={selectedStudentIds.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            تأكيد قيد ({selectedStudentIds.length}) طلاب في الفصل
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
