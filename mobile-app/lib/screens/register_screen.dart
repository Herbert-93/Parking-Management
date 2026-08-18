import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../utils/constants.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _lotName = TextEditingController();
  final _lotId = TextEditingController();

  bool _joiningExistingLot = false;
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthService>().register(
            name: _name.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
            lotId: _joiningExistingLot ? _lotId.text.trim() : null,
            lotName: _joiningExistingLot ? null : _lotName.text.trim(),
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kNight,
      appBar: AppBar(backgroundColor: kNight, elevation: 0, iconTheme: const IconThemeData(color: Colors.white)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Create account', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('Set up your lot, or join one your owner already created.',
                    style: TextStyle(color: Colors.white.withOpacity(0.5))),
                const SizedBox(height: 24),
                if (_error != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: kAlert.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                    child: Text(_error!, style: const TextStyle(color: kAlert, fontSize: 13)),
                  ),
                _field(_name, 'Full name'),
                const SizedBox(height: 14),
                _field(_email, 'Email', keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 14),
                _field(_password, 'Password (min 6 characters)', obscure: true),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: _toggleChip('Create new lot (owner)', !_joiningExistingLot, () => setState(() => _joiningExistingLot = false)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _toggleChip('Join existing lot', _joiningExistingLot, () => setState(() => _joiningExistingLot = true)),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (!_joiningExistingLot)
                  _field(_lotName, 'Parking lot name', required: false)
                else
                  _field(_lotId, 'Lot ID (ask your owner for this)'),
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
                        : const Text('Create account', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _toggleChip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? kSignal.withOpacity(0.15) : const Color(0xFF1A2129),
          border: Border.all(color: selected ? kSignal : Colors.transparent),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(label,
            textAlign: TextAlign.center,
            style: TextStyle(color: selected ? kSignal : Colors.white.withOpacity(0.6), fontSize: 12, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _field(TextEditingController controller, String label,
      {bool obscure = false, TextInputType? keyboardType, bool required = true}) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      validator: (v) => (required && (v == null || v.isEmpty)) ? 'Required' : null,
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
