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
    try {
      final data = await context.read<ApiService>().get('/api/rates');
      final rates = (data['rates'] as List).map((r) => RatePlan.fromJson(r)).toList();
      setState(() {
        _rates = rates;
        _selectedRate = rates.isNotEmpty ? rates.first : null;
        _loadingRates = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not load rate plans: $e';
        _loadingRates = false;
      });
    }
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    // Kept deliberately small: this photo is stored as a base64 string
    // directly on the Firestore document (no separate file storage), so a
    // small, heavily-compressed thumbnail (usually 15-40KB) is what we want
    // — plenty to identify a car, well under Firestore's 1MB document cap.
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 35,
      maxWidth: 480,
    );
    if (picked != null) {
      setState(() => _photo = File(picked.path));
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
      setState(() => _error = 'Select a rate plan.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final photoBase64 = await _encodePhoto();

      await context.read<ApiService>().post('/api/sessions', {
        'plateNumber': _plateController.text.trim(),
        'photoBase64': photoBase64,
        'rateId': _selectedRate!.id,
      });

      setState(() {
        _success = '${_plateController.text.trim().toUpperCase()} logged in successfully.';
        _plateController.clear();
        _photo = null;
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
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
              const Text('Log a car in', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('Take a photo, enter the plate, pick a duration.',
                  style: TextStyle(color: Colors.black.withOpacity(0.5))),
              const SizedBox(height: 20),

              if (_error != null) _banner(_error!, kAlert),
              if (_success != null) _banner(_success!, kClear),

              GestureDetector(
                onTap: _takePhoto,
                child: Container(
                  height: 180,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE4E0D6)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _photo != null
                      ? Image.file(_photo!, fit: BoxFit.cover)
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.camera_alt_outlined, size: 36, color: Colors.grey),
                            SizedBox(height: 8),
                            Text('Tap to take a photo', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 20),

              const Text('Plate number', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _plateController,
                textCapitalization: TextCapitalization.characters,
                style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1, fontSize: 18),
                decoration: InputDecoration(
                  hintText: 'ABC 123D',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 20),

              const Text('Duration & rate', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              if (_loadingRates)
                const Center(child: CircularProgressIndicator())
              else if (_rates.isEmpty)
                const Text('No rate plans configured yet. Ask the owner to add some in the admin panel.')
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _rates.map((rate) {
                    final selected = _selectedRate?.id == rate.id;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedRate = rate),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: selected ? kSignal.withOpacity(0.15) : Colors.white,
                          border: Border.all(color: selected ? kSignal : const Color(0xFFE4E0D6)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          children: [
                            Text(rate.label, style: TextStyle(fontWeight: FontWeight.w700, color: selected ? kSignal : kInk)),
                            Text('\$${rate.price.toStringAsFixed(2)}',
                                style: TextStyle(fontSize: 12, color: Colors.black.withOpacity(0.5))),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kInk,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _submitting
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Log car in', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
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
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 13)),
    );
  }
}
