import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Wraps Firebase Auth and keeps the app's notion of the current user
/// in sync, exposing simple sign-in / register / sign-out methods.
class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final ApiService api;

  User? _user;
  Map<String, dynamic>? profile; // users/{uid} document from the backend
  bool loading = true;

  AuthService(this.api) {
    _auth.authStateChanges().listen(_onAuthChanged);
  }

  User? get user => _user;
  bool get isSignedIn => _user != null;

  Future<void> _onAuthChanged(User? user) async {
    _user = user;
    if (user != null) {
      await loadProfile();
    } else {
      profile = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loadProfile() async {
    try {
      final data = await api.get('/api/auth/me');
      profile = data['profile'];
    } catch (e) {
      profile = null;
    }
    notifyListeners();
  }

  /// Signs an existing manager in.
  Future<void> signIn(String email, String password) async {
    await _auth.signInWithEmailAndPassword(email: email, password: password);
    await loadProfile();
  }

  /// Creates a brand-new Firebase Auth account, then registers the app
  /// profile with the backend. If [lotId] is provided the new user joins
  /// an existing lot as a manager; otherwise they become the lot's owner.
  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? lotId,
    String? lotName,
  }) async {
    await _auth.createUserWithEmailAndPassword(email: email, password: password);
    await api.post('/api/auth/register-profile', {
      'name': name,
      if (lotId != null) 'lotId': lotId,
      if (lotName != null) 'lotName': lotName,
    });
    await loadProfile();
  }

  Future<void> signOut() => _auth.signOut();

  Future<String?> idToken() => _user?.getIdToken() ?? Future.value(null);
}
