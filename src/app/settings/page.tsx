'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Settings, 
  Lock, 
  User, 
  Bell, 
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Profile update request state
  const [updateRequests, setUpdateRequests] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({
    requestType: '',
    requestedValue: '',
    requestedValue2: '', // İkinci alan için (acil durum telefonu)
    reason: ''
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    task_notifications: true,
    project_notifications: true
  });

  useEffect(() => {
    loadUpdateRequests();
  }, []);

  const loadUpdateRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/profile-update-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUpdateRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading update requests:', error);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.requestType || !requestForm.requestedValue) {
      setMessage({ type: 'error', text: 'Lütfen tüm alanları doldurun!' });
      return;
    }

    // For emergency contact, check if both fields are filled
    if (requestForm.requestType === 'emergency_contact' && !requestForm.requestedValue2) {
      setMessage({ type: 'error', text: 'Acil durum iletişim bilgileri için hem ad hem telefon gereklidir!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Oturum bulunamadı!' });
        setLoading(false);
        return;
      }

      // Get current value
      let currentValue = '';
      if (requestForm.requestType === 'emergency_contact') {
        currentValue = userProfile?.emergency_contact_name || '';
      } else {
        const value = userProfile?.[requestForm.requestType as keyof typeof userProfile];
        currentValue = typeof value === 'string' ? value : String(value || '');
      }

      const response = await fetch('/api/profile-update-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestType: requestForm.requestType,
          currentValue: currentValue,
          requestedValue: requestForm.requestedValue,
          requestedValue2: requestForm.requestedValue2,
          reason: requestForm.reason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Talep oluşturulurken hata oluştu!' });
      } else {
        setMessage({ type: 'success', text: 'Talep başarıyla oluşturuldu!' });
        setRequestForm({
          requestType: '',
          requestedValue: '',
          requestedValue2: '',
          reason: ''
        });
        loadUpdateRequests();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Beklenmeyen bir hata oluştu!' });
    }

    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor!' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Oturum bulunamadı!' });
        setLoading(false);
        return;
      }

      // Call our API endpoint
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Şifre güncellenirken hata oluştu!' });
      } else {
        setMessage({ type: 'success', text: 'Şifre başarıyla güncellendi!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Beklenmeyen bir hata oluştu!' });
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'approved': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'phone': return 'Telefon';
      case 'address': return 'Adres';
      case 'emergency_contact': return 'Acil Durum İletişim Bilgileri';
      case 'emergency_contact_name': return 'Acil Durum İletişim Adı';
      case 'emergency_contact_phone': return 'Acil Durum İletişim Telefonu';
      default: return field;
    }
  };

  const formatRequestValue = (request: any) => {
    if (request.request_type === 'emergency_contact') {
      try {
        const data = JSON.parse(request.requested_value);
        return `${data.name} (${data.phone})`;
      } catch {
        return request.requested_value;
      }
    }
    return request.requested_value;
  };

  const tabs = [
    { id: 'profile', label: 'Profil Bilgileri', icon: User },
    { id: 'password', label: 'Şifre Değiştir', icon: Lock },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield }
  ];

  return (
    <MainLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Ayarlar</h1>
            </div>
            <p className="text-slate-400">Hesap ayarlarınızı ve tercihlerinizi yönetin</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-6">Profil Bilgi Güncelleme Talepleri</h2>
                  
                  {/* Current Profile Info */}
                  <div className="mb-8 p-4 bg-slate-700/30 rounded-lg">
                    <h3 className="font-medium text-white mb-4">Mevcut Bilgileriniz</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Ad Soyad:</span>
                        <span className="text-white ml-2">
                          {userProfile?.first_name} {userProfile?.last_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Telefon:</span>
                        <span className="text-white ml-2">{userProfile?.phone || 'Belirtilmemiş'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Adres:</span>
                        <span className="text-white ml-2">{userProfile?.address || 'Belirtilmemiş'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Acil Durum İletişim:</span>
                        <span className="text-white ml-2">
                          {userProfile?.emergency_contact_name || 'Belirtilmemiş'}
                          {userProfile?.emergency_contact_phone && ` (${userProfile.emergency_contact_phone})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* New Request Form */}
                  <div className="mb-8">
                    <h3 className="font-medium text-white mb-4">Yeni Güncelleme Talebi</h3>
                    <form onSubmit={handleSubmitRequest} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Güncellenecek Alan
                        </label>
                        <select
                          value={requestForm.requestType}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, requestType: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          required
                        >
                          <option value="">Seçiniz...</option>
                          <option value="phone">Telefon</option>
                          <option value="address">Adres</option>
                          <option value="emergency_contact">Acil Durum İletişim Bilgileri</option>
                        </select>
                      </div>
                      
                      {requestForm.requestType === 'emergency_contact' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Acil Durum İletişim Adı
                            </label>
                            <input
                              type="text"
                              value={requestForm.requestedValue}
                              onChange={(e) => setRequestForm(prev => ({ ...prev, requestedValue: e.target.value }))}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                              placeholder="Acil durum kişisinin adını girin"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Acil Durum İletişim Telefonu
                            </label>
                            <input
                              type="tel"
                              value={requestForm.requestedValue2}
                              onChange={(e) => setRequestForm(prev => ({ ...prev, requestedValue2: e.target.value }))}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                              placeholder="Acil durum kişisinin telefon numarasını girin"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Yeni Değer
                          </label>
                          <input
                            type={requestForm.requestType === 'phone' ? 'tel' : 'text'}
                            value={requestForm.requestedValue}
                            onChange={(e) => setRequestForm(prev => ({ ...prev, requestedValue: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            placeholder={
                              requestForm.requestType === 'phone' ? 'Telefon numaranızı girin' :
                              requestForm.requestType === 'address' ? 'Adresinizi girin' :
                              'Yeni değeri girin'
                            }
                            required
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Değişiklik Nedeni (İsteğe bağlı)
                        </label>
                        <textarea
                          value={requestForm.reason}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Değişiklik nedeninizi açıklayın"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          {loading ? 'Gönderiliyor...' : 'Talep Gönder'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Existing Requests */}
                  <div>
                    <h3 className="font-medium text-white mb-4">Mevcut Talepleriniz</h3>
                    {updateRequests.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">Henüz hiç talebiniz bulunmuyor.</p>
                    ) : (
                      <div className="space-y-4">
                        {updateRequests.map((request) => (
                          <div key={request.id} className="p-4 bg-slate-700/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-white">
                                {getFieldLabel(request.request_type)}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                                {getStatusText(request.status)}
                              </span>
                            </div>
                            <div className="text-sm text-slate-400 space-y-1">
                              <div>
                                <span className="font-medium">Mevcut:</span> {request.current_value || 'Boş'}
                              </div>
                              <div>
                                <span className="font-medium">Talep Edilen:</span> {formatRequestValue(request)}
                              </div>
                              {request.reason && (
                                <div>
                                  <span className="font-medium">Neden:</span> {request.reason}
                                </div>
                              )}
                              {request.admin_notes && (
                                <div>
                                  <span className="font-medium">Admin Notu:</span> {request.admin_notes}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Tarih:</span> {new Date(request.created_at).toLocaleDateString('tr-TR')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-6">Şifre Değiştir</h2>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Mevcut Şifre
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Mevcut şifrenizi girin"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Yeni Şifre
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Yeni şifrenizi girin"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">En az 6 karakter olmalıdır</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Yeni Şifre (Tekrar)
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          placeholder="Yeni şifrenizi tekrar girin"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-6">Bildirim Ayarları</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <h3 className="font-medium text-white">E-posta Bildirimleri</h3>
                        <p className="text-sm text-slate-400">Önemli güncellemeler için e-posta alın</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.email_notifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <h3 className="font-medium text-white">Görev Bildirimleri</h3>
                        <p className="text-sm text-slate-400">Yeni görevler ve güncellemeler</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.task_notifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, task_notifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>


                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <h3 className="font-medium text-white">Proje Bildirimleri</h3>
                        <p className="text-sm text-slate-400">Proje güncellemeleri ve duyurular</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.project_notifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, project_notifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-6">Güvenlik</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h3 className="font-medium text-white mb-2">Hesap Güvenliği</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Hesabınızın güvenliğini artırmak için düzenli olarak şifrenizi değiştirin.
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-green-400">
                          <Check className="w-4 h-4" />
                          <span className="text-sm">E-posta doğrulandı</span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-400">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Güçlü şifre</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h3 className="font-medium text-white mb-2">Oturum Bilgileri</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Son giriş: {new Date().toLocaleDateString('tr-TR')}
                      </p>
                      <p className="text-sm text-slate-400">
                        E-posta: {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
