import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/models/auth_model.dart';

class RefreshTokenUseCase {
  const RefreshTokenUseCase(this._remoteDataSource);

  final AuthRemoteDataSource _remoteDataSource;

  Future<AuthModel> call(String refreshToken) {
    return _remoteDataSource.refreshToken(refreshToken);
  }
}
