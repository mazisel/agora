# cPanel'e Next.js Uygulaması Yükleme Talimatları

## 📦 Hazırlanan Dosyalar

✅ **cpanel-upload.zip** - cPanel'e yüklenecek static dosyalar
✅ **out/** klasörü - Static export edilmiş tüm dosyalar

## 🚀 cPanel'e Yükleme Adımları

### Yöntem 1: File Manager ile Yükleme (Önerilen)

1. **cPanel'e Giriş Yapın**
   - Hosting sağlayıcınızın cPanel adresine gidin
   - Kullanıcı adı ve şifrenizle giriş yapın

2. **File Manager'ı Açın**
   - cPanel ana sayfasında "File Manager" seçeneğini bulun ve tıklayın
   - "public_html" klasörüne gidin (bu web sitenizin ana dizinidir)

3. **Mevcut Dosyaları Temizleyin (İsteğe Bağlı)**
   - public_html içindeki mevcut dosyaları yedekleyin veya silin
   - Özellikle index.html, index.php gibi dosyaları kaldırın

4. **ZIP Dosyasını Yükleyin**
   - "Upload" butonuna tıklayın
   - `cpanel-upload.zip` dosyasını seçin ve yükleyin
   - Yükleme tamamlandıktan sonra "Go Back to..." linkine tıklayın

5. **ZIP Dosyasını Çıkarın**
   - Yüklenen `cpanel-upload.zip` dosyasına sağ tıklayın
   - "Extract" seçeneğini seçin
   - Extract işlemi tamamlandıktan sonra ZIP dosyasını silebilirsiniz

6. **Dosyaları Taşıyın**
   - `out` klasörü içindeki tüm dosyaları seçin
   - "Move" veya "Cut" yapın
   - `public_html` ana dizinine "Paste" yapın
   - `out` klasörünü silebilirsiniz

### Yöntem 2: FTP ile Yükleme

1. **FTP Bilgilerinizi Alın**
   - cPanel'de "FTP Accounts" bölümünden FTP bilgilerinizi kontrol edin

2. **FTP İstemcisi Kullanın**
   - FileZilla, WinSCP gibi FTP programları kullanabilirsiniz
   - FTP bilgilerinizle bağlantı kurun

3. **Dosyaları Yükleyin**
   - Yerel bilgisayarınızda `out/` klasörü içindeki tüm dosyaları seçin
   - `public_html` dizinine yükleyin

## 🔧 Önemli Notlar

### ⚠️ Dikkat Edilmesi Gerekenler

1. **API Rotaları Çalışmayacak**
   - Static export'ta API rotaları (`/api/*`) çalışmaz
   - Supabase gibi harici API'ları kullanmanız gerekir

2. **Environment Variables**
   - `.env.local` dosyasındaki değişkenler build sırasında gömülür
   - Hassas bilgileri client-side'da göstermemeye dikkat edin

3. **Supabase Konfigürasyonu**
   - Supabase URL'inizin doğru olduğundan emin olun
   - RLS (Row Level Security) politikalarınızı kontrol edin

### 🌐 Domain Ayarları

- **Ana Domain**: Dosyalar `public_html`'e yüklenirse `yourdomain.com` adresinden erişilir
- **Subdomain**: Alt domain kullanmak istiyorsanız ilgili klasöre yükleyin

### 🔒 Güvenlik

1. **HTTPS Kullanın**
   - cPanel'de SSL sertifikası aktif edin
   - Let's Encrypt ücretsiz SSL kullanabilirsiniz

2. **Supabase RLS**
   - Veritabanı güvenliği için RLS politikalarını mutlaka aktif edin

## 📱 Test Etme

1. **Web Sitesini Ziyaret Edin**
   - `yourdomain.com` adresine gidin
   - Login sayfasının yüklendiğini kontrol edin

2. **Fonksiyonları Test Edin**
   - Login/logout işlemlerini test edin
   - Supabase bağlantısını kontrol edin

## 🆘 Sorun Giderme

### Yaygın Sorunlar

1. **Sayfa Bulunamadı (404)**
   - `.htaccess` dosyası oluşturun (aşağıya bakın)
   - Dosya yollarını kontrol edin

2. **CSS/JS Yüklenmiyor**
   - Dosya izinlerini kontrol edin (644 olmalı)
   - Klasör izinlerini kontrol edin (755 olmalı)

3. **Supabase Bağlantı Hatası**
   - Environment variables'ları kontrol edin
   - Supabase URL ve API key'i doğrulayın

### .htaccess Dosyası (Gerekirse)

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# HTTPS yönlendirmesi
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 📞 Destek

Sorun yaşarsanız:
1. Hosting sağlayıcınızın destek ekibiyle iletişime geçin
2. cPanel error logs'ları kontrol edin
3. Browser developer tools'da console hatalarını kontrol edin

---

**✅ Başarılı yükleme sonrası siteniz `yourdomain.com` adresinden erişilebilir olacaktır!**
