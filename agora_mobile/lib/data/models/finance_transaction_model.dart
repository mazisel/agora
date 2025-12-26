
class FinanceTransactionModel {
  final String id;
  final String type; // 'income' or 'expense'
  final String category;
  final double amount;
  final String description;
  final DateTime date;
  final String? employeeId;
  final String? employeeName;
  final String paymentMethod;
  final String? referenceNumber;
  final String? accountId;
  final DateTime createdAt;

  FinanceTransactionModel({
    required this.id,
    required this.type,
    required this.category,
    required this.amount,
    required this.description,
    required this.date,
    this.employeeId,
    this.employeeName,
    required this.paymentMethod,
    this.referenceNumber,
    this.accountId,
    required this.createdAt,
  });

  factory FinanceTransactionModel.fromJson(Map<String, dynamic> json) {
    return FinanceTransactionModel(
      id: json['id'] as String,
      type: json['type'] as String,
      category: json['category'] as String,
      amount: (json['amount'] as num).toDouble(),
      description: json['description'] as String,
      date: DateTime.parse(json['date'] as String),
      employeeId: json['employee_id'] as String?,
      employeeName: json['employee_name'] as String?,
      paymentMethod: json['payment_method'] as String,
      referenceNumber: json['reference_number'] as String?,
      accountId: json['account_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'category': category,
      'amount': amount,
      'description': description,
      'date': date.toIso8601String(),
      'employee_id': employeeId,
      'employee_name': employeeName,
      'payment_method': paymentMethod,
      'reference_number': referenceNumber,
      'account_id': accountId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
