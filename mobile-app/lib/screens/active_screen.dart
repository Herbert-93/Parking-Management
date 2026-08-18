import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/parking_session.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import '../widgets/session_card.dart';

class ActiveScreen extends StatefulWidget {
  const ActiveScreen({super.key});

  @override
  State<ActiveScreen> createState() => _ActiveScreenState();
}

class _ActiveScreenState extends State<ActiveScreen> {
  List<ParkingSession> _sessions = [];
  bool _loading = true;
  String? _error;
  String? _exitingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final data = await context.read<ApiService>().get('/api/sessions/active');
      final sessions = (data['sessions'] as List).map((s) => ParkingSession.fromJson(s)).toList();
      setState(() {
        _sessions = sessions;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _logOut(ParkingSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Log out ${session.plateNumber}?'),
        content: const Text('This calculates the final amount owed and marks the car as exited.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Log out')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _exitingId = session.id);
    try {
      await context.read<ApiService>().post('/api/sessions/${session.id}/exit');
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _exitingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSlab,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text('Currently parked', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${_sessions.length} car(s) in the lot right now.',
                  style: TextStyle(color: Colors.black.withOpacity(0.5))),
              const SizedBox(height: 16),
              if (_loading) const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: kAlert.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(_error!, style: const TextStyle(color: kAlert)),
                ),
              if (!_loading && _sessions.isEmpty && _error == null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: Text('No cars parked right now.', style: TextStyle(color: Colors.black.withOpacity(0.4))),
                  ),
                ),
              ..._sessions.map((s) => SessionCard(
                    session: s,
                    busy: _exitingId == s.id,
                    onLogout: () => _logOut(s),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}
