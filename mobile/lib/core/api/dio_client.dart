import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

import '../../features/auth/data/models/auth_model.dart';
import '../../shared/services/storage_service.dart';

class DioClient {
  DioClient({
    required this.baseUrl,
    required this.storageService,
    this.onUnauthorized,
  }) : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 30),
            receiveTimeout: const Duration(seconds: 30),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    _setupInterceptors();
  }

  final String baseUrl;
  final StorageService storageService;
  final VoidCallback? onUnauthorized;
  final Dio dio;

  bool _isRefreshing = false;

  void _setupInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storageService.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.path != '/auth/refresh' &&
              !_isRefreshing) {
            _isRefreshing = true;
            try {
              final refreshed = await _refreshTokens();
              final requestOptions = error.requestOptions;
              requestOptions.headers['Authorization'] =
                  'Bearer ${refreshed.tokens.accessToken}';

              final response = await dio.fetch<dynamic>(requestOptions);
              handler.resolve(response);
              return;
            } catch (_) {
              await storageService.clearAll();
              onUnauthorized?.call();
            } finally {
              _isRefreshing = false;
            }
          }

          handler.next(error);
        },
      ),
    );

    if (kDebugMode) {
      dio.interceptors.add(
        PrettyDioLogger(
          requestHeader: true,
          requestBody: true,
          responseBody: true,
          responseHeader: false,
        ),
      );
    }
  }

  Future<AuthModel> _refreshTokens() async {
    final refreshToken = await storageService.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw DioException(
        requestOptions: RequestOptions(path: '/auth/refresh'),
        error: 'Missing refresh token',
      );
    }

    final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
    final response = await refreshDio.post<dynamic>(
      '/auth/refresh',
      data: {'refresh_token': refreshToken},
    );
    final authModel = AuthModel.fromJson(response.data as Map<String, dynamic>);
    await storageService.saveTokens(
      authModel.tokens.accessToken,
      authModel.tokens.refreshToken,
    );
    await storageService.saveUserProfile(authModel.toJson());
    return authModel;
  }
}
