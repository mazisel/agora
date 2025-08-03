'use client';

import { useState } from 'react';
import { Mail, Send, Settings, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationsPage() {
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
