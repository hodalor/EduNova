import '../../domain/entities/user_entity.dart';

class InstitutionModel {
  const InstitutionModel({
    required this.id,
    required this.name,
    required this.code,
    this.logoUrl,
  });

  final String id;
  final String name;
  final String code;
  final String? logoUrl;

  factory InstitutionModel.fromJson(Map<String, dynamic> json) {
    return InstitutionModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      logoUrl: json['logo_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'logo_url': logoUrl,
      };
}

class AuthTokensModel {
  const AuthTokensModel({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  factory AuthTokensModel.fromJson(Map<String, dynamic> json) {
    return AuthTokensModel(
      accessToken: json['access_token'] as String? ?? '',
      refreshToken: json['refresh_token'] as String? ?? '',
      expiresIn: json['expires_in'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'access_token': accessToken,
        'refresh_token': refreshToken,
        'expires_in': expiresIn,
      };
}

class AuthModel {
  const AuthModel({
    required this.user,
    required this.institution,
    required this.permissions,
    required this.tokens,
  });

  final UserEntity user;
  final InstitutionModel institution;
  final List<String> permissions;
  final AuthTokensModel tokens;

  factory AuthModel.fromJson(Map<String, dynamic> json) {
    final payload = (json['data'] as Map<String, dynamic>?) ?? json;
    final userJson = payload['user'] as Map<String, dynamic>? ?? {};

    return AuthModel(
      user: UserEntity(
        id: userJson['id'] as String? ?? '',
        email: userJson['email'] as String? ?? '',
        firstName: userJson['first_name'] as String? ?? '',
        lastName: userJson['last_name'] as String? ?? '',
        role: userJson['role'] as String? ?? '',
        institutionId: userJson['institution_id'] as String? ?? '',
        phone: userJson['phone'] as String?,
        profilePhoto: userJson['profile_photo'] as String?,
      ),
      institution: InstitutionModel.fromJson(
        payload['institution'] as Map<String, dynamic>? ?? {},
      ),
      permissions: ((payload['permissions'] as List<dynamic>?) ?? [])
          .map((item) => item.toString())
          .toList(),
      tokens: AuthTokensModel.fromJson(
        payload['tokens'] as Map<String, dynamic>? ?? {},
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'user': {
          'id': user.id,
          'email': user.email,
          'first_name': user.firstName,
          'last_name': user.lastName,
          'role': user.role,
          'institution_id': user.institutionId,
          'phone': user.phone,
          'profile_photo': user.profilePhoto,
        },
        'institution': institution.toJson(),
        'permissions': permissions,
        'tokens': tokens.toJson(),
      };
}
