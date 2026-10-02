import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/student/screens/student_dashboard.dart';
import '../../features/student/screens/student_profile_setup_screen.dart';
import '../../features/student/screens/placement_assessment_screen.dart';
import '../../features/student/screens/subjects/subjects_screen.dart';
import '../../features/student/screens/assignments/assignments_screen.dart';
import '../../features/student/screens/grades/grades_screen.dart';
import '../../features/student/screens/attendance/attendance_screen.dart';
import '../../features/student/screens/schedule/schedule_screen.dart';
import '../../features/student/screens/leaderboard/leaderboard_screen.dart';
import '../../features/student/screens/games/games_screen.dart';
import '../../features/student/screens/million_journey/million_journey_screen.dart';
import '../../features/student/screens/messages/messages_screen.dart';
import '../../features/student/screens/settings/settings_screen.dart';
import '../../features/student/screens/ai/ai_tutor_screen.dart';
import '../../features/student/screens/profile/profile_screen.dart';
import '../../features/student/screens/notifications/notifications_screen.dart';
import '../../features/student/screens/achievements/achievements_screen.dart';
import '../../features/teacher/screens/teacher_dashboard.dart';
import '../../features/parent/screens/parent_dashboard.dart';
import '../../features/parent/screens/parent_survey_screen.dart';
import '../../features/admin/screens/admin_dashboard.dart';
import '../../shared/widgets/app_scaffold.dart';
import 'route_names.dart';

/// Smooth fade+scale page transition
CustomTransitionPage<void> _buildTransition({
  required Widget child,
  required GoRouterState state,
  Duration duration = const Duration(milliseconds: 400),
}) {
  return CustomTransitionPage(
    key: state.pageKey,
    child: child,
    transitionDuration: duration,
    reverseTransitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return FadeTransition(
        opacity: curvedAnimation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.03),
            end: Offset.zero,
          ).animate(curvedAnimation),
          child: child,
        ),
      );
    },
  );
}

/// Fade-only for splash/onboarding
CustomTransitionPage<void> _buildFadeTransition({
  required Widget child,
  required GoRouterState state,
  Duration duration = const Duration(milliseconds: 600),
}) {
  return CustomTransitionPage(
    key: state.pageKey,
    child: child,
    transitionDuration: duration,
    reverseTransitionDuration: const Duration(milliseconds: 400),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeInOut),
        child: child,
      );
    },
  );
}

