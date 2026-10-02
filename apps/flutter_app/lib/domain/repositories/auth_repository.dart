import '../entities/user_entity.dart';

/// Abstract Auth Repository contract (Domain Layer)
/// The Data Layer provides the concrete implementation
abstract class AuthRepository {
  /// Login with email and password
  Future<UserEntity> login(String email, String password);

  /// Register a new user
  Future<UserEntity> register({
    required String name,
    required String email,
    required String password,
    required String role,
  });

  /// Logout and clear session
  Future<void> logout();

  /// Check if user is currently authenticated
  Future<bool> isLoggedIn();

  /// Get current user profile
  Future<UserEntity> getCurrentUser();

  /// Get saved user role (for routing after restart)
  Future<String?> getSavedRole();
}
