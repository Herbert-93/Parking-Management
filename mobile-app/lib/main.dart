import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'firebase_options.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'utils/constants.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const ParkingApp());
}

class ParkingApp extends StatelessWidget {
  const ParkingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService()),
        ChangeNotifierProvider<AuthService>(
          create: (ctx) => AuthService(ctx.read<ApiService>()),
        ),
      ],
      child: MaterialApp(
        title: 'Parking Manager',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorSchemeSeed: kSignal,
          scaffoldBackgroundColor: kSlab,
          fontFamily: 'Roboto',
        ),
        home: const _AuthGate(),
      ),
    );
  }
}

/// Shows the login screen while signed out, and the main app once
/// Firebase Auth reports a signed-in user with a loaded profile.
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (auth.loading) {
      return const Scaffold(
        backgroundColor: kNight,
        body: Center(child: CircularProgressIndicator(color: kSignal)),
      );
    }

    if (!auth.isSignedIn) return const LoginScreen();

    return const HomeScreen();
  }
}
