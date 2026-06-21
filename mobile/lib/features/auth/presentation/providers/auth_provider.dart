import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/dio_client.dart';
import '../../../../shared/services/notification_service.dart';
import '../../../../shared/services/storage_service.dart';
import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/models/auth_model.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/refresh_token_usecase.dart';

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(
    baseUrl: const String.fromEnvironment(
      'EDUOVA_API_BASE_URL',
      defaultValue: 'http://localhost:5000/api',
    ),
    storageService: ref.watch(storageServiceProvider),
    onUnauthorized: () {
      ref.invalidate(authProvider);
    },
  );
});

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSource(ref.watch(dioClientProvider));
});

final loginUseCaseProvider = Provider<LoginUseCase>((ref) {
  return LoginUseCase(ref.watch(authRemoteDataSourceProvider));
});

final logoutUseCaseProvider = Provider<LogoutUseCase>((ref) {
  return LogoutUseCase(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(storageServiceProvider),
  );
});

final refreshTokenUseCaseProvider = Provider<RefreshTokenUseCase>((ref) {
  return RefreshTokenUseCase(ref.watch(authRemoteDataSourceProvider));
});

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(dioClient: ref.watch(dioClientProvider));
});

class AuthController extends AsyncNotifier<AuthModel?> {
  @override
  Future<AuthModel?> build() async {
    final storage = ref.watch(storageServiceProvider);
    final storedUser = await storage.getUserProfile();
    if (storedUser == null) {
      return null;
    }

    try {
      return AuthModel.fromJson(storedUser);
    } catch (error) {
      debugPrint('Failed to restore auth session: $error');
      return null;
    }
  }

  Future<void> login({
    required String institutionCode,
    required String identity,
    required String password,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final result = await ref.read(loginUseCaseProvider)(
            institutionCode: institutionCode,
            identity: identity,
            password: password,
          );
      final storage = ref.read(storageServiceProvider);
      await storage.saveTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );
      await storage.saveUserProfile(result.toJson());
      await ref.read(notificationServiceProvider).syncDeviceToken();
      return result;
    });
  }

  Future<void> refreshSession() async {
    final refreshToken =
        await ref.read(storageServiceProvider).getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      state = const AsyncData(null);
      return;
    }

    state = await AsyncValue.guard(() async {
      final result = await ref.read(refreshTokenUseCaseProvider)(refreshToken);
      final storage = ref.read(storageServiceProvider);
      await storage.saveTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );
      await storage.saveUserProfile(result.toJson());
      return result;
    });
  }

  Future<void> logout() async {
    state = const AsyncLoading();
    await ref.read(logoutUseCaseProvider)();
    state = const AsyncData(null);
  }
}

final authProvider =
    AsyncNotifierProvider<AuthController, AuthModel?>(AuthController.new);
