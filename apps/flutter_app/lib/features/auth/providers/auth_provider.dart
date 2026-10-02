import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exceptions.dart';
import '../../../data/models/user_model.dart';
import '../../../data/repositories_impl/auth_repository_impl.dart';
import '../../../services/storage_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
  });
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _checkAuthStatus();
  }

  final AuthRepositoryImpl _repository = AuthRepositoryImpl();

  Future<void> _checkAuthStatus() async {
    if (!await StorageService.hasTokens()) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    state = const AuthState(status: AuthStatus.loading);
    try {
      final user = UserModel.fromEntity(await _repository.getCurrentUser());
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (error) {
      state = AuthState(
        status: AuthStatus.error,
        errorMessage: _message(error),
      );
    }
  }

  Future<String?> login(String email, String password) async {
    state = const AuthState(status: AuthStatus.loading);
    try {
      final user = UserModel.fromEntity(await _repository.login(email, password));
      state = AuthState(status: AuthStatus.authenticated, user: user);
      return user.role;
    } catch (error) {
      state = AuthState(status: AuthStatus.error, errorMessage: _message(error));
      return null;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    required String role,
  }) async {
    state = const AuthState(status: AuthStatus.loading);
    try {
      final user = UserModel.fromEntity(await _repository.register(
        name: name,
        email: email,
        password: password,
        role: role,
      ));
      state = AuthState(status: AuthStatus.authenticated, user: user);
      return true;
    } catch (error) {
      state = AuthState(status: AuthStatus.error, errorMessage: _message(error));
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  String _message(Object error) {
    if (error is ApiException) return error.message;
    return 'تعذر الاتصال بالنظام. حاول مرة أخرى.';
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
