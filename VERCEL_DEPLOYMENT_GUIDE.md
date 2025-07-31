# 🚀 Vercel Deployment Rehberi

## 📋 Terminal'de Yapmanız Gerekenler

### Şu An Karşılaştığınız Soru:
**"What's the name of your existing project?"**

### ✅ Doğru Cevap:
Terminal'de şunu yazın:
```
team-management-system
```
Sonra **Enter** basın.

### 🔄 Eğer "Project not found" Hatası Alırsanız:

1. **Boş bırakıp Enter basın** (yeni proje oluşturacak)
2. **VEYA** `Ctrl+C` basıp çıkın, sonra şu komutu çalıştırın:

```bash
vercel --name team-management-system
```

## 📝 Sonraki Adımlar

### 1. Proje Ayarları
- **"In which directory is your code located?"** → Enter (mevcut dizin)
- **"Want to override the settings?"** → `N` (No)
- **"Build Command"** → Enter (otomatik: `npm run build`)
- **"Output Directory"** → Enter (otomatik: `.next`)
- **"Development Command"** → Enter (otomatik: `npm run dev`)

### 2. Deploy İşlemi
Vercel otomatik olarak:
- ✅ Dependencies yükleyecek
- ✅ Build alacak  
- ✅ Deploy edecek
- ✅ URL verecek

### 3. Environment Variables (Deploy Sonrası)
Vercel dashboard'da (vercel.com) şu değişkenleri ekleyin:

```
NEXT_PUBLIC_SUPABASE_URL=https://riacmnpxjsbrppzfjeur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWNtbnB4anNicnBwemZqZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzUxODIsImV4cCI6MjA2OTQxMTE4Mn0.kYOmpbDvos5aghqzGNjK7ArtEnc8z4X0-fnGErEdJ1Y
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🎯 Beklenen Sonuç

Deploy tamamlandığında şuna benzer bir URL alacaksınız:
```
https://team-management-system-xxx.vercel.app
```

## 🔧 Sorun Giderme

### "Project not found" Hatası
- Boş bırakıp Enter basın
- Yeni proje oluşturacak

### Build Hatası
- Environment variables'ları kontrol edin
- Supabase bağlantısını doğrulayın

### Deploy Sonrası Çalışmıyor
- Vercel dashboard'da environment variables ekleyin
- Redeploy yapın

---

**🚀 Şimdi terminal'de `team-management-system` yazıp Enter basın!**
