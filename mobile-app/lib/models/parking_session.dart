class ParkingSession {
  final String id;
  final String plateNumber;
  final String? photoBase64;
  final String rateId;
  final String rateLabel;
  final double ratePrice;
  final double durationHours;
  final DateTime entryTime;
  final DateTime expectedExitTime;
  final DateTime? exitTime;
  final String status; // "active" | "completed"
  final double? finalCost;
  final double? overageHours;
  final double? overageCost;

  ParkingSession({
    required this.id,
    required this.plateNumber,
    required this.photoBase64,
    required this.rateId,
    required this.rateLabel,
    required this.ratePrice,
    required this.durationHours,
    required this.entryTime,
    required this.expectedExitTime,
    required this.exitTime,
    required this.status,
    required this.finalCost,
    required this.overageHours,
    required this.overageCost,
  });

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is String) return DateTime.parse(value);
    if (value is Map && value['_seconds'] != null) {
      return DateTime.fromMillisecondsSinceEpoch(
        (value['_seconds'] as int) * 1000,
      );
    }
    return null;
  }

  factory ParkingSession.fromJson(Map<String, dynamic> json) {
    return ParkingSession(
      id: json['id'],
      plateNumber: json['plateNumber'],
      photoBase64: json['photoBase64'],
      rateId: json['rateId'],
      rateLabel: json['rateLabel'],
      ratePrice: (json['ratePrice'] as num).toDouble(),
      durationHours: (json['durationHours'] as num).toDouble(),
      entryTime: _parseDate(json['entryTime'])!,
      expectedExitTime: _parseDate(json['expectedExitTime'])!,
      exitTime: _parseDate(json['exitTime']),
      status: json['status'],
      finalCost: json['finalCost'] != null ? (json['finalCost'] as num).toDouble() : null,
      overageHours: json['overageHours'] != null ? (json['overageHours'] as num).toDouble() : null,
      overageCost: json['overageCost'] != null ? (json['overageCost'] as num).toDouble() : null,
    );
  }
}
