'use client'

import { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, type UserRole } from '@/contexts/auth-context'
import { UserProfileModal } from '@/components/dashboard/user-profile-modal'

// Role color map — matches login portal colors
const ROLE_COLORS: Record<string, { gradient: string; accent: string; light: string }> = {
    student:       { gradient: 'from-[#00D1B2] to-[#059669]', accent: '#00D1B2', light: 'bg-teal-50 dark:bg-teal-900/20' },
    teacher:       { gradient: 'from-[#3B82F6] to-[#2563EB]', accent: '#3B82F6', light: 'bg-blue-50 dark:bg-blue-900/20' },
    parent:        { gradient: 'from-[#F59E0B] to-[#D97706]', accent: '#F59E0B', light: 'bg-amber-50 dark:bg-amber-900/20' },
    admin:         { gradient: 'from-[#F43F5E] to-[#E11D48]', accent: '#F43F5E', light: 'bg-rose-50 dark:bg-rose-900/20' },
    manager:       { gradient: 'from-[#F43F5E] to-[#E11D48]', accent: '#F43F5E', light: 'bg-rose-50 dark:bg-rose-900/20' },
    principal:     { gradient: 'from-[#8B5CF6] to-[#6D28D9]', accent: '#8B5CF6', light: 'bg-purple-50 dark:bg-purple-900/20' },
    vice_principal:{ gradient: 'from-[#EC4899] to-[#BE185D]', accent: '#EC4899', light: 'bg-pink-50 dark:bg-pink-900/20' },
    counselor:     { gradient: 'from-[#14B8A6] to-[#0F766E]', accent: '#14B8A6', light: 'bg-teal-50 dark:bg-teal-900/20' },
    supervisor:    { gradient: 'from-[#6366F1] to-[#4338CA]', accent: '#6366F1', light: 'bg-indigo-50 dark:bg-indigo-900/20' },
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
    const { user, profile, signOut } = useAuth()

    const navigation = getNavigationByRole(role)
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
                        {getRoleLabel(role)}
                    </p>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
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
                        <div className={cn('w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-sm', colors.gradient)}>
                            {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
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
                                    <p className="text-xs text-muted-foreground truncate">{getRoleLabel(role)}</p>
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

function getRoleLabel(role: string): string {
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
    return labels[role] ?? role
}

function getNavigationByRole(role: string) {
    const settings = [
        { href: `/${role}/settings` as any, label: 'الإعدادات', icon: Settings },
    ]

    switch (role) {
        case 'student':
            return [
                { href: '/student' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/student/assignments' as any, label: 'الواجبات', icon: FileText },
                { href: '/student/grades' as any, label: 'الدرجات', icon: Award },
                { href: '/student/million' as any, label: 'مسابقة نكسس', icon: Trophy },
                { href: '/student/games' as any, label: 'الألعاب التعليمية', icon: Gamepad2 },
                { href: '/student/content' as any, label: 'المكتبة التعليمية', icon: Video },
                { href: '/student/attendance' as any, label: 'سجل الحضور', icon: QrCode },
                { href: '/student/messages' as any, label: 'الرسائل', icon: MessageSquare },
                { href: '/student/profile' as any, label: 'الملف الذكي', icon: Brain },
                ...settings,
            ]

        case 'teacher':
            return [
                { href: '/teacher' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/teacher/classes' as any, label: 'فصولي', icon: Users },
                { href: '/teacher/assignments' as any, label: 'الواجبات', icon: FileText },
                { href: '/teacher/grading' as any, label: 'التصحيح', icon: ClipboardList },
                { href: '/teacher/attendance' as any, label: 'الحضور والغياب', icon: Calendar },
                { href: '/teacher/lessons' as any, label: 'الدروس', icon: BookOpen },
                { href: '/teacher/messages' as any, label: 'الرسائل', icon: MessageSquare },
                { href: '/teacher/automation' as any, label: 'أدوات الأتمتة', icon: Zap },
                { href: '/teacher/notifications' as any, label: 'التنبيهات', icon: Award },
                ...settings,
            ]

        case 'parent':
            return [
                { href: '/parent' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/parent/grades' as any, label: 'درجات الأبناء', icon: Award },
                { href: '/parent/attendance' as any, label: 'سجل الحضور', icon: Calendar },
                { href: '/parent/notifications' as any, label: 'الإشعارات', icon: BookOpen },
                { href: '/parent/payments' as any, label: 'المدفوعات', icon: CreditCard },
                { href: '/parent/messages' as any, label: 'التواصل مع المعلم', icon: MessageSquare },
                ...settings,
            ]

        case 'admin':
        case 'manager':
            return [
                { href: '/admin' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/admin/users' as any, label: 'المستخدمين', icon: Users },
                { href: '/admin/classes' as any, label: 'الفصول الدراسية', icon: BookOpen },
                { href: '/admin/subjects' as any, label: 'المواد الدراسية', icon: BookMarked },
                { href: '/admin/enrollments' as any, label: 'التسجيلات', icon: GraduationCap },
                { href: '/admin/content' as any, label: 'إدارة المحتوى', icon: Video },
                { href: '/admin/games' as any, label: 'إدارة الألعاب', icon: Gamepad2 },
                { href: '/admin/permissions' as any, label: 'الصلاحيات', icon: Shield },
                ...settings,
            ]

        case 'principal':
            return [
                { href: '/principal' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/principal/classes' as any, label: 'الفصول', icon: Users },
                { href: '/principal/teachers' as any, label: 'المعلمون', icon: BookOpen },
                { href: '/principal/analytics' as any, label: 'التقارير والإحصاءات', icon: BarChart3 },
                ...settings,
            ]

        case 'vice_principal':
            return [
                { href: '/vice_principal' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/vice_principal/schedules' as any, label: 'الجداول الدراسية', icon: Calendar },
                { href: '/vice_principal/attendance' as any, label: 'الحضور العام', icon: QrCode },
                { href: '/vice_principal/students' as any, label: 'سجلات الطلاب', icon: GraduationCap },
                ...settings,
            ]

        case 'counselor':
            return [
                { href: '/counselor' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/counselor/students' as any, label: 'الطلاب', icon: Users },
                { href: '/counselor/cases' as any, label: 'الحالات', icon: HeartHandshake },
                { href: '/counselor/attendance' as any, label: 'الغيابات', icon: Calendar },
                ...settings,
            ]

        case 'supervisor':
            return [
                { href: '/supervisor' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/supervisor/schools' as any, label: 'المدارس', icon: Building2 },
                { href: '/supervisor/teachers' as any, label: 'المعلمون', icon: Eye },
                { href: '/supervisor/reports' as any, label: 'التقارير', icon: BarChart3 },
                ...settings,
            ]

        case 'accountant':
            return [
                { href: '/accountant' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/accountant/invoices' as any, label: 'الفواتير', icon: FileText },
                { href: '/accountant/payments' as any, label: 'المدفوعات', icon: CreditCard },
                { href: '/accountant/reports' as any, label: 'التقارير المالية', icon: BarChart3 },
                ...settings,
            ]

        case 'hr':
            return [
                { href: '/hr' as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                { href: '/hr/employees' as any, label: 'الموظفون', icon: Users },
                { href: '/hr/contracts' as any, label: 'العقود', icon: FileText },
                { href: '/hr/attendance' as any, label: 'حضور الموظفين', icon: Calendar },
                { href: '/hr/settings' as any, label: 'الإعدادات', icon: UserCog },
            ]

        default:
            return [
                { href: `/${role}` as any, label: 'لوحة التحكم', icon: LayoutDashboard },
                ...settings,
            ]
    }
}
