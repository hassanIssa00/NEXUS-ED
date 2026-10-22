'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link, usePathname } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Sparkles,
    BookOpen,
    Users,
    Calendar,
    Award,
    Settings,
    ChevronLeft,
    GraduationCap,
    FileText,
    BarChart3,
    LogOut,
    Menu,
    Gamepad2,
    Video,
    Trophy,
    QrCode,
    Shield,
    Zap,
    X,
    MessageSquare,
    ClipboardList,
    CreditCard,
    HeartHandshake,
    Eye,
    UserCog,
    Building2,
    BookMarked,
    Star,
    Brain,
    Target,
    Camera,
    Archive,
    Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocale } from 'next-intl'
import { useAuth, type UserRole } from '@/contexts/auth-context'
import { UserProfileModal } from '@/components/dashboard/user-profile-modal'
import Image from 'next/image'

// Role color map — matches login portal colors
const ROLE_COLORS: Record<string, { gradient: string; accent: string; light: string }> = {
    student:       { gradient: 'from-[#98793E] to-[#059669]', accent: '#98793E', light: 'bg-teal-50 dark:bg-teal-900/20' },
    teacher:       { gradient: 'from-[#4A687C] to-[#35556B]', accent: '#4A687C', light: 'bg-blue-50 dark:bg-blue-900/20' },
    parent:        { gradient: 'from-[#F59E0B] to-[#D97706]', accent: '#F59E0B', light: 'bg-amber-50 dark:bg-amber-900/20' },
    admin:         { gradient: 'from-[#F43F5E] to-[#E11D48]', accent: '#F43F5E', light: 'bg-rose-50 dark:bg-rose-900/20' },
    manager:       { gradient: 'from-[#F43F5E] to-[#E11D48]', accent: '#F43F5E', light: 'bg-rose-50 dark:bg-rose-900/20' },
    principal:     { gradient: 'from-[#234A65] to-[#203D52]', accent: '#234A65', light: 'bg-purple-50 dark:bg-purple-900/20' },
    vice_principal:{ gradient: 'from-[#98793E] to-[#BE185D]', accent: '#98793E', light: 'bg-pink-50 dark:bg-pink-900/20' },
    counselor:     { gradient: 'from-[#98793E] to-[#35556B]', accent: '#98793E', light: 'bg-teal-50 dark:bg-teal-900/20' },
    supervisor:    { gradient: 'from-[#35556B] to-[#234A65]', accent: '#35556B', light: 'bg-indigo-50 dark:bg-indigo-900/20' },
    accountant:    { gradient: 'from-[#10B981] to-[#059669]', accent: '#10B981', light: 'bg-emerald-50 dark:bg-emerald-900/20' },
    hr:            { gradient: 'from-[#F97316] to-[#EA580C]', accent: '#F97316', light: 'bg-orange-50 dark:bg-orange-900/20' },
}

interface SidebarProps {
    role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { user, profile, signOut } = useAuth()

