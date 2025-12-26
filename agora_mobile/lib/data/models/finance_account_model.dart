
class FinanceAccountModel {
  final String id;
  final String code;
  final String name;
  final String? description;
  final String accountType; // 'asset', 'liability', 'equity', 'income', 'expense'
  final String? parentAccountId;
  final bool isActive;

  FinanceAccountModel({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    required this.accountType,
    this.parentAccountId,
    required this.isActive,
  });

  factory FinanceAccountModel.fromJson(Map<String, dynamic> json) {
    return FinanceAccountModel(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      accountType: json['account_type'] as String,
      parentAccountId: json['parent_account_id'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
