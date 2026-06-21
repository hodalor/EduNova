import '../../../../shared/services/storage_service.dart';
import '../../data/datasources/auth_remote_datasource.dart';

class LogoutUseCase {
  const LogoutUseCase(this._remoteDataSource, this._storageService);

  final AuthRemoteDataSource _remoteDataSource;
  final StorageService _storageService;

  Future<void> call() async {
    final refreshToken = await _storageService.getRefreshToken();
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _remoteDataSource.logout(refreshToken);
    }
    await _storageService.clearAll();
  }
}