    const isEnglish = useLocale() === 'en'
    const navigation = getNavigationByRole(role, isEnglish)
    const colors = ROLE_COLORS[role] ?? ROLE_COLORS.student

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <div className={cn(
            'flex flex-col h-full',
            mobile ? 'w-72' : ''
        )}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
                <AnimatePresence mode="wait">
                    {(!collapsed || mobile) && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-2.5"
                        >
                            <div className="flex items-center gap-1">
                                <div className="w-8 h-8 rounded-[8px] overflow-hidden shadow-sm flex items-center justify-center bg-white border border-border">
                                    <img src="/logo_new.webp" alt="Logo" className="w-full h-full object-cover" />
                                </div>
                                <div className="w-8 h-8 rounded-[8px] overflow-hidden shadow-sm flex items-center justify-center bg-white border border-border">
                                    <img src="/second_logo.webp" alt="Partner Logo" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div>
                                <h1 className="font-bold text-sm text-foreground leading-tight">نكسس</h1>
                                <p className="text-[9px] text-muted-foreground font-semibold tracking-wider uppercase">NEXUS EDU</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {mobile ? (
                    <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn('text-muted-foreground hover:text-foreground', collapsed && 'mx-auto')}
                    >
                        {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </Button>
                )}
            </div>

            {/* Role Badge */}
            {(!collapsed || mobile) && (
                <div className={cn('mx-3 mt-3 mb-1 px-3 py-2 rounded-[10px]', colors.light)}>
                    <p className="text-xs font-bold" style={{ color: colors.accent }}>
                        {getRoleLabel(role, isEnglish)}
                    </p>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
                {navigation.map((item) => {
                    const [itemPath, itemQuery] = item.href.split('?')
                    const isRoleHome = /^\/(student|teacher|parent|admin|manager|principal|vice_principal|counselor|supervisor|accountant|hr)$/.test(itemPath)
                    const queryMatches = itemQuery ? new URLSearchParams(itemQuery).toString() === searchParams.toString() : !isRoleHome || searchParams.toString() === ''
                    const pathMatches = pathname === itemPath || (!isRoleHome && pathname.startsWith(itemPath + '/'))
                    const isActive = pathMatches && queryMatches
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'group flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-150 cursor-pointer relative',
                                isActive
                                    ? 'font-semibold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                collapsed && !mobile && 'justify-center px-0'
                            )}
                            style={isActive ? {
                                backgroundColor: `${colors.accent}15`,
                                color: colors.accent,
                            } : {}}
                        >
                            <item.icon className={cn('w-5 h-5 flex-shrink-0 transition-colors', isActive ? '' : 'text-muted-foreground group-hover:text-foreground')}
                                style={isActive ? { color: colors.accent } : {}}
                            />
                            {(!collapsed || mobile) && (
                                <span className="text-sm">{item.label}</span>
                            )}
                            {isActive && (!collapsed || mobile) && (
                                <motion.div
                                    layoutId={mobile ? 'mobile-active' : 'desktop-active'}
                                    className="absolute left-0 w-[3px] h-6 rounded-r-full"
                                    style={{ backgroundColor: colors.accent }}
                                />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Profile */}
            <div className="p-3 border-t border-border flex-shrink-0">
                <div className={cn('flex items-center gap-3', collapsed && !mobile && 'justify-center')}>
                    <div className="relative flex-shrink-0">
                        <div className={cn('relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm', colors.gradient)}>
                            {profile?.avatar_url
                                ? <Image src={profile.avatar_url} alt={`صورة ${profile.full_name || 'المستخدم'}`} width={36} height={36} unoptimized className="h-full w-full object-cover" />
                                : (profile?.full_name || user?.email || 'N')[0].toUpperCase()}
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
                    </div>

                    {(!collapsed || mobile) && (
                        <>
                            <UserProfileModal>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {profile?.full_name || user?.email?.split('@')[0] || 'المستخدم'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{getRoleLabel(role, isEnglish)}</p>
                                </motion.div>
                            </UserProfileModal>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                                onClick={() => signOut()}
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop Sidebar */}
            <motion.div
                initial={false}
                animate={{ width: collapsed ? 72 : 256 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden lg:flex flex-col h-screen sticky top-0 bg-card border-l border-border z-50 shadow-sm overflow-hidden no-print"
            >
                <SidebarContent />
            </motion.div>

            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-xl bg-card border border-border shadow-md flex items-center justify-center"
            >
                <Menu className="w-5 h-5 text-foreground" />
            </button>

            {/* Mobile Sidebar Drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="lg:hidden fixed top-0 right-0 h-full bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
                            dir="rtl"
                        >
                            <SidebarContent mobile />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

function getRoleLabel(role: string, english = false): string {
    const labels: Record<string, string> = {
        student: 'طالب',
        teacher: 'معلم',
        parent: 'ولي أمر',
        admin: 'مدير النظام',
        manager: 'مدير',
        principal: 'مدير المدرسة',
        vice_principal: 'وكيل المدرسة',
        counselor: 'مرشد طلابي',
        supervisor: 'مشرف تربوي',
        accountant: 'محاسب',
        hr: 'موارد بشرية',
    }
    const englishLabels: Record<string, string> = {
        student: 'Student', teacher: 'Teacher', parent: 'Parent', admin: 'School administrator', manager: 'School administrator',
        principal: 'Principal', vice_principal: 'Vice principal', counselor: 'Student counselor', supervisor: 'Educational supervisor',
        accountant: 'Accountant', hr: 'Human resources',
    }
    return (english ? englishLabels : labels)[role] ?? role
}

function getNavigationByRole(role: string, english = false) {
    const settings = [
        { href: `/${role}/settings` as any, label: english ? 'Settings' : 'الإعدادات', icon: Settings },
    ]

    switch (role) {
        case 'student':
            return [
                { href: '/student' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/student/schedule' as any, label: 'جدول الحصص', icon: Calendar },
                { href: '/student/subjects' as any, label: 'المناهج والكتب الدراسية', icon: BookOpen },
                { href: '/student/quran' as any, label: 'المصحف الشريف', icon: BookMarked },
                { href: '/student/assignments' as any, label: 'الواجبات المدرسية', icon: FileText },
                { href: '/student/quizzes' as any, label: 'الاختبارات', icon: Target },
                { href: '/student/attendance' as any, label: 'سجل الحضور والغياب', icon: QrCode },
                { href: '/student/grades' as any, label: 'الدرجات والتقييم', icon: Award },
                { href: '/student/certificates' as any, label: 'الإنجازات والشهادات', icon: Trophy },
                { href: '/student/live' as any, label: 'البث المباشر للحصص', icon: Radio },
                { href: '/student/games' as any, label: 'الألعاب التعليمية', icon: Gamepad2 },
                { href: '/student/million' as any, label: 'مسابقة نكسس الكبرى', icon: Star },
                { href: '/student/photos' as any, label: 'معرض الفعاليات والأنشطة', icon: Camera },
                { href: '/student/community' as any, label: 'مجتمع المدرسة', icon: Users },
                { href: '/student/messages' as any, label: 'التواصل والرسائل', icon: MessageSquare },
                { href: '/student/profile' as any, label: 'الملف الذكي للطالب', icon: Brain },
                ...settings,
            ]

        case 'teacher':
            return [
                { href: '/teacher' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/teacher?tab=tools' as any, label: 'أدوات نكسس (Nexus Tools)', icon: Sparkles },
                { href: '/teacher/classes' as any, label: 'فصولي والطلاب', icon: Users },
                { href: '/teacher/curriculum' as any, label: 'المناهج والخطط الدراسية', icon: BookMarked },
                { href: '/teacher/assignments' as any, label: 'الواجبات والتصحيح', icon: FileText },
                { href: '/teacher/quizzes' as any, label: 'بنك الاختبارات والتقييم', icon: Target },
                { href: '/assessment/reports' as any, label: 'تقارير اختبارات القبول', icon: BarChart3 },
                { href: '/teacher/attendance' as any, label: 'رصد الحضور والانضباط', icon: Calendar },
                { href: '/teacher/reports' as any, label: 'التقارير الأسبوعية الشاملة', icon: BarChart3 },
                { href: '/teacher/automation/certificates' as any, label: 'الشهادات والأوسمة', icon: Award },
                { href: '/teacher/meetings' as any, label: 'لقاءات أولياء الأمور', icon: HeartHandshake },
                { href: '/teacher/live' as any, label: 'البث المباشر للحصص', icon: Radio },
                { href: '/teacher/community' as any, label: 'ملتقى أولياء الأمور', icon: Users },
                { href: '/teacher/photos' as any, label: 'معرض الأنشطة والفعاليات', icon: Camera },
                { href: '/teacher/archive' as any, label: 'الأرشيف المدرسي اليومي', icon: Archive },
                { href: '/teacher/lessons' as any, label: 'تحضير الدروس', icon: BookOpen },
                { href: '/teacher/messages' as any, label: 'الرسائل المباشرة', icon: MessageSquare },
                { href: '/teacher/automation' as any, label: 'أدوات الأتمتة الذكية', icon: Zap },
                { href: '/teacher/notifications' as any, label: 'التنبيهات', icon: Star },
                ...settings,
            ]

        case 'parent':
            return [
                { href: '/parent' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/parent/schedule' as any, label: 'جدول الحصص الأسبوعي', icon: Calendar },
                { href: '/parent/attendance' as any, label: 'سجل الحضور والانضباط', icon: QrCode },
                { href: '/parent/reports' as any, label: 'التقرير الأكاديمي الشامل', icon: BarChart3 },
                { href: '/assessment/reports' as any, label: 'تقارير اختبارات الأبناء', icon: GraduationCap },
                { href: '/parent/grades' as any, label: 'درجات الأبناء والشهادات', icon: Award },
                { href: '/parent/meetings' as any, label: 'لقاءات أولياء الأمور', icon: HeartHandshake },
                { href: '/parent/messages' as any, label: 'التواصل مع المعلمين', icon: MessageSquare },
                { href: '/parent/community' as any, label: 'ملتقى أولياء الأمور', icon: Users },
                { href: '/parent/photos' as any, label: 'معرض فعاليات الفصل', icon: Camera },
                { href: '/parent/payments' as any, label: 'المدفوعات والمستحقات', icon: CreditCard },
                { href: '/parent/notifications' as any, label: 'الإشعارات والتنبيهات', icon: Star },
                ...settings,
            ]

        case 'admin':
        case 'manager':
            return [
                { href: '/admin' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/admin/students' as any, label: english ? 'Student records' : 'سجلات الطلاب', icon: GraduationCap },
                { href: '/admin/users' as any, label: english ? 'User accounts' : 'المستخدمين', icon: Users },
                { href: '/admin/registration-archive' as any, label: english ? 'Signup archive' : 'أرشيف التسجيلات', icon: Archive },
                { href: '/admin/classes' as any, label: english ? 'Classes' : 'الفصول الدراسية', icon: BookOpen },
                { href: '/admin/subjects' as any, label: english ? 'Subjects' : 'المواد الدراسية', icon: BookMarked },
                { href: '/admin/enrollments' as any, label: english ? 'Enrollments' : 'التسجيلات', icon: GraduationCap },
                { href: '/assessment/reports' as any, label: english ? 'Placement assessment reports' : 'تقارير اختبارات القبول', icon: BarChart3 },
                { href: '/admin/content' as any, label: english ? 'Educational library' : 'المكتبة التعليمية', icon: Video },
                { href: '/admin/games' as any, label: english ? 'Educational games' : 'الألعاب التعليمية', icon: Gamepad2 },
                { href: '/admin/permissions' as any, label: english ? 'Accounts by role' : 'الحسابات حسب الدور', icon: Shield },
                ...settings,
            ]

        case 'principal':
            return [
                { href: '/principal' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/principal/students' as any, label: english ? 'Student records' : 'سجلات الطلاب', icon: GraduationCap },
                { href: '/principal/classes' as any, label: english ? 'Classes' : 'الفصول', icon: Users },
                { href: '/principal/teachers' as any, label: english ? 'Teachers' : 'المعلمون', icon: BookOpen },
                { href: '/principal/analytics' as any, label: english ? 'Reports and analytics' : 'التقارير والإحصاءات', icon: BarChart3 },
            ]

        case 'vice_principal':
            return [
                { href: '/vice_principal' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/vice_principal/schedules' as any, label: english ? 'Class schedules' : 'الجداول الدراسية', icon: Calendar },
                { href: '/vice_principal/attendance' as any, label: english ? 'School attendance' : 'الحضور العام', icon: QrCode },
                { href: '/vice_principal/students' as any, label: english ? 'Student records' : 'سجلات الطلاب', icon: GraduationCap },
                { href: '/vice_principal/classes' as any, label: english ? 'Classes' : 'الفصول', icon: BookOpen },
            ]

        case 'counselor':
            return [
                { href: '/counselor' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/counselor/students' as any, label: english ? 'Students' : 'الطلاب', icon: Users },
                { href: '/counselor/classes' as any, label: english ? 'Classes' : 'الفصول الدراسية', icon: BookOpen },
                { href: '/counselor/cases' as any, label: english ? 'Follow-up cases' : 'الحالات', icon: HeartHandshake },
                { href: '/counselor/attendance' as any, label: english ? 'Absences' : 'الغيابات', icon: Calendar },
                { href: '/counselor/parent-surveys' as any, label: english ? 'Parent surveys' : 'استبيانات أولياء الأمور', icon: ClipboardList },
            ]

        case 'supervisor':
            return [
                { href: '/supervisor' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/supervisor/students' as any, label: english ? 'Student records' : 'سجلات الطلاب', icon: GraduationCap },
                { href: '/supervisor/teachers' as any, label: english ? 'Teachers' : 'المعلمون', icon: Eye },
                { href: '/supervisor/classes' as any, label: english ? 'Classes' : 'الفصول', icon: BookOpen },
                { href: '/supervisor/reports' as any, label: english ? 'Reports' : 'التقارير', icon: BarChart3 },
            ]

        case 'accountant':
            return [
                { href: '/accountant' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/accountant/students' as any, label: english ? 'Student records' : 'سجلات الطلاب', icon: GraduationCap },
                { href: '/accountant/classes' as any, label: english ? 'Classes' : 'الفصول الدراسية', icon: BookOpen },
                { href: '/accountant/reports' as any, label: english ? 'Financial reports' : 'التقارير المالية', icon: BarChart3 },
                { href: '/accountant/invoices' as any, label: english ? 'Invoices and collections' : 'الفواتير والتحصيل', icon: CreditCard },
            ]

        case 'hr':
            return [
                { href: '/hr' as any, label: english ? 'Dashboard' : 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/hr/students' as any, label: english ? 'Student records' : 'سجلات الطلاب', icon: GraduationCap },
                { href: '/hr/classes' as any, label: english ? 'Classes' : 'الفصول الدراسية', icon: BookOpen },
                { href: '/hr/employees' as any, label: english ? 'Staff directory' : 'دليل الموظفين', icon: Users },
                { href: '/hr/reports' as any, label: english ? 'HR summary' : 'ملخص الموارد البشرية', icon: BarChart3 },
            ]

        default:
            return [
                { href: `/${role}` as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                ...settings,
            ]
    }
}
