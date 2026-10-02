/// Route name constants — Full Navigation System
class RouteNames {
  RouteNames._();

  // Auth
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';

  // Student — Main Tabs
  static const String studentDashboard = '/student';
  static const String studentProfileSetup = '/student/setup';
  static const String studentAssessment = '/student/assessment';
  static const String studentSubjects = '/student/subjects';
  static const String studentAiTutor = '/student/ai-tutor';
  static const String studentLeaderboard = '/student/leaderboard';
  static const String studentProfile = '/student/profile';

  // Student — Sub Screens
  static const String studentLessons = '/student/lessons';
  static const String studentAssignments = '/student/assignments';
  static const String studentGrades = '/student/grades';
  static const String studentAttendance = '/student/attendance';
  static const String studentSchedule = '/student/schedule';
  static const String studentGames = '/student/games';
  static const String studentMillionJourney = '/student/million-journey';
  static const String studentMessages = '/student/messages';
  static const String studentSettings = '/student/settings';
  static const String studentNotifications = '/student/notifications';
  static const String studentAchievements = '/student/achievements';
  static const String studentAnalytics = '/student/analytics';
  static const String studentSubscription = '/student/subscription';

  // Teacher
  static const String teacherDashboard = '/teacher';
  static const String teacherClasses = '/teacher/classes';
  static const String teacherLessons = '/teacher/lessons';
  static const String teacherAssignments = '/teacher/assignments';
  static const String teacherAttendance = '/teacher/attendance';
  static const String teacherGrading = '/teacher/grading';
  static const String teacherNotifications = '/teacher/notifications';
  static const String teacherSettings = '/teacher/settings';

  // Parent
  static const String parentDashboard = '/parent';
  static const String parentSurvey = '/parent/survey/:studentId';
  static const String parentChildProgress = '/parent/child-progress';
  static const String parentPayments = '/parent/payments';
  static const String parentNotifications = '/parent/notifications';
  static const String parentSettings = '/parent/settings';

  // Admin
  static const String adminDashboard = '/admin';
  static const String adminUsers = '/admin/users';
  static const String adminClasses = '/admin/classes';
  static const String adminSubjects = '/admin/subjects';
  static const String adminContent = '/admin/content';
  static const String adminEnrollments = '/admin/enrollments';
  static const String adminGames = '/admin/games';
  static const String adminPermissions = '/admin/permissions';
  static const String adminSettings = '/admin/settings';
}
