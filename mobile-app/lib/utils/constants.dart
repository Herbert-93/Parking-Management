import 'package:flutter/material.dart';

/// Base URL of the deployed backend (Render), e.g.
/// https://parking-backend-xxxx.onrender.com  (NO trailing slash).
///
/// This is intentionally left EMPTY by default — if you forget to pass it
/// in, the app will show a loud, unmistakable error instead of silently
/// hitting a placeholder domain and giving you confusing 404s everywhere.
///
/// Always run with:
///   flutter run -d chrome --dart-define=API_BASE_URL=https://YOUR-BACKEND.onrender.com
/// (swap `-d chrome` for your target device/emulator as needed)
///
/// For local testing against `npm run dev` instead of Render:
///   - Android emulator: http://10.0.2.2:4000
///   - iOS simulator / web/desktop: http://localhost:4000
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: '',
);

const bool kApiBaseUrlConfigured = kApiBaseUrl != '';

// Palette matching the admin panel's "ops dashboard" identity.
const Color kNight = Color(0xFF10151C);
const Color kSignal = Color(0xFFE7AB3C);
const Color kClear = Color(0xFF2F9E6E);
const Color kAlert = Color(0xFFC1483F);
const Color kSlab = Color(0xFFF5F3EE);
const Color kInk = Color(0xFF12161C);
