'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Settings, CheckCircle, XCircle, Bell, Calendar, User, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: any;
  read: boolean;
  created_at: string;
  read_at?: string;
}

export default function NotificationsPage() {
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/notifications/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_id: notificationId,
          read: true
        })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setTestResult({ success: false, message: 'Lütfen test e-posta adresini girin' });
      return;
    }

    setIsTestingEmail(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: 'Test e-postası başarıyla gönderildi!' });
      } else {
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error || 'Test e-postası gönderilemedi';
        setTestResult({ success: false, message: errorMessage });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Bir hata oluştu' });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bildirim Ayarları</h1>
        <p className="text-gray-600">E-posta bildirimlerini yönetin ve test edin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E-posta Test Bölümü */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Mail className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">E-posta Testi</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            SMTP konfigürasyonunuzu test etmek için bir e-posta adresi girin
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Test E-posta Adresi
              </label>
              <input
                type="email"
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="test@example.com"
              />
            </div>

            <button
              onClick={handleTestEmail}
              disabled={isTestingEmail}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4 mr-2" />
              {isTestingEmail ? 'Gönderiliyor...' : 'Test E-postası Gönder'}
            </button>

            {testResult && (
              <div className={`flex items-center p-3 rounded-md ${
                testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* SMTP Konfigürasyonu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">SMTP Konfigürasyonu</h2>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Host:</span>
              <span className="ml-2 text-gray-600">smtp.gmail.com (örnek)</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Port:</span>
              <span className="ml-2 text-gray-600">587 (örnek)</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Güvenlik:</span>
              <span className="ml-2 text-gray-600">STARTTLS</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Durum:</span>
              <span className="ml-2 text-green-600">Yapılandırılmış</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Not:</strong> SMTP ayarları .env.local dosyasında yapılandırılır. 
              Değişiklik yaptıktan sonra uygulamayı yeniden başlatın.
            </p>
          </div>
        </div>
      </div>

      {/* Gelen Bildirimler */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Gelen Bildirimler ({notifications.filter(n => !n.read).length} okunmamış)
          </h2>
          <button
            onClick={loadNotifications}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Yenile
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Henüz bildiriminiz yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.read 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notification.type === 'leave_request' && (
                        <Calendar className="h-4 w-4 text-green-600" />
                      )}
                      <h3 className={`font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className={`text-sm mb-2 ${notification.read ? 'text-gray-600' : 'text-gray-700'}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notification.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {notification.read_at && (
                        <span>
                          Okundu: {new Date(notification.read_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    
                    {/* İzin talebi detayları */}
                    {notification.type === 'leave_request' && notification.data && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Çalışan:</span>
                            <span className="ml-1 text-gray-600">{notification.data.user_name}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">İzin Türü:</span>
                            <span className="ml-1 text-gray-600">
                              {notification.data.leave_type === 'annual' ? 'Yıllık İzin' :
                               notification.data.leave_type === 'sick' ? 'Hastalık İzni' :
                               notification.data.leave_type === 'personal' ? 'Kişisel İzin' :
                               notification.data.leave_type === 'maternity' ? 'Doğum İzni' : 'Diğer İzin'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Başlangıç:</span>
                            <span className="ml-1 text-gray-600">
                              {new Date(notification.data.start_date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Bitiş:</span>
                            <span className="ml-1 text-gray-600">
                              {new Date(notification.data.end_date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          {notification.data.reason && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">Sebep:</span>
                              <span className="ml-1 text-gray-600">{notification.data.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                      >
                        Okundu İşaretle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bildirim Türleri */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Otomatik Bildirimler</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Görev Ataması</h3>
            <p className="text-sm text-gray-600">Yeni görev atandığında kullanıcılara bildirim gönderilir</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Görev Durumu</h3>
            <p className="text-sm text-gray-600">Görev durumu değiştiğinde ilgili kişilere bildirim gönderilir</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Etkinlik Hatırlatması</h3>
            <p className="text-sm text-gray-600">Yaklaşan etkinlikler için hatırlatma e-postaları gönderilir</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Yeni Kullanıcı</h3>
            <p className="text-sm text-gray-600">Yeni kullanıcı oluşturulduğunda hoş geldin e-postası gönderilir</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Şifre Sıfırlama</h3>
            <p className="text-sm text-gray-600">Şifre sıfırlandığında kullanıcıya bildirim gönderilir</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Proje Ataması</h3>
            <p className="text-sm text-gray-600">Projeye atandığında kullanıcılara bildirim gönderilir</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
