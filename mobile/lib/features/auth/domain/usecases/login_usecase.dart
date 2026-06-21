import '../../data/datasources/auth_remote_datasource.dart';
import '../../data/models/auth_model.dart';

class LoginUseCase {
  const LoginUseCase(this._remoteDataSource);

  final AuthRemoteDataSource _remoteDataSource;

  Future<AuthModel> call({
    required String institutionCode,
    required String identity,
    required String password,
  }) {
    return _remoteDataSource.login(
      institutionCode: institutionCode,
      identity: identity,
      password: password,
    );
  }
}
