'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useAuth, type UserRole } from '@/contexts/auth-context';

const ROLE_ROUTES: Record<UserRole, string> = {
    student: '/student',
    teacher: '/teacher',
    parent: '/parent',
    admin: '/admin',
    manager: '/admin',
    principal: '/principal',
    vice_principal: '/vice_principal',
    counselor: '/counselor',
    supervisor: '/supervisor',
    accountant: '/accountant',
    hr: '/hr',
};

const PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/pricing',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/auth/action',
];
const SHARED_ROLE_ROUTES: Array<{ path: string; roles: UserRole[]; exact?: boolean }> = [
    { path: '/student/new', roles: ['student', 'parent'] },
    { path: '/survey', roles: ['parent'], exact: true },
    { path: '/assessment', roles: ['student'], exact: true },
];

function matchesRoute(pathname: string, route: string) {
    return pathname === route || pathname.startsWith(`${route}/`);
}

function isPublicPath(pathname: string) {
    return PUBLIC_ROUTES.some((route) =>
        pathname === route || pathname.endsWith(route) || pathname.includes(`${route}/`)
    ) || pathname === '/' || Boolean(pathname.match(/^\/[a-z]{2}$/));
}

function canAccessRoute(pathname: string, role: UserRole) {
    const roleRoute = ROLE_ROUTES[role];
    return Boolean(roleRoute && matchesRoute(pathname, roleRoute))
        || SHARED_ROLE_ROUTES.some(({ path, roles, exact }) => roles.includes(role) && (exact ? pathname === path : matchesRoute(pathname, path)))
        || pathname === '/account/pending';
}

function onboardingDestination(pathname: string, role: UserRole, step?: string, studentId?: string) {
    if (role === 'student') {
        if (step === 'student-profile' && !matchesRoute(pathname, '/student/new')) return '/student/new?flow=student';
        if (step === 'placement-assessment' && !matchesRoute(pathname, '/assessment') && !matchesRoute(pathname, '/student/new')) return '/assessment';
    }

    if (role === 'parent') {
        if (step === 'link-student' && !matchesRoute(pathname, '/student/new')) return '/student/new?flow=parent';
        if (step === 'parent-survey' && !matchesRoute(pathname, '/survey')) {
            return studentId ? `/survey?student=${encodeURIComponent(studentId)}` : '/parent';
        }
    }

    return null;
}

function isAllowedOnboardingPath(pathname: string, role: UserRole, step?: string) {
    if (role === 'student') {
        return (step === 'student-profile' && matchesRoute(pathname, '/student/new'))
            || (step === 'placement-assessment' && (matchesRoute(pathname, '/assessment') || matchesRoute(pathname, '/student/new')));
    }
    if (role === 'parent') {
        return (step === 'link-student' && matchesRoute(pathname, '/student/new'))
            || (step === 'parent-survey' && matchesRoute(pathname, '/survey'));
    }
    return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        // Check if current path is a public route or landing page
        const isPublicRoute = isPublicPath(pathname);

        // If not authenticated and trying to access protected route
        if (!user && !isPublicRoute) {
            router.push('/login');
            return;
        }

        if (user && profile) {
            const destination = onboardingDestination(
                pathname,
                profile.role,
                profile.onboardingStep,
                profile.onboardingStudentId,
            );
            if (destination) {
                router.replace(destination);
                return;
            }
        }

        // Email verification comes after the student assessment or parent survey.
        if (user && profile?.emailVerified === false
            && !matchesRoute(pathname, '/verify-email')
            && !isAllowedOnboardingPath(pathname, profile.role, profile.onboardingStep)) {
            router.replace('/verify-email');
            return;
        }

        // If authenticated and on login/register, continue from the next required step.
        const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
        if (user && profile && isAuthPage) {
            const dashboardRoute = ROLE_ROUTES[profile.role];
            router.replace(dashboardRoute || '/student');
            return;
        }

        // Check role-based access
        if (user && profile && !isPublicRoute) {
            if (!canAccessRoute(pathname, profile.role)) {
                router.replace(ROLE_ROUTES[profile.role]);
            }
        }
    }, [user, profile, loading, pathname, router]);

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const isPendingVerification = user && profile?.emailVerified === false
        && !matchesRoute(pathname, '/verify-email')
        && !isAllowedOnboardingPath(pathname, profile.role, profile.onboardingStep);
    const isWrongRole = user && profile && !canAccessRoute(pathname, profile.role)
        && !isPublicPath(pathname);
    const onboardingRedirect = user && profile
        ? onboardingDestination(pathname, profile.role, profile.onboardingStep, profile.onboardingStudentId)
        : null;

    if (isPendingVerification || isWrongRole || onboardingRedirect) {
        return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">جارٍ توجيهك إلى الصفحة المناسبة...</div>;
    }

    return <>{children}</>;
}
