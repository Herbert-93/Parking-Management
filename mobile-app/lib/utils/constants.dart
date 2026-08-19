import 'package:flutter/material.dart';

/// Base URL of the deployed backend (Render).
///
/// Hardcoded as the default here so `flutter run` from VS Code just works
/// without needing to remember a --dart-define flag every time. You can
/// still override it at launch time if you ever need to point at a
/// different backend (e.g. local testing) — see the notes below.
///
/// For local testing against `npm run dev` instead of Render:
///   - Android emulator: http://10.0.2.2:4000
///   - iOS simulator / web/desktop: http://localhost:4000
///   - Physical phone via USB: http://YOUR_COMPUTER_LAN_IP:4000
///     (phone and computer must be on the same Wi-Fi network)
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://parking-management-9icp.onrender.com',
);

const bool kApiBaseUrlConfigured = kApiBaseUrl != '';

// Palette matching the admin panel's "ops dashboard" identity.
const Color kNight = Color(0xFF10151C);
const Color kSignal = Color(0xFFE7AB3C);
const Color kClear = Color(0xFF2F9E6E);
const Color kAlert = Color(0xFFC1483F);
const Color kSlab = Color(0xFFF5F3EE);
const Color kInk = Color(0xFF12161C);
