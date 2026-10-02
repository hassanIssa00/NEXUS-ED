import 'package:dio/dio.dart';
import '../../core/constants/api_constants.dart';
import '../../core/errors/app_exceptions.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart' as domain;
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../models/user_model.dart';

/// Concrete implementation of AuthRepository (Data Layer)
/// Implements the domain contract using API + Storage services
class AuthRepositoryImpl implements domain.AuthRepository {
  final Dio _dio = ApiService.instance;

  @override
  Future<UserEntity> login(String email, String password) async {
    try {
      final response = await _dio.post(
        ApiConstants.mobileLogin,
        data: {'email': email.trim().toLowerCase(), 'password': password},
      );

      final data = response.data;

      // Save tokens
      await StorageService.saveAccessToken(data['access_token']);
      if (data['refresh_token'] != null) {
        await StorageService.saveRefreshToken(data['refresh_token']);
      }

      // Build user model
      final user = UserModel(
        id: data['user']['id'],
        email: data['user']['email'],
        name: data['user']['name'] ?? data['user']['email'].split('@')[0],
        role: (data['user']['role'] ?? 'student').toString().toLowerCase(),
      );

      // Save user info
      await StorageService.saveUserId(user.id);
      await StorageService.saveUserRole(user.role);

      return user;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  @override
  Future<UserEntity> register({
    required String name,
    required String email,
    required String password,
    required String role,
  }) async {
    try {
      await _dio.post(
        ApiConstants.register,
        data: {
          'name': name,
          'email': email.trim().toLowerCase(),
          'password': password,
          'role': role.toUpperCase(),
        },
      );
      return login(email, password);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  @override
  Future<void> logout() async {
    final refreshToken = await StorageService.getRefreshToken();
    if (refreshToken != null) {
      try {
        await _dio.post(ApiConstants.mobileLogout, data: {'refresh_token': refreshToken});
      } catch (_) {
        // Local credentials are cleared even when the server cannot be reached.
      }
    }
    await StorageService.clearAll();
    ApiService.reset();
  }

  @override
  Future<bool> isLoggedIn() async {
    return await StorageService.hasTokens();
  }

  @override
  Future<UserEntity> getCurrentUser() async {
    try {
      final response = await _dio.get(ApiConstants.userProfile);
      return UserModel.fromJson(response.data);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  @override
  Future<String?> getSavedRole() async {
    return await StorageService.getUserRole();
  }

  /// Map DioException to domain ApiException
  ApiException _mapDioError(DioException error) {
    String message;
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        message = 'انتهت مهلة الاتصال. تحقق من اتصالك بالإنترنت.';
        break;
      case DioExceptionType.sendTimeout:
        message = 'انتهت مهلة إرسال الطلب.';
        break;
      case DioExceptionType.receiveTimeout:
        message = 'انتهت مهلة استقبال الرد.';
        break;
      case DioExceptionType.badResponse:
        message = _handleBadResponse(error.response);
        break;
      case DioExceptionType.cancel:
        message = 'تم إلغاء الطلب.';
        break;
      case DioExceptionType.connectionError:
        message = 'لا يوجد اتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';
        break;
      default:
        message = 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    }
    return ApiException(message: message, statusCode: error.response?.statusCode, data: error.response?.data);
  }

  String _handleBadResponse(Response? response) {
    if (response == null) return 'حدث خطأ غير متوقع.';
    switch (response.statusCode) {
      case 400: return response.data?['message'] ?? 'طلب غير صالح.';
      case 401: return 'غير مصرح. الرجاء تسجيل الدخول مرة أخرى.';
      case 403: return 'ليس لديك صلاحية للوصول لهذا المورد.';
      case 404: return 'المورد المطلوب غير موجود.';
      case 409: return response.data?['message'] ?? 'تعارض في البيانات.';
      case 422: return response.data?['message'] ?? 'بيانات غير صالحة.';
      case 500: return 'خطأ في الخادم. حاول مرة أخرى لاحقاً.';
      default: return 'حدث خطأ غير متوقع (${response.statusCode}).';
    }
  }
}
