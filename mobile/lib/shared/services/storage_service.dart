import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  StorageService({
    FlutterSecureStorage? secureStorage,
    SharedPreferences? sharedPreferences,
  })  : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _sharedPreferences = sharedPreferences;

  static const String _accessTokenKey = 'eduova.access_token';
  static const String _refreshTokenKey = 'eduova.refresh_token';
  static const String _userProfileKey = 'eduova.user_profile';

  final FlutterSecureStorage _secureStorage;
  SharedPreferences? _sharedPreferences;

  Future<SharedPreferences> get _prefs async =>
      _sharedPreferences ??= await SharedPreferences.getInstance();

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() => _secureStorage.read(key: _accessTokenKey);

  Future<String?> getRefreshToken() => _secureStorage.read(key: _refreshTokenKey);

  Future<void> saveUserProfile(Map<String, dynamic> user) async {
    final prefs = await _prefs;
    await prefs.setString(_userProfileKey, jsonEncode(user));
  }

  Future<Map<String, dynamic>?> getUserProfile() async {
    final prefs = await _prefs;
    final raw = prefs.getString(_userProfileKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clearAll() async {
    final prefs = await _prefs;
    await _secureStorage.deleteAll();
    await prefs.remove(_userProfileKey);
  }
}
