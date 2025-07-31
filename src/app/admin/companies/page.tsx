'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Building, Phone, Mail, User, FileText, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Contact {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  position?: string;
}

interface Company {
  id: string;
  name: string;
  tax_number: string;
  company_type: 'as' | 'ltd' | 'sahis';
  phone: string;
  email: string;
  contacts: Contact[];
  invoice_address: string;
  invoice_title: string;
  is_e_invoice: boolean;
  is_e_archive: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

const companyTypes = [
  { value: 'as', label: 'A.Ş.' },
  { value: 'ltd', label: 'Ltd. Şti.' },
  { value: 'sahis', label: 'Şahıs Şirketi' }
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCompany, setNewCompany] = useState({
    name: '',
    tax_number: '',
    company_type: 'ltd' as const,
    phone: '',
    email: '',
    contacts: [{ name: '', surname: '', email: '', phone: '', position: '' }],
    invoice_address: '',
    invoice_title: '',
    is_e_invoice: false,
    is_e_archive: false,
    notes: ''
  });

  // Fetch companies from Supabase
  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_contacts (
            id,
            name,
            surname,
            email,
            phone,
            position
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = (data || []).map(company => ({
        ...company,
        contacts: company.company_contacts || []
      }));

      setCompanies(transformedData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.tax_number.includes(searchTerm) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addContact = () => {
    setNewCompany(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', surname: '', email: '', phone: '', position: '' }]
    }));
  };

