class RatePlan {
  final String id;
  final String label;
  final double durationHours;
  final double price;

  RatePlan({
    required this.id,
    required this.label,
    required this.durationHours,
    required this.price,
  });

  factory RatePlan.fromJson(Map<String, dynamic> json) {
    return RatePlan(
      id: json['id'],
      label: json['label'],
      durationHours: (json['durationHours'] as num).toDouble(),
      price: (json['price'] as num).toDouble(),
    );
  }
}
