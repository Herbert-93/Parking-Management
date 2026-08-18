import 'package:flutter/material.dart';

/// Base URL of the deployed backend (Render). Change this once you have
/// your Render service URL, e.g. https://parking-backend.onrender.com
/// For local testing against `npm run dev`, use:
///   - Android emulator: http://10.0.2.2:4000
///   - iOS simulator / web: http://localhost:4000
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://parking-backend.onrender.com',
);

/// Cloudinary is used for car-photo uploads instead of Firebase Storage
/// (which now requires a paid billing plan to enable at all). Get these
/// two values by creating a free Cloudinary account — see SETUP_GUIDE.md.
const String kCloudinaryCloudName = String.fromEnvironment(
  'CLOUDINARY_CLOUD_NAME',
  defaultValue: 'REPLACE_ME',
);
const String kCloudinaryUploadPreset = String.fromEnvironment(
  'CLOUDINARY_UPLOAD_PRESET',
  defaultValue: 'REPLACE_ME',
);

// Palette matching the admin panel's "ops dashboard" identity.
const Color kNight = Color(0xFF10151C);
const Color kSignal = Color(0xFFE7AB3C);
const Color kClear = Color(0xFF2F9E6E);
const Color kAlert = Color(0xFFC1483F);
const Color kSlab = Color(0xFFF5F3EE);
const Color kInk = Color(0xFF12161C);
