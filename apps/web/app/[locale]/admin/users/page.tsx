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
import { Search, Plus, Pencil, Trash2, ShieldCheck, GraduationCap, BookOpen, Users, UserCheck, Eye, CreditCard, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { nexusBridge, NexusAccount, NexusUserRole } from '@/lib/nexusDataBridge';

interface DisplayUser {
    id: string;
    universalId: string;
    name: string;
    email: string;
    role: NexusUserRole;
    title: string;
    phone?: string;
    schoolName: string;
    department?: string;
}

const ROLES_LIST: { role: NexusUserRole; label: string }[] = [
    { role: 'teacher', label: 'معلم' },
    { role: 'student', label: 'طالب' },
    { role: 'parent', label: 'ولي أمر' },
    { role: 'principal', label: 'مدير المدرسة' },
    { role: 'vice_principal', label: 'وكيل المدرسة' },
    { role: 'counselor', label: 'الموجه الطلابي' },
    { role: 'supervisor', label: 'المشرف التربوي' },
    { role: 'accountant', label: 'المحاسب المالي' },
    { role: 'admin', label: 'الشؤون الإدارية' },
];

export default function UsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<DisplayUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'teacher' as NexusUserRole,
        phone: '',
        title: '',
        department: '',
    });

    const loadUsers = () => {
        try {
            const accounts = nexusBridge.getAccounts();
            const students = nexusBridge.getStudents();
            const teachers = nexusBridge.getTeachers();

            const userMap = new Map<string, DisplayUser>();

            // 1. Add core & dynamic accounts
            accounts.forEach((acc) => {
                userMap.set(acc.id, {
                    id: acc.id,
                    universalId: acc.universalId || (acc.role === 'teacher' ? 'TCH-1001' : acc.role === 'student' ? 'STD-1001' : 'ADM-101'),
                    name: acc.name,
                    email: acc.email,
                    role: acc.role,
                    title: acc.title,
                    phone: acc.phone || '',
                    schoolName: acc.schoolName || 'مدارس نكسس التعليمية الأهلية',
                    department: acc.department || '',
                });
            });

            // 2. Add all teachers
            teachers.forEach((tch) => {
                userMap.set(tch.id, {
                    id: tch.id,
                    universalId: tch.universalId || tch.teacherId,
                    name: tch.name,
                    email: tch.email,
                    role: 'teacher',
                    title: tch.title,
                    phone: tch.phone || '',
                    schoolName: tch.schoolName || 'مدارس نكسس التعليمية الأهلية',
                    department: tch.department || tch.specialization,
                });
            });

            // 3. Add all registered students
            students.forEach((std) => {
                const stdAccId = std.studentAccountId || `acc_${std.id}`;
                if (!userMap.has(stdAccId)) {
                    userMap.set(stdAccId, {
                        id: stdAccId,
                        universalId: std.universalId || `STD-${std.id.replace(/\D/g, '') || '1000'}`,
                        name: std.fullName,
                        email: std.parentEmail ? std.parentEmail.replace('parent', 'student') : `${std.id}@nexusedu.sa`,
                        role: 'student',
                        title: std.grade,
                        phone: std.parentPhone || '',
                        schoolName: 'مدارس نكسس التعليمية الأهلية',
                        department: std.grade,
                    });
                }
            });

            setUsers(Array.from(userMap.values()));
        } catch (e) {
            console.error('Failed to load users:', e);
            toast({ title: 'خطأ', description: 'فشل تحميل المستخدمين', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        const handleSync = () => loadUsers();
        window.addEventListener('nexus:data-changed', handleSync);
        return () => window.removeEventListener('nexus:data-changed', handleSync);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingUser) {
                const updated: NexusAccount = {
                    id: editingUser.id,
                    universalId: editingUser.universalId,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    phone: formData.phone,
                    title: formData.title || `${ROLES_LIST.find(r => r.role === formData.role)?.label}`,
                    department: formData.department,
                    schoolName: 'مدارس نكسس التعليمية الأهلية',
                    createdAt: new Date().toISOString(),
                };
                nexusBridge.saveAccount(updated);
                toast({ title: 'تم بنجاح', description: 'تم تحديث بيانات المستخدم في النظام والسحابة' });
            } else {
                const prefix = formData.role === 'teacher' ? 'TCH' : formData.role === 'student' ? 'STD' : formData.role === 'parent' ? 'PRT' : 'ADM';
                const universalId = nexusBridge.generateUniversalId(prefix);
                const newAccId = `acc_${formData.role}_${Date.now()}`;

                const newAccount: NexusAccount = {
                    id: newAccId,
                    universalId,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    phone: formData.phone,
                    title: formData.title || `${ROLES_LIST.find(r => r.role === formData.role)?.label}`,
                    department: formData.department,
                    schoolName: 'مدارس نكسس التعليمية الأهلية',
                    createdAt: new Date().toISOString(),
                };

                nexusBridge.saveAccount(newAccount);

                // If teacher, also save to Teachers store
                if (formData.role === 'teacher') {
                    nexusBridge.saveTeacher({
                        ...newAccount,
                        teacherId: universalId,
                        specialization: formData.department || 'التعليم العام',
                        nationalId: `10${Math.floor(10000000 + Math.random() * 90000000)}`,
                        assignedClassIds: ['CLS-101'],
                        assignedSubjectIds: ['SUB-ARB-1'],
                        weeklyPeriodsCount: 15,
                        status: 'active',
                        hireDate: new Date().toISOString().slice(0, 10),
                    });
                }

                toast({
                    title: 'تم بنجاح 🎉',
                    description: `تم إنشاء المستخدم بمعرف نظام رسمي: ${universalId}`,
                });
            }

            loadUsers();
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            toast({ title: 'خطأ', description: err.message || 'فشل حفظ المستخدم', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({ email: '', name: '', role: 'teacher', phone: '', title: '', department: '' });
    };

    const handleEdit = (user: DisplayUser) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone || '',
            title: user.title,
            department: user.department || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم من النظام وقاعدة البيانات؟')) return;
        try {
            nexusBridge.deleteAccount(id);
            nexusBridge.deleteTeacher(id);
            setUsers((prev) => prev.filter((u) => u.id !== id));
            toast({ title: 'تم بنجاح', description: 'تم حذف المستخدم من النظام' });
        } catch {
            toast({ title: 'خطأ', description: 'فشل حذف المستخدم', variant: 'destructive' });
        }
    };

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            (user.name || '').toLowerCase().includes(query) ||
            (user.email || '').toLowerCase().includes(query) ||
            (user.universalId || '').toLowerCase().includes(query) ||
            (user.phone || '').includes(query);
        const matchesRole = selectedRole === 'all' || user.role === selectedRole;
        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role: NexusUserRole) => {
        switch (role) {
            case 'principal':
                return <Badge className="bg-purple-100 text-purple-800 border-purple-300">مدير عام</Badge>;
            case 'vice_principal':
                return <Badge className="bg-pink-100 text-pink-800 border-pink-300">وكيل مدرسة</Badge>;
            case 'counselor':
                return <Badge className="bg-teal-100 text-teal-800 border-teal-300">موجه طلابي</Badge>;
            case 'supervisor':
                return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">مشرف تربوي</Badge>;
            case 'teacher':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-300">معلم</Badge>;
            case 'student':
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">طالب</Badge>;
            case 'parent':
                return <Badge className="bg-amber-100 text-amber-800 border-amber-300">ولي أمر</Badge>;
            case 'accountant':
                return <Badge className="bg-red-100 text-red-800 border-red-300">محاسب مالي</Badge>;
            case 'admin':
                return <Badge className="bg-slate-100 text-slate-800 border-slate-300">شؤون إدارية</Badge>;
            default:
                return <Badge variant="secondary">{role}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة مستخدمي المدرسة والنظام</h1>
                    <p className="text-muted-foreground">
                        جميع الحسابات المعتمدة (معلمون، طلاب، أولياء أمور، إدارة) مع معرفات نظام رسمية (Universal ID)
                    </p>
                </div>
                <Dialog open={isModalOpen} onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                            إضافة حساب جديد
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد للنظام'}</DialogTitle>
                            <DialogDescription>
                                {editingUser ? 'تعديل بيانات الحساب المسجل في النظام وقاعدة البيانات' : 'تسجيل حساب رسمي وتوليد Universal ID مرتبط بكامل النظام'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">الاسم الكامل</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="مثال: د. عبد العزيز الفهد"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">البريد الإلكتروني</label>
                                <Input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="example@nexusedu.sa"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">الدور في المدرسة</label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) => setFormData({ ...formData, role: value as NexusUserRole })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الدور" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES_LIST.map((r) => (
                                                <SelectItem key={r.role} value={r.role}>{r.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">رقم الهاتف</label>
                                    <Input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="05xxxxxxxx"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">التخصص / القسم</label>
                                <Input
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    placeholder="مثال: قسم اللغة العربية / الرياضيات"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">المسمى الوظيفي / الأكاديمي</label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="مثال: معلم لغتي والقرآن ورائد فصل"
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    إلغاء
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ وتسجيل في النظام'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Metrics Quick Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">إجمالي الحسابات المسجلة</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{users.length}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">هيئة التدريس (معلمون)</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">
                        {users.filter(u => u.role === 'teacher').length}
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">الطلاب المسجلون</p>
                    <p className="text-2xl font-bold mt-1 text-purple-600">
                        {users.filter(u => u.role === 'student').length}
                    </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">القيادة والإشراف الإداري</p>
                    <p className="text-2xl font-bold mt-1 text-amber-600">
                        {users.filter(u => !['teacher', 'student', 'parent'].includes(u.role)).length}
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="بحث بالمعرف (ID)، الاسم، البريد الإلكتروني، أو الهاتف..."
                        className="pr-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="تصفية حسب الدور" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">جميع الأدوار ({users.length})</SelectItem>
                        {ROLES_LIST.map((r) => (
                            <SelectItem key={r.role} value={r.role}>
                                {r.label} ({users.filter(u => u.role === r.role).length})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Users Table */}
            <div className="rounded-md border bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">معرف النظام (ID)</TableHead>
                            <TableHead className="text-right">الاسم</TableHead>
                            <TableHead className="text-right">البريد الإلكتروني</TableHead>
                            <TableHead className="text-right">الدور</TableHead>
                            <TableHead className="text-right">التخصص / المسمى</TableHead>
                            <TableHead className="text-right">الهاتف</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    لا يوجد مستخدمين يطابقون البحث
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <TableCell className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                        {user.universalId}
                                    </TableCell>
                                    <TableCell className="font-semibold">{user.name}</TableCell>
                                    <TableCell className="text-sm font-mono text-slate-600 dark:text-slate-300">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {user.department || user.title || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono">{user.phone || '—'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(user)}
                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                title="تعديل"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(user.id)}
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
