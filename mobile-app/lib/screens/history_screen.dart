import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/parking_session.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import '../widgets/session_card.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<ParkingSession> _sessions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final data = await context.read<ApiService>().get('/api/sessions');
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
              const Text('History', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('Recent entries and exits for your lot.', style: TextStyle(color: Colors.black.withOpacity(0.5))),
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
                  child: Center(child: Text('No sessions yet.', style: TextStyle(color: Colors.black.withOpacity(0.4)))),
                ),
              ..._sessions.map((s) => SessionCard(session: s)),
            ],
          ),
        ),
      ),
    );
  }
}
