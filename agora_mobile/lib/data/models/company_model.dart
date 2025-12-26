
class CompanyContactModel {
  final String? id;
  final String name;
  final String surname;
  final String email;
  final String phone;
  final String? position;

  CompanyContactModel({
    this.id,
    required this.name,
    required this.surname,
    required this.email,
    required this.phone,
    this.position,
  });

  factory CompanyContactModel.fromJson(Map<String, dynamic> json) {
    return CompanyContactModel(
      id: json['id'] as String?,
      name: json['name'] as String,
      surname: json['surname'] as String,
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      position: json['position'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'name': name,
      'surname': surname,
      'email': email,
      'phone': phone,
      'position': position,
    };
  }
}

class CompanyModel {
  final String id;
  final String name;
  final String taxNumber;
  final String companyType; // 'as', 'ltd', 'sahis'
  final String phone;
  final String email;
  final String invoiceAddress;
  final String invoiceTitle;
  final bool isEInvoice;
  final bool isEArchive;
  final String notes;
  final DateTime createdAt;
  final List<CompanyContactModel> contacts;

  CompanyModel({
    required this.id,
    required this.name,
    required this.taxNumber,
    required this.companyType,
    required this.phone,
    required this.email,
    required this.invoiceAddress,
    required this.invoiceTitle,
    required this.isEInvoice,
    required this.isEArchive,
    required this.notes,
    required this.createdAt,
    this.contacts = const [],
  });

  factory CompanyModel.fromJson(Map<String, dynamic> json) {
    var contactsList = <CompanyContactModel>[];
    if (json['company_contacts'] != null) {
      contactsList = (json['company_contacts'] as List)
          .map((e) => CompanyContactModel.fromJson(e))
          .toList();
    }

    return CompanyModel(
      id: json['id'] as String,
      name: json['name'] as String,
      taxNumber: json['tax_number'] as String,
      companyType: json['company_type'] as String,
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String? ?? '',
      invoiceAddress: json['invoice_address'] as String? ?? '',
      invoiceTitle: json['invoice_title'] as String? ?? '',
      isEInvoice: json['is_e_invoice'] as bool? ?? false,
      isEArchive: json['is_e_archive'] as bool? ?? false,
      notes: json['notes'] as String? ?? '',
      createdAt: DateTime.parse(json['created_at'] as String),
      contacts: contactsList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'tax_number': taxNumber,
      'company_type': companyType,
      'phone': phone,
      'email': email,
      'invoice_address': invoiceAddress,
      'invoice_title': invoiceTitle,
      'is_e_invoice': isEInvoice,
      'is_e_archive': isEArchive,
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
