import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

/// Use Case: Login User
/// Single Responsibility — one action per use case
class LoginUser {
  final AuthRepository _repository;

  const LoginUser(this._repository);

  /// Execute login
  Future<UserEntity> call(String email, String password) {
    return _repository.login(email, password);
  }

}
