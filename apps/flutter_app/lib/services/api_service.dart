import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import 'storage_service.dart';

/// API Service — Dio HTTP client with auth interceptors
/// Moved from core/network/api_client.dart to services layer
class ApiService {
  static Dio? _dio;

  static Dio get instance {
    _dio ??= _createDio();
    return _dio!;
  }

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        sendTimeout: ApiConstants.sendTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.addAll([
      _AuthInterceptor(),
      _LoggingInterceptor(),
    ]);

    return dio;
  }

  /// Reset the client (after logout)
  static void reset() {
    _dio?.close();
    _dio = null;
  }
}

/// Auth Interceptor — injects JWT, handles 401 refresh
class _AuthInterceptor extends Interceptor {
  bool _isRefreshing = false;

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final noAuthEndpoints = [
      ApiConstants.login,
      ApiConstants.mobileLogin,
      ApiConstants.register,
      ApiConstants.forgotPassword,
      ApiConstants.refreshToken,
      ApiConstants.mobileLogout,
    ];

    if (!noAuthEndpoints.any((e) => options.path.contains(e))) {
      final token = await StorageService.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken = await StorageService.getRefreshToken();
        if (refreshToken != null) {
          final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
          final response = await dio.post(
            ApiConstants.refreshToken,
            data: {'refresh_token': refreshToken},
          );

          if (response.statusCode == 200 || response.statusCode == 201) {
            final newToken = response.data['access_token'];
            await StorageService.saveAccessToken(newToken);
            final rotatedRefreshToken = response.data['refresh_token'];
            if (rotatedRefreshToken is String &&
                rotatedRefreshToken.isNotEmpty) {
              await StorageService.saveRefreshToken(rotatedRefreshToken);
            }

            err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retryResponse =
                await ApiService.instance.fetch(err.requestOptions);
            _isRefreshing = false;
            return handler.resolve(retryResponse);
          }
        }
      } catch (_) {
        await StorageService.clearAll();
      }
      _isRefreshing = false;
    }
    handler.next(err);
  }
}

/// Logging Interceptor
class _LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('HTTP ${options.method} ${options.path}');
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint(
        'HTTP ${response.statusCode} ${response.requestOptions.path}',
      );
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint(
        'HTTP ${err.response?.statusCode ?? 'network-error'} '
        '${err.requestOptions.path}',
      );
    }
    handler.next(err);
  }
}
