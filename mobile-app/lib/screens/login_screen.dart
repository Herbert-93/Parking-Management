import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../utils/constants.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthService>().signIn(_email.text.trim(), _password.text);
    } catch (e) {
      setState(() => _error = _friendlyError(e.toString()));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _friendlyError(String raw) {
    if (raw.contains('invalid-credential') || raw.contains('wrong-password')) {
      return 'Wrong email or password.';
    }
    if (raw.contains('user-not-found')) return 'No account found for that email.';
    return raw.replaceFirst('Exception: ', '');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kNight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(color: kSignal, borderRadius: BorderRadius.circular(14)),
                    alignment: Alignment.center,
                    child: const Text('P', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: kInk)),
                  ),
                  const SizedBox(height: 16),
                  const Text('Parking Manager',
                      style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('Sign in to log cars in and out', style: TextStyle(color: Colors.white.withOpacity(0.5))),
                  const SizedBox(height: 32),
                  if (_error != null)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: kAlert.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(_error!, style: const TextStyle(color: kAlert, fontSize: 13)),
                    ),
                  _field(_email, 'Email', keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 14),
                  _field(_password, 'Password', obscure: true),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _busy ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kSignal,
                        foregroundColor: kInk,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _busy
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Sign in', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                    ),
                    child: Text("New here? Create an account",
                        style: TextStyle(color: kSignal.withOpacity(0.9))),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController controller, String label,
      {bool obscure = false, TextInputType? keyboardType}) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
        filled: true,
        fillColor: const Color(0xFF1A2129),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      ),
    );
  }
}
