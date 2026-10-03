/// API Constants for Nexus EDU
class ApiConstants {
  ApiConstants._();

  // ═══════════════════════════════════════════
  // BASE URL
  // ═══════════════════════════════════════════
  // Override for production/device builds with --dart-define=NEXUS_API_URL=...
  static const String baseUrl = String.fromEnvironment(
    'NEXUS_API_URL',
    defaultValue: 'http://10.0.2.2:4000/api',
  );

  static bool get hasProductionBaseUrl => isSafeProductionBaseUrl(baseUrl);

  static bool isSafeProductionBaseUrl(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      return false;
    }

    final host = uri.host.toLowerCase();
    if (host == 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host.contains(':')) {
      return false;
    }

    final octets = host.split('.');
    if (octets.length == 4) {
      final address = octets.map(int.tryParse).toList();
      if (address.any((part) => part == null || part < 0 || part > 255)) {
        return false;
      }

      final first = address[0]!;
      final second = address[1]!;
      if (first == 0 ||
          first == 10 ||
          first == 127 ||
          (first == 169 && second == 254) ||
          (first == 172 && second >= 16 && second <= 31) ||
          (first == 192 && second == 168) ||
          first >= 224) {
        return false;
      }
    }

    return true;
  }

  // ═══════════════════════════════════════════
  // AUTH ENDPOINTS
  // ═══════════════════════════════════════════
  static const String login = '/auth/login';
  static const String mobileLogin = '/auth/mobile/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/mobile/refresh';
  static const String mobileLogout = '/auth/mobile/logout';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // ═══════════════════════════════════════════
  // USER ENDPOINTS
  // ═══════════════════════════════════════════
  static const String userProfile = '/users/me';
  static const String updateProfile = '/users';
  static const String uploadAvatar = '/upload';

  // ═══════════════════════════════════════════
  // CLASS ENDPOINTS
  // ═══════════════════════════════════════════
  static const String classes = '/classes';

  // ═══════════════════════════════════════════
  // SUBJECT ENDPOINTS
  // ═══════════════════════════════════════════
  static const String subjects = '/subjects';

  // ═══════════════════════════════════════════
  // LESSON ENDPOINTS
  // ═══════════════════════════════════════════
  static const String lessons = '/lessons';

  // ═══════════════════════════════════════════
  // ASSIGNMENT ENDPOINTS
  // ═══════════════════════════════════════════
  static const String assignments = '/assignments';

  // ═══════════════════════════════════════════
  // GRADE ENDPOINTS
  // ═══════════════════════════════════════════
  static const String grades = '/grades';

  // ═══════════════════════════════════════════
  // ATTENDANCE ENDPOINTS
  // ═══════════════════════════════════════════
  static const String attendance = '/attendance';
  static const String qrAttendance = '/qr-attendance/scan';

  // ═══════════════════════════════════════════
  // CHAT ENDPOINTS
  // ═══════════════════════════════════════════
  static const String chat = '/chat';
  static const String chatMessages = '/chat/messages';

  // ═══════════════════════════════════════════
  // AI ENDPOINTS
  // ═══════════════════════════════════════════
  static const String aiChat = '/ai/chat';
  static const String aiRecommendations = '/ai/recommendations';

  // ═══════════════════════════════════════════
  // NOTIFICATION ENDPOINTS
  // ═══════════════════════════════════════════
  static const String notifications = '/notifications';
  static const String registerDevice = '/notifications/register-device';

  // ═══════════════════════════════════════════
  // PAYMENT ENDPOINTS
  // ═══════════════════════════════════════════
  static const String payment = '/payment';
  static const String subscribe = '/payment/subscribe';
  static const String paymentStatus = '/payment/status';

  // ═══════════════════════════════════════════
  // GAMIFICATION ENDPOINTS
  // ═══════════════════════════════════════════
  static const String leaderboard = '/gamification/leaderboard';
  static const String badges = '/gamification/badges';
  static const String studentStats = '/gamification/stats';

  // ═══════════════════════════════════════════
  // GAMES ENDPOINTS
  // ═══════════════════════════════════════════
  static const String games = '/games';

  // ═══════════════════════════════════════════
  // REPORTS ENDPOINTS
  // ═══════════════════════════════════════════
  static const String reports = '/reports';

  // ═══════════════════════════════════════════
  // MILLION ENDPOINTS
  // ═══════════════════════════════════════════
  static const String million = '/million';
  static const String millionProgress = '/million/progress';

  // ═══════════════════════════════════════════
  // ANALYTICS ENDPOINTS
  // ═══════════════════════════════════════════
  static const String analytics = '/analytics';

  // ═══════════════════════════════════════════
  // EXAM ENDPOINTS
  // ═══════════════════════════════════════════
  static const String exams = '/exams';

  // ═══════════════════════════════════════════
  // CONTENT ENDPOINTS
  // ═══════════════════════════════════════════
  static const String content = '/content';

  // ═══════════════════════════════════════════
  // ENROLLMENT ENDPOINTS
  // ═══════════════════════════════════════════
  static const String enrollments = '/enrollment';

  // ═══════════════════════════════════════════
  // ADMIN ENDPOINTS
  // ═══════════════════════════════════════════
  static const String admin = '/admin';
  static const String adminUsers = '/admin/users';
  static const String adminStats = '/admin/stats';

  // ═══════════════════════════════════════════
  // TIMEOUTS
  // ═══════════════════════════════════════════
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
}
