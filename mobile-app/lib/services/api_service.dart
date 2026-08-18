import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

/// Thin wrapper around http calls to the backend that automatically
/// attaches the signed-in user's Firebase ID token as a Bearer token.
class ApiService {
  Future<Map<String, String>> _headers({bool json = true}) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw ApiException('Not signed in.');
    final token = await user.getIdToken();
    return {
      'Authorization': 'Bearer $token',
      if (json) 'Content-Type': 'application/json',
    };
  }

  dynamic _handle(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(res.body);
    }
    String message = 'Request failed (${res.statusCode})';
    try {
      final body = jsonDecode(res.body);
      if (body['error'] != null) message = body['error'].toString();
    } catch (_) {}
    throw ApiException(message);
  }

  Future<dynamic> get(String path) async {
    final res = await http.get(Uri.parse('$kApiBaseUrl$path'), headers: await _headers());
    return _handle(res);
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await http.post(
      Uri.parse('$kApiBaseUrl$path'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }

  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    final res = await http.put(
      Uri.parse('$kApiBaseUrl$path'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res);
  }
}
