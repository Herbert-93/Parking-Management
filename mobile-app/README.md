# Parking Manager — Flutter mobile app

Attendant-facing app: log a car in (photo + plate + duration/rate), see
currently parked cars, log a car out and see the final cost.

This folder contains only the `lib/` source and `pubspec.yaml`. Platform
folders (`android/`, `ios/`) are generated locally by running `flutter
create .` — see `docs/SETUP_GUIDE.md` in the project root for the full,
ordered walkthrough. The notes below are the platform-specific tweaks
you must make **after** that scaffolding step.

## Android — camera & internet permissions

After `flutter create .`, open `android/app/src/main/AndroidManifest.xml`
and add these lines inside the `<manifest>` tag, above `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Also set `minSdkVersion` to at least 21 in `android/app/build.gradle`
(`defaultConfig { minSdkVersion 21 ... }`) — required by `firebase_auth`.

## iOS — camera permission

Open `ios/Runner/Info.plist` and add:

```xml
<key>NSCameraUsageDescription</key>
<string>Parking Manager needs your camera to photograph cars at entry.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Parking Manager needs photo library access to attach car photos.</string>
```

## Changing the backend URL

`lib/utils/constants.dart` reads `kApiBaseUrl` from a compile-time
`--dart-define`, defaulting to the Render URL placeholder. Run/build with:

```bash
flutter run --dart-define=API_BASE_URL=https://your-backend.onrender.com
```

or just edit the `defaultValue` in `constants.dart` directly.