  const removeContact = (index: number) => {
    setNewCompany(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const updateContact = (index: number, field: string, value: string) => {
    setNewCompany(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const createCompany = async () => {
    if (!newCompany.name.trim() || !newCompany.tax_number.trim()) {
      alert('Firma adı ve vergi numarası zorunludur.');
      return;
    }

    try {
      // Insert company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: newCompany.name.trim(),
          tax_number: newCompany.tax_number.trim(),
          company_type: newCompany.company_type,
          phone: newCompany.phone.trim(),
          email: newCompany.email.trim(),
          invoice_address: newCompany.invoice_address.trim(),
          invoice_title: newCompany.invoice_title.trim(),
          is_e_invoice: newCompany.is_e_invoice,
          is_e_archive: newCompany.is_e_archive,
          notes: newCompany.notes.trim()
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Insert contacts
      const validContacts = newCompany.contacts.filter(contact => 
        contact.name.trim() && contact.surname.trim()
      );

      if (validContacts.length > 0) {
        const { error: contactsError } = await supabase
          .from('company_contacts')
          .insert(
            validContacts.map(contact => ({
              company_id: companyData.id,
              name: contact.name.trim(),
              surname: contact.surname.trim(),
              email: contact.email.trim(),
              phone: contact.phone.trim(),
              position: contact.position?.trim() || null
            }))
          );

        if (contactsError) throw contactsError;
      }

      await fetchCompanies();
      setNewCompany({
        name: '',
        tax_number: '',
        company_type: 'ltd',
        phone: '',
        email: '',
        contacts: [{ name: '', surname: '', email: '', phone: '', position: '' }],
        invoice_address: '',
        invoice_title: '',
        is_e_invoice: false,
        is_e_archive: false,
        notes: ''
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Firma oluşturulurken hata oluştu.');
    }
  };

  const deleteCompany = async (id: string) => {
    if (!confirm('Bu firmayı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Firma silinirken hata oluştu.');
    }
  };

  const getCompanyTypeLabel = (type: string) => {
    return companyTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Müşteri Firmalar</h2>
          <p className="text-slate-400 mt-1">Müşteri firma bilgilerini yönetin</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Yeni Firma
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Firma ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
        />
      </div>

      {/* Companies List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading Skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-slate-700 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-700/70 rounded"></div>
                  <div className="h-4 bg-slate-700/70 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700/70 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredCompanies.map((company) => (
            <div key={company.id} className="group bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all duration-300">
              {/* Company Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {company.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {getCompanyTypeLabel(company.company_type)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingCompany(company)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCompany(company.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Company Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">VN: {company.tax_number}</span>
                </div>
                
                {company.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{company.phone}</span>
                  </div>
                )}
                
                {company.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{company.email}</span>
                  </div>
                )}

                {/* Contacts */}
                {company.contacts && company.contacts.length > 0 && (
                  <div className="pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400">Yetkili Kişiler</span>
                    </div>
                    <div className="space-y-1">
                      {company.contacts.slice(0, 2).map((contact, index) => (
                        <div key={index} className="text-xs text-slate-300">
                          {contact.name} {contact.surname}
                          {contact.position && (
                            <span className="text-slate-500"> - {contact.position}</span>
                          )}
                        </div>
                      ))}
                      {company.contacts.length > 2 && (
                        <div className="text-xs text-slate-500">
                          +{company.contacts.length - 2} kişi daha
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* E-Invoice Status */}
                <div className="flex gap-2 pt-2">
                  {company.is_e_invoice && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      E-Fatura
                    </span>
                  )}
                  {company.is_e_archive && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      E-Arşiv
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty State */}
      {!isLoading && filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm ? 'Firma Bulunamadı' : 'Henüz Firma Yok'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchTerm 
              ? 'Arama kriterlerinize uygun firma bulunamadı' 
              : 'İlk müşteri firmanızı ekleyin'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            >
              İlk Firmayı Ekle
            </button>
          )}
        </div>
      )}

      {/* Create Company Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">Yeni Firma Ekle</h3>
              <p className="text-slate-400 mt-1">Müşteri firma bilgilerini girin</p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Firma Bilgileri</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Firma Adı *
                    </label>
                    <input
                      type="text"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Firma adını girin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Vergi Numarası *
                    </label>
                    <input
                      type="text"
                      value={newCompany.tax_number}
                      onChange={(e) => setNewCompany({ ...newCompany, tax_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Vergi numarasını girin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Firma Tipi
                    </label>
                    <select
                      value={newCompany.company_type}
                      onChange={(e) => setNewCompany({ ...newCompany, company_type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    >
                      {companyTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Şirket Telefon
                    </label>
                    <input
                      type="tel"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Telefon numarasını girin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Şirket E-posta
                    </label>
                    <input
                      type="email"
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="E-posta adresini girin"
                    />
                  </div>
                </div>

                {/* Contacts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-white">Yetkili Kişiler</h4>
                    <button
                      onClick={addContact}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all text-sm"
                    >
                      <Plus className="w-3 h-3" />
                      Ekle
                    </button>
                  </div>

                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {newCompany.contacts.map((contact, index) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-slate-300">
                            Yetkili {index + 1}
                          </span>
                          {newCompany.contacts.length > 1 && (
                            <button
                              onClick={() => removeContact(index)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Ad"
                            value={contact.name}
                            onChange={(e) => updateContact(index, 'name', e.target.value)}
                            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Soyad"
                            value={contact.surname}
                            onChange={(e) => updateContact(index, 'surname', e.target.value)}
                            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                          />
                          <input
                            type="email"
                            placeholder="E-posta"
                            value={contact.email}
                            onChange={(e) => updateContact(index, 'email', e.target.value)}
                            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                          />
                          <input
                            type="tel"
                            placeholder="Telefon"
                            value={contact.phone}
                            onChange={(e) => updateContact(index, 'phone', e.target.value)}
                            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Pozisyon (opsiyonel)"
                            value={contact.position}
                            onChange={(e) => updateContact(index, 'position', e.target.value)}
                            className="col-span-2 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoice Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Fatura Bilgileri</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fatura Adresi
                    </label>
                    <textarea
                      value={newCompany.invoice_address}
                      onChange={(e) => setNewCompany({ ...newCompany, invoice_address: e.target.value })}
                      className="w-full px-3 py-2 h-20 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Fatura adresini girin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fatura Ünvanı
                    </label>
                    <input
                      type="text"
                      value={newCompany.invoice_title}
                      onChange={(e) => setNewCompany({ ...newCompany, invoice_title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="E-Fatura için ünvan"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newCompany.is_e_invoice}
                        onChange={(e) => setNewCompany({ ...newCompany, is_e_invoice: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-300">E-Fatura mükellefi</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={newCompany.is_e_archive}
                        onChange={(e) => setNewCompany({ ...newCompany, is_e_archive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-300">E-Arşiv mükellefi</span>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Notlar</h4>
                  
                  <div>
                    <textarea
                      value={newCompany.notes}
                      onChange={(e) => setNewCompany({ ...newCompany, notes: e.target.value })}
                      className="w-full px-3 py-2 h-32 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Firma hakkında notlar..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={createCompany}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                >
                  Firma Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
