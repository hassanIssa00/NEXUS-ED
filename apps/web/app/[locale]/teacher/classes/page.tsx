'use client';

import { useState, useEffect } from 'react';
import {
  Search, MoreVertical, Mail, FileText, UserCheck, Plus, Phone,
  Calendar, Award, BookOpen, ShieldCheck, Sparkles, X, Check, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { nexusBridge, ClassStudentRecord, DailyAttendanceRecord, SchoolClass } from '@/lib/nexusDataBridge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TeacherClassesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('CLS-101');
  const [students, setStudents] = useState<ClassStudentRecord[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudentRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student Form State
  const [newName, setNewName] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newNationalId, setNewNationalId] = useState('');

  const loadData = () => {
    const clsList = nexusBridge.getClasses();
    setClasses(clsList);
    const activeId = selectedClassId || nexusBridge.getActiveClass() || 'CLS-101';
    setStudents(nexusBridge.getStudents(activeId));
    setAttendance(nexusBridge.getTodayAttendance());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('nexus:data-changed', handleSync);
    return () => window.removeEventListener('nexus:data-changed', handleSync);
  }, [selectedClassId]);

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    nexusBridge.setActiveClass(newClassId);
    setStudents(nexusBridge.getStudents(newClassId));
  };

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const getStudentStatus = (id: string): 'present' | 'absent' | 'late' => {
    const record = attendance.find((a) => a.studentId === id);
    return record?.overallStatus || 'present';
  };

  const toggleStudentStatus = (id: string) => {
    const current = getStudentStatus(id);
    const nextStatus: 'present' | 'absent' | 'late' =
      current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
    nexusBridge.markStudentAttendance(id, 1, nextStatus, 'manual_teacher');
    loadData();
    toast({
      title: 'تم تحديث حالة الطالب',
      description: `تم تغيير حالة الحضور إلى: ${nextStatus === 'present' ? 'حاضر ✅' : nextStatus === 'absent' ? 'غائب ❌' : 'متأخر ⏳'}`,
    });
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const universalId = nexusBridge.generateUniversalId('STD');
    const newStudent: ClassStudentRecord = {
      id: `cls-std-${Date.now()}`,
      universalId,
      fullName: newName.trim(),
      fullNameEn: newName.trim(),
      classId: selectedClassId,
      grade: activeClass?.name || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
      nationalId: newNationalId.trim() || `10${Math.floor(10000000 + Math.random() * 90000000)}`,
      dateOfBirth: '2019-05-15',
      parentName: newParentName.trim() || `ولي أمر ${newName.trim()}`,
      parentPhone: newParentPhone.trim() || '0500000000',
      parentEmail: `parent.${Date.now()}@nexusedu.sa`,
      photoUrl: '/images/avatars/default.webp',
      notes: `طالب مسجل حديثاً في ${activeClass?.name || 'فصل د. إسماعيل عيسى'}.`,
      averageGrade: 90,
      attendanceRate: 100,
      rank: students.length + 1,
      assignedProgram: 'تنمية المهارات الأساسية',
      status: 'active',
      studentAccountId: `acc_std_${Date.now()}`,
      parentAccountId: `acc_prt_${Date.now()}`,
    };

    nexusBridge.saveStudent(newStudent);
    loadData();
    setShowAddModal(false);
    setNewName('');
    setNewParentName('');
    setNewParentPhone('');
    setNewNationalId('');

    toast({
      title: 'تم إضافة الطالب بنجاح 🎉',
      description: `أهلاً بالطالب ${newStudent.fullName} بمعرف (${universalId}) في ${activeClass?.name || 'الفصل'}.`,
    });
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nationalId.includes(searchTerm) ||
      (s.universalId && s.universalId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.parentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">فصولي الدراسية 🏫</h2>
            
            {/* Multi-Class Switcher */}
            <Select value={selectedClassId} onValueChange={handleClassChange}>
              <SelectTrigger className="w-[300px] h-9 font-bold bg-white dark:bg-slate-800 border-primary/20 text-primary">
                <SelectValue placeholder="اختر الفصل" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة طلاب الشعبة، متابعة كشوف الأسماء، ورصد الحضور والتقييمات الأكاديمية
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن طالب أو هوية أو ID..."
              className="pr-9 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="h-10 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة طالب
          </Button>
        </div>
      </div>

      {/* Class Section Card */}
      <Card className="rounded-3xl border-gray-100 dark:border-white/5 shadow-sm overflow-hidden bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                {activeClass?.name || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى'}
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                الشعبة نشطة
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2 font-medium">
              <span>رائد الفصل: {activeClass?.homeroomTeacherName || 'د. إسماعيل عيسى'}</span>
              <span>•</span>
              <span className="font-bold text-primary">{students.length} طلاب مسجلين</span>
              <span>•</span>
              <span>الدوام اليومي: 07:00 ص – 12:45 م</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => {
                students.forEach((s) => nexusBridge.markStudentAttendance(s.id, 1, 'present', 'manual_teacher'));
                loadData();
                toast({ title: 'تحضير سريع مكتمل ✅', description: 'تم تحضير جميع طلاب الفصل بنجاح.' });
              }}
            >
              <UserCheck className="w-3.5 h-3.5" />
              تحضير الفصل كاملاً
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const status = getStudentStatus(student.id);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-white/5 rounded-2xl bg-white dark:bg-[#252538] hover:shadow-md transition-all group"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="relative">
                      <Avatar className="h-11 w-11 rounded-xl border border-gray-100 shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {student.fullName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          status === 'present'
                            ? 'bg-emerald-500'
                            : status === 'absent'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {student.fullName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        الهوية: {student.nationalId} • المعدل: {student.averageGrade}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleStudentStatus(student.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${
                        status === 'present'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : status === 'absent'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                      title="انقر لتغيير حالة الحضور"
                    >
                      {status === 'present' ? 'حاضر' : status === 'absent' ? 'غائب' : 'متأخر'}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl w-44">
                        <DropdownMenuItem onClick={() => setSelectedStudent(student)} className="gap-2 cursor-pointer">
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>عرض الملف الكامل</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(student.parentPhone);
                            toast({ title: 'تم نسخ الهاتف', description: student.parentPhone });
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>نسخ رقم ولي الأمر</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleStudentStatus(student.id)}
                          className="gap-2 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>تبديل حالة الحضور</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-2xl bg-primary/10 text-primary font-black text-lg">
                  <AvatarFallback>{selectedStudent.fullName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{selectedStudent.fullName}</h3>
                  <p className="text-xs text-muted-foreground">{selectedStudent.fullNameEn}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                <span className="text-[11px] text-muted-foreground block font-bold">رقم الهوية الوطنية</span>
                <span className="font-black text-gray-900 dark:text-white mt-0.5 block">{selectedStudent.nationalId}</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                <span className="text-[11px] text-muted-foreground block font-bold">تاريخ الميلاد</span>
                <span className="font-black text-gray-900 dark:text-white mt-0.5 block">{selectedStudent.dateOfBirth}</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                <span className="text-[11px] text-muted-foreground block font-bold">ولي الأمر</span>
                <span className="font-black text-gray-900 dark:text-white mt-0.5 block">{selectedStudent.parentName}</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                <span className="text-[11px] text-muted-foreground block font-bold">رقم هاتف التواصل</span>
                <span className="font-black text-emerald-600 mt-0.5 block" dir="ltr">{selectedStudent.parentPhone}</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                <span className="text-[11px] text-muted-foreground block font-bold">المعدل التراكمي</span>
                <span className="font-black text-primary mt-0.5 block">{selectedStudent.averageGrade}%</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                <span className="text-[11px] text-muted-foreground block font-bold">نسبة المواظبة والحضور</span>
                <span className="font-black text-emerald-600 mt-0.5 block">{selectedStudent.attendanceRate}%</span>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/15 p-3.5 rounded-2xl">
              <span className="text-xs font-black text-primary block mb-1">البرنامج والمسار التعليمي:</span>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{selectedStudent.assignedProgram}</p>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl">
              <span className="text-xs font-black text-gray-900 dark:text-white block mb-1">ملاحظات المعلم (د. إسماعيل عيسى):</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{selectedStudent.notes}</p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl text-xs font-bold"
              >
                إغلاق
              </Button>
              <Button
                onClick={() => {
                  toggleStudentStatus(selectedStudent.id);
                  setSelectedStudent(null);
                }}
                className="rounded-xl text-xs font-bold bg-primary text-white"
              >
                تبديل حالة الحضور اليوم
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleAddStudent}
            className="relative w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                إضافة طالب جديد للفصل
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  اسم الطالب الثلاثي *
                </label>
                <Input
                  required
                  placeholder="مثال: يوسف أحمد الغامدي"
                  className="rounded-xl h-10"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  رقم الهوية الوطنية
                </label>
                <Input
                  placeholder="10XXXXXXXX"
                  className="rounded-xl h-10"
                  value={newNationalId}
                  onChange={(e) => setNewNationalId(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  اسم ولي الأمر
                </label>
                <Input
                  placeholder="أحمد الغامدي"
                  className="rounded-xl h-10"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  رقم جوال ولي الأمر (واتساب)
                </label>
                <Input
                  placeholder="05XXXXXXXX"
                  className="rounded-xl h-10"
                  value={newParentPhone}
                  onChange={(e) => setNewParentPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white"
              >
                حفظ وإضافة الطالب
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