final appRouterProvider = Provider<GoRouter>((ref) {
  late final GoRouter router;
  router = GoRouter(
    initialLocation: RouteNames.splash,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final location = state.matchedLocation;
      final isPublicRoute = const {
        RouteNames.splash,
        RouteNames.onboarding,
        RouteNames.login,
        RouteNames.register,
      }.contains(location);

      if (auth.status == AuthStatus.initial || auth.status == AuthStatus.loading) {
        return location == RouteNames.splash ? null : RouteNames.splash;
      }
      if (auth.status == AuthStatus.unauthenticated || auth.status == AuthStatus.error) {
        if (isPublicRoute) return null;
        return auth.status == AuthStatus.unauthenticated
            ? RouteNames.onboarding
            : RouteNames.login;
      }

      final home = switch (auth.user?.role) {
        'student' => RouteNames.studentDashboard,
        'parent' => RouteNames.parentDashboard,
        'teacher' => RouteNames.teacherDashboard,
        'admin' || 'administrator' || 'principal' || 'vice_principal' => RouteNames.adminDashboard,
        _ => null,
      };
      if (home == null) return RouteNames.login;
      if (isPublicRoute) return home;
      if (location.startsWith('/student') && home != RouteNames.studentDashboard) return home;
      if (location.startsWith('/parent') && home != RouteNames.parentDashboard) return home;
      if (location.startsWith('/teacher') && home != RouteNames.teacherDashboard) return home;
      if (location.startsWith('/admin') && home != RouteNames.adminDashboard) return home;
      return null;
    },
    routes: [
      // ═══════════════════════════════════════════
      // AUTH ROUTES
      // ═══════════════════════════════════════════
      GoRoute(
        path: RouteNames.splash,
        name: 'splash',
        pageBuilder: (context, state) => _buildFadeTransition(child: const SplashScreen(), state: state, duration: const Duration(milliseconds: 800)),
      ),
      GoRoute(
        path: RouteNames.onboarding,
        name: 'onboarding',
        pageBuilder: (context, state) => _buildFadeTransition(child: const OnboardingScreen(), state: state),
      ),
      GoRoute(
        path: RouteNames.login,
        name: 'login',
        pageBuilder: (context, state) => _buildTransition(child: const LoginScreen(), state: state),
      ),
      GoRoute(
        path: RouteNames.register,
        name: 'register',
        pageBuilder: (context, state) => _buildTransition(child: const RegisterScreen(), state: state),
      ),

      // ═══════════════════════════════════════════
      // STUDENT ROUTES (ShellRoute with Bottom Nav)
      // ═══════════════════════════════════════════
      ShellRoute(
        builder: (context, state, child) => AppScaffold(
          role: 'student',
          child: child,
        ),
        routes: [
          // Main tabs
          GoRoute(
            path: RouteNames.studentDashboard,
            name: 'studentDashboard',
            pageBuilder: (context, state) => _buildTransition(child: const StudentDashboard(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentProfileSetup,
            name: 'studentProfileSetup',
            pageBuilder: (context, state) => _buildTransition(child: const StudentProfileSetupScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentAssessment,
            name: 'studentAssessment',
            pageBuilder: (context, state) => _buildTransition(child: const PlacementAssessmentScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentSubjects,
            name: 'studentSubjects',
            pageBuilder: (context, state) => _buildTransition(child: const SubjectsScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentAiTutor,
            name: 'studentAiTutor',
            pageBuilder: (context, state) => _buildTransition(child: const AiTutorScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentLeaderboard,
            name: 'studentLeaderboard',
            pageBuilder: (context, state) => _buildTransition(child: const LeaderboardScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentProfile,
            name: 'studentProfile',
            pageBuilder: (context, state) => _buildTransition(child: const ProfileScreen(), state: state),
          ),

          // Sub screens
          GoRoute(
            path: RouteNames.studentAssignments,
            name: 'studentAssignments',
            pageBuilder: (context, state) => _buildTransition(child: const AssignmentsScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentGrades,
            name: 'studentGrades',
            pageBuilder: (context, state) => _buildTransition(child: const GradesScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentAttendance,
            name: 'studentAttendance',
            pageBuilder: (context, state) => _buildTransition(child: const AttendanceScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentSchedule,
            name: 'studentSchedule',
            pageBuilder: (context, state) => _buildTransition(child: const ScheduleScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentGames,
            name: 'studentGames',
            pageBuilder: (context, state) => _buildTransition(child: const GamesScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentMillionJourney,
            name: 'studentMillionJourney',
            pageBuilder: (context, state) => _buildTransition(child: const MillionJourneyScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentMessages,
            name: 'studentMessages',
            pageBuilder: (context, state) => _buildTransition(child: const MessagesScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentSettings,
            name: 'studentSettings',
            pageBuilder: (context, state) => _buildTransition(child: const SettingsScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentNotifications,
            name: 'studentNotifications',
            pageBuilder: (context, state) => _buildTransition(child: const NotificationsScreen(), state: state),
          ),
          GoRoute(
            path: RouteNames.studentAchievements,
            name: 'studentAchievements',
            pageBuilder: (context, state) => _buildTransition(child: const AchievementsScreen(), state: state),
          ),
        ],
      ),

      // ═══════════════════════════════════════════
      // TEACHER ROUTES
      // ═══════════════════════════════════════════
      ShellRoute(
        builder: (context, state, child) => AppScaffold(
          role: 'teacher',
          child: child,
        ),
        routes: [
          GoRoute(
            path: RouteNames.teacherDashboard,
            name: 'teacherDashboard',
            pageBuilder: (context, state) => _buildTransition(child: const TeacherDashboard(), state: state),
          ),
        ],
      ),

      // ═══════════════════════════════════════════
      // PARENT ROUTES
      // ═══════════════════════════════════════════
      ShellRoute(
        builder: (context, state, child) => AppScaffold(
          role: 'parent',
          child: child,
        ),
        routes: [
          GoRoute(
            path: RouteNames.parentDashboard,
            name: 'parentDashboard',
            pageBuilder: (context, state) => _buildTransition(child: const ParentDashboard(), state: state),
          ),
          GoRoute(
            path: RouteNames.parentSurvey,
            name: 'parentSurvey',
            pageBuilder: (context, state) => _buildTransition(
              child: ParentSurveyScreen(studentId: state.pathParameters['studentId'] ?? ''),
              state: state,
            ),
          ),
        ],
      ),

      // ═══════════════════════════════════════════
      // ADMIN ROUTES
      // ═══════════════════════════════════════════
      ShellRoute(
        builder: (context, state, child) => AppScaffold(
          role: 'admin',
          child: child,
        ),
        routes: [
          GoRoute(
            path: RouteNames.adminDashboard,
            name: 'adminDashboard',
            pageBuilder: (context, state) => _buildTransition(child: const AdminDashboard(), state: state),
          ),
        ],
      ),
    ],
  );
  ref.listen<AuthState>(authProvider, (previous, next) => router.refresh());
  return router;
});
