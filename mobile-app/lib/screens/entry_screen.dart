import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

/// Built-in quick-select duration presets. These are hardcoded into the app
/// itself — no owner setup or backend configuration required. Tapping one
/// just fills in the hours field; the attendant can still edit it freely,
/// and always enters the price themselves since it may vary.
const List<double> kDurationPresets = [1, 5, 12, 24];

class EntryScreen extends StatefulWidget {
  const EntryScreen({super.key});

  @override
  State<EntryScreen> createState() => _EntryScreenState();
}

class _EntryScreenState extends State<EntryScreen> {
  final _plateController = TextEditingController();
  final _hoursController = TextEditingController();
  final _priceController = TextEditingController();

  File? _photo;
  bool _capturingPhoto = false;
  bool _submitting = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _plateController.dispose();
    _hoursController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    setState(() {
      _error = null;
      _capturingPhoto = true;
    });
    try {
      final picker = ImagePicker();
      // Kept deliberately small: this photo is stored as a base64 string
      // directly on the Firestore document (no separate file storage), so a
      // small, heavily-compressed thumbnail (usually 15-40KB) is what we
      // want — plenty to identify a car, well under Firestore's 1MB cap.
      final picked = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 35,
        maxWidth: 480,
      );
      if (picked != null) {
        final file = File(picked.path);
        final exists = await file.exists();
        if (!exists) {
          throw Exception('The photo could not be saved. Please try again.');
        }
        setState(() => _photo = file);
      }
      // If picked == null the user simply cancelled — not an error.
    } catch (e) {
      setState(() {
        _error =
            'Could not take photo: ${e.toString().replaceFirst('Exception: ', '')}. '
            'Check that the app has camera permission in your phone settings.';
      });
    } finally {
      if (mounted) setState(() => _capturingPhoto = false);
    }
  }

  /// Reads the captured photo file and returns it as a base64 data URI
  /// (e.g. "data:image/jpeg;base64,...."), or null if no photo was taken.
  Future<String?> _encodePhoto() async {
    if (_photo == null) return null;
    final bytes = await _photo!.readAsBytes();
    return 'data:image/jpeg;base64,${base64Encode(bytes)}';
  }

  double? get _hours => double.tryParse(_hoursController.text.trim());
  double? get _price => double.tryParse(_priceController.text.trim());

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _success = null;
    });

    final plate = _plateController.text.trim();
    if (plate.isEmpty) {
      setState(() => _error = 'Enter the plate number.');
      return;
    }
    final hours = _hours;
    if (hours == null || hours <= 0) {
      setState(
          () => _error = 'Enter how many hours the car is being parked for.');
      return;
    }
    final price = _price;
    if (price == null || price < 0) {
      setState(
          () => _error = 'Enter the rate/amount to charge for that duration.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final photoBase64 = await _encodePhoto();
      final plateUpper = plate.toUpperCase();

      await context.read<ApiService>().post('/api/sessions', {
        'plateNumber': plateUpper,
        'photoBase64': photoBase64,
        'durationHours': hours,
        'price': price,
      });

      setState(() {
        _success =
            '$plateUpper logged in — ${_formatDuration(hours)} · \$${price.toStringAsFixed(2)}. '
            'It now shows on the admin panel and the Parked tab.';
        _plateController.clear();
        _photo = null;
        // Hours/price are intentionally left as-is: attendants usually log
        // several cars in a row on the same duration and rate.
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _formatDuration(double hours) {
    if (hours == hours.roundToDouble()) return '${hours.toInt()}h';
    return '${hours}h';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSlab,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Log a car in',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('Take a photo, enter the plate, set the duration & rate.',
                  style: TextStyle(color: Colors.black.withOpacity(0.5))),
              const SizedBox(height: 20),

              if (_error != null) _banner(_error!, kAlert),
              if (_success != null) _banner(_success!, kClear),

              // --- Photo capture ---
              const Text('Photo',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: _capturingPhoto ? null : _takePhoto,
                child: Container(
                  height: 200,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE4E0D6)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _capturingPhoto
                      ? const Center(child: CircularProgressIndicator())
                      : _photo != null
                          ? Stack(
                              fit: StackFit.expand,
                              children: [
                                // key forces Flutter to treat a new file path as a
                                // new image, so the preview always reflects the
                                // most recently captured photo.
                                Image.file(_photo!,
                                    key: ValueKey(_photo!.path),
                                    fit: BoxFit.cover),
                                Positioned(
                                  right: 8,
                                  bottom: 8,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withOpacity(0.6),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.refresh,
                                            size: 14, color: Colors.white),
                                        SizedBox(width: 4),
                                        Text('Tap to retake',
                                            style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.camera_alt_outlined,
                                    size: 36, color: Colors.grey),
                                SizedBox(height: 8),
                                Text('Tap to take a photo',
                                    style: TextStyle(color: Colors.grey)),
                              ],
                            ),
                ),
              ),
              const SizedBox(height: 20),

              // --- Plate number ---
              const Text('Plate number',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _plateController,
                textCapitalization: TextCapitalization.characters,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                    fontSize: 18),
                decoration: InputDecoration(
                  hintText: 'ABC 123D',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 20),

              // --- Duration quick-presets (built into the app) ---
              const Text('Quick duration',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: kDurationPresets.map((h) {
                  final selected = _hours == h;
                  return GestureDetector(
                    onTap: () => setState(() => _hoursController.text =
                        h == h.roundToDouble()
                            ? h.toInt().toString()
                            : h.toString()),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color:
                            selected ? kSignal.withOpacity(0.15) : Colors.white,
                        border: Border.all(
                            color: selected ? kSignal : const Color(0xFFE4E0D6),
                            width: selected ? 1.5 : 1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        _formatDuration(h),
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: selected ? kSignal : kInk),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // --- Manual duration & rate entry ---
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Duration (hours)',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _hoursController,
                          onChanged: (_) => setState(() {}),
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                                RegExp(r'^\d*\.?\d*'))
                          ],
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 18),
                          decoration: InputDecoration(
                            hintText: 'e.g. 5',
                            suffixText: 'h',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Rate (\$)',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _priceController,
                          onChanged: (_) => setState(() {}),
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                                RegExp(r'^\d*\.?\d*'))
                          ],
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 18),
                          decoration: InputDecoration(
                            hintText: 'e.g. 10',
                            prefixText: '\$ ',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // --- Selection summary, shown right before submit for confidence ---
              if (_hours != null && _hours! > 0 && _price != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: kInk,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _plateController.text.trim().isEmpty
                                ? 'Enter a plate above'
                                : _plateController.text.trim().toUpperCase(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_formatDuration(_hours!)} · flat rate',
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.6),
                                fontSize: 12),
                          ),
                        ],
                      ),
                      Text('\$${_price!.toStringAsFixed(2)}',
                          style: const TextStyle(
                              color: kSignal,
                              fontWeight: FontWeight.bold,
                              fontSize: 18)),
                    ],
                  ),
                ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kInk,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Log car in',
                          style: TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _banner(String text, Color color) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 13)),
    );
  }
}
