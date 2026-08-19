import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/rate_plan.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

class EntryScreen extends StatefulWidget {
  const EntryScreen({super.key});

  @override
  State<EntryScreen> createState() => _EntryScreenState();
}

class _EntryScreenState extends State<EntryScreen> {
  final _plateController = TextEditingController();
  File? _photo;
  bool _capturingPhoto = false;
  List<RatePlan> _rates = [];
  RatePlan? _selectedRate;
  bool _loadingRates = true;
  bool _submitting = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _loadRates();
  }

  Future<void> _loadRates() async {
    setState(() {
      _loadingRates = true;
      _error = null;
    });
    try {
      final data = await context.read<ApiService>().get('/api/rates');
      final rates =
          (data['rates'] as List).map((r) => RatePlan.fromJson(r)).toList();
      setState(() {
        _rates = rates;
        _selectedRate = rates.isNotEmpty ? rates.first : null;
        _loadingRates = false;
      });
    } catch (e) {
      setState(() {
        _error =
            'Could not load rate plans: ${e.toString().replaceFirst('Exception: ', '')}';
        _loadingRates = false;
      });
    }
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
        // Confirm the file actually has bytes before treating it as taken —
        // guards against a picker edge case returning a path with no data.
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

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _success = null;
    });

    if (_plateController.text.trim().isEmpty) {
      setState(() => _error = 'Enter the plate number.');
      return;
    }
    if (_selectedRate == null) {
      setState(() => _error = 'Select a duration & rate plan.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final photoBase64 = await _encodePhoto();
      final plate = _plateController.text.trim().toUpperCase();
      final rate = _selectedRate!;

      await context.read<ApiService>().post('/api/sessions', {
        'plateNumber': plate,
        'photoBase64': photoBase64,
        'rateId': rate.id,
      });

      setState(() {
        _success =
            '$plate logged in — ${_formatDuration(rate.durationHours)} · \$${rate.price.toStringAsFixed(2)}. '
            'It now shows on the admin panel.';
        _plateController.clear();
        _photo = null;
        // _selectedRate is intentionally left as-is: attendants usually log
        // several cars in a row on the same duration/rate plan.
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
              Text('Take a photo, enter the plate, pick a duration & rate.',
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
                onChanged: (_) => setState(
                    () {}), // keeps the summary card below in sync as you type
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

              // --- Duration & rate selection ---
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Duration & rate',
                      style:
                          TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  if (!_loadingRates)
                    TextButton(
                      onPressed: _loadRates,
                      style: TextButton.styleFrom(
                          padding: EdgeInsets.zero, minimumSize: Size.zero),
                      child:
                          const Text('Refresh', style: TextStyle(fontSize: 12)),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (_loadingRates)
                const Center(
                    child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator()))
              else if (_rates.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10)),
                  child: const Text(
                    'No rate plans configured yet. Ask the owner to add some under "Rate plans" in the admin panel, then tap Refresh.',
                  ),
                )
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _rates.map((rate) {
                    final selected = _selectedRate?.id == rate.id;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedRate = rate),
                      child: Container(
                        width: 108,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: selected
                              ? kSignal.withOpacity(0.15)
                              : Colors.white,
                          border: Border.all(
                              color:
                                  selected ? kSignal : const Color(0xFFE4E0D6),
                              width: selected ? 1.5 : 1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.schedule,
                                size: 16,
                                color: selected ? kSignal : Colors.black38),
                            const SizedBox(height: 4),
                            Text(_formatDuration(rate.durationHours),
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                    color: selected ? kSignal : kInk)),
                            Text(rate.label,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.black.withOpacity(0.5))),
                            const SizedBox(height: 4),
                            Text('\$${rate.price.toStringAsFixed(2)}',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: selected ? kSignal : kInk)),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              const SizedBox(height: 16),

              // --- Selection summary, shown right before submit for confidence ---
              if (_selectedRate != null)
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
                            '${_formatDuration(_selectedRate!.durationHours)} · ${_selectedRate!.label}',
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.6),
                                fontSize: 12),
                          ),
                        ],
                      ),
                      Text('\$${_selectedRate!.price.toStringAsFixed(2)}',
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
