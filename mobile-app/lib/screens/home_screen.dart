import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../utils/constants.dart';
import 'active_screen.dart';
import 'entry_screen.dart';
import 'history_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  final _screens = const [EntryScreen(), ActiveScreen(), HistoryScreen()];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    const titles = ['Log car in', 'Currently parked', 'History'];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_index]),
        backgroundColor: kSlab,
        foregroundColor: kInk,
        elevation: 0,
      ),
      body: _screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: kSignal.withOpacity(0.15),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.add_a_photo_outlined), selectedIcon: Icon(Icons.add_a_photo, color: kSignal), label: 'Log in'),
          NavigationDestination(icon: Icon(Icons.local_parking_outlined), selectedIcon: Icon(Icons.local_parking, color: kSignal), label: 'Parked'),
          NavigationDestination(icon: Icon(Icons.history), selectedIcon: Icon(Icons.history, color: kSignal), label: 'History'),
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(auth.profile?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(auth.profile?['email'] ?? '', style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(auth.profile?['role'] == 'owner' ? 'Owner' : 'Manager',
                        style: TextStyle(color: kSignal, fontWeight: FontWeight.w600, fontSize: 12)),
                  ],
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Sign out'),
                onTap: () => context.read<AuthService>().signOut(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
