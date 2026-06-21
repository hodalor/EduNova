import '../../../../core/api/dio_client.dart';
import '../models/auth_model.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource(this._dioClient);

  final DioClient _dioClient;

  Future<AuthModel> login({
    required String institutionCode,
    required String identity,
    required String password,
  }) async {
    final response = await _dioClient.dio.post(
      '/auth/login',
      data: {
        'institution_code': institutionCode,
        'identity': identity,
        'password': password,
      },
    );

    return AuthModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> logout(String refreshToken) async {
    await _dioClient.dio.post(
      '/auth/logout',
      data: {'refresh_token': refreshToken},
    );
  }

  Future<void> forgotPassword({
    required String institutionCode,
    required String email,
  }) async {
    await _dioClient.dio.post(
      '/auth/forgot-password',
      data: {
        'institution_code': institutionCode,
        'email': email,
      },
    );
  }

  Future<AuthModel> refreshToken(String refreshToken) async {
    final response = await _dioClient.dio.post(
      '/auth/refresh',
      data: {'refresh_token': refreshToken},
    );

    return AuthModel.fromJson(response.data as Map<String, dynamic>);
  }
}
