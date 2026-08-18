import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/parking_session.dart';
import '../utils/constants.dart';

/// The photo field is a data URI (e.g. "data:image/jpeg;base64,...."). This
/// strips the header and decodes just the base64 payload into raw bytes.
Uint8List? _decodePhoto(String? dataUri) {
  if (dataUri == null) return null;
  try {
    final commaIndex = dataUri.indexOf(',');
    final raw = commaIndex >= 0 ? dataUri.substring(commaIndex + 1) : dataUri;
    return base64Decode(raw);
  } catch (_) {
    return null;
  }
}

class SessionCard extends StatelessWidget {
  final ParkingSession session;
  final VoidCallback? onLogout;
  final bool busy;

  const SessionCard({
    super.key,
    required this.session,
    this.onLogout,
    this.busy = false,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('MMM d, h:mm a');
    final isActive = session.status == 'active';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE4E0D6)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: () {
              final bytes = _decodePhoto(session.photoBase64);
              return bytes != null
                  ? Image.memory(
                      bytes,
                      width: 64,
                      height: 64,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder(),
                    )
                  : _placeholder();
            }(),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      session.plateNumber,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: (isActive ? kSignal : kClear).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isActive ? 'Parked' : 'Completed',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isActive ? kSignal : kClear,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('${session.rateLabel} · \$${session.ratePrice.toStringAsFixed(2)}',
                    style: TextStyle(color: Colors.black.withOpacity(0.6), fontSize: 13)),
                Text('In: ${fmt.format(session.entryTime)}',
                    style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12)),
                Text('Expected out: ${fmt.format(session.expectedExitTime)}',
                    style: TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12)),
                if (session.finalCost != null)
                  Text(
                    'Paid: \$${session.finalCost!.toStringAsFixed(2)}'
                    '${session.overageCost != null && session.overageCost! > 0 ? '  (+\$${session.overageCost!.toStringAsFixed(2)} overage)' : ''}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: (session.overageCost ?? 0) > 0 ? kAlert : kClear,
                    ),
                  ),
              ],
            ),
          ),
          if (isActive && onLogout != null)
            ElevatedButton(
              onPressed: busy ? null : onLogout,
              style: ElevatedButton.styleFrom(
                backgroundColor: kInk,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: Size.zero,
              ),
              child: busy
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Log out', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 64,
      height: 64,
      color: kSlab,
      child: const Icon(Icons.directions_car, color: Colors.grey),
    );
  }
}
