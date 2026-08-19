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
  void _checkConfigured() {
    if (!kApiBaseUrlConfigured) {
      throw ApiException(
        'API_BASE_URL is not set. Run the app with:\n'
        'flutter run --dart-define=API_BASE_URL=https://parking-management-9icp.onrender.com',
      );
    }
  }

  Future<Map<String, String>> _headers({bool json = true}) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw ApiException('Not signed in.');
    // Force a fresh token on every request rather than trusting the cached
    // one — cheap, and avoids intermittent "Invalid or expired token"
    // errors from the backend when a cached token is close to expiry.
    final token = await user.getIdToken(true);
    return {
      'Authorization': 'Bearer $token',
      if (json) 'Content-Type': 'application/json',
    };
  }

  dynamic _handle(http.Response res, String method, Uri url) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(res.body);
    }
    String message = 'Request failed ($method ${url.path} → ${res.statusCode})';
    try {
      final body = jsonDecode(res.body);
      if (body['error'] != null) {
        message =
            body['error'] is String ? body['error'] : jsonEncode(body['error']);
      }
    } catch (_) {
      // Response wasn't JSON (e.g. a plain 404/502 HTML page) — this usually
      // means the request hit the wrong host entirely. Keep the message
      // above, which already includes the exact URL that was called, so
      // it's easy to spot a wrong API_BASE_URL at a glance.
    }
    throw ApiException(message);
  }

  Future<dynamic> get(String path) async {
    _checkConfigured();
    final url = Uri.parse('$kApiBaseUrl$path');
    final res = await http.get(url, headers: await _headers());
    return _handle(res, 'GET', url);
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    _checkConfigured();
    final url = Uri.parse('$kApiBaseUrl$path');
    final res = await http.post(
      url,
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res, 'POST', url);
  }

  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    _checkConfigured();
    final url = Uri.parse('$kApiBaseUrl$path');
    final res = await http.put(
      url,
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handle(res, 'PUT', url);
  }
}
