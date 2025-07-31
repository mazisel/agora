# Yetki Sistemi Dokümantasyonu

## Genel Bakış

Bu sistem, kullanıcıların yetki seviyelerine göre farklı sayfalara ve özelliklere erişimini kontrol eder. Dashboard yönetim paneli sadece belirli yetki seviyesindeki kullanıcılar tarafından görülebilir.

## Yetki Seviyeleri

Sistem 5 farklı yetki seviyesi kullanır:

1. **employee** (Çalışan) - Seviye 1
2. **team_lead** (Takım Lideri) - Seviye 2  
3. **manager** (Yönetici) - Seviye 3
4. **director** (Direktör) - Seviye 4
5. **admin** (Admin) - Seviye 5

## Dashboard Erişim Kuralları

Dashboard yönetim paneline erişim için aşağıdaki yetki seviyelerinden birine sahip olunması gerekir:

- ✅ **admin** (Admin)
- ✅ **director** (Direktör) 
- ✅ **manager** (Yönetici)
- ❌ **team_lead** (Takım Lideri)
- ❌ **employee** (Çalışan)

## Teknik Uygulama

### 1. Yetki Türleri (`src/types/permissions.ts`)

```typescript
export type AuthorityLevel = 'employee' | 'team_lead' | 'manager' | 'director' | 'admin';

export const DASHBOARD_REQUIRED_LEVELS: AuthorityLevel[] = ['admin', 'director', 'manager'];

export const canAccessDashboard = (userLevel: AuthorityLevel): boolean => {
  return DASHBOARD_REQUIRED_LEVELS.includes(userLevel);
};
```

### 2. Yetki Hook'u (`src/hooks/usePermissions.ts`)

```typescript
export function usePermissions() {
  const { userProfile } = useAuth();

  const canAccess = {
    dashboard: (): boolean => {
      if (!userProfile) return false;
      return canAccessDashboard(userProfile.authority_level);
    }
  };

  return { canAccess };
}
```

### 3. Yetki Koruma Bileşeni (`src/components/auth/PermissionGuard.tsx`)

```typescript
<PermissionGuard requireDashboardAccess={true}>
  <MainLayout>
    {/* Dashboard içeriği */}
  </MainLayout>
</PermissionGuard>
```

### 4. Ana Dashboard Sayfası (`src/app/page.tsx`)

Dashboard sayfası `PermissionGuard` ile korunur:

```typescript
return (
  <PermissionGuard requireDashboardAccess={true}>
    <MainLayout>
      {/* Dashboard bileşenleri */}
    </MainLayout>
  </PermissionGuard>
);
```

### 5. Sidebar Menü Kontrolü (`src/components/layout/Sidebar.tsx`)

Dashboard linki sadece yetkili kullanıcılara gösterilir:

```typescript
{menuItems.filter((item) => {
  if (item.id === 'dashboard') {
    return canAccess.dashboard();
  }
  return true;
}).map((item) => {
  // Menu item render
})}
```

## Yetki Kontrol Akışı

1. **Kullanıcı Girişi**: Kullanıcı giriş yaptığında `AuthContext` kullanıcı profilini yükler
2. **Yetki Seviyesi**: `userProfile.authority_level` alanından yetki seviyesi alınır
3. **Dashboard Erişimi**: Ana sayfaya (`/`) erişim sırasında `PermissionGuard` yetki kontrolü yapar
4. **Erişim Kontrolü**: 
   - Yetkili ise → Dashboard gösterilir
   - Yetkisiz ise → Erişim reddedildi mesajı gösterilir
5. **Menü Kontrolü**: Sidebar'da Dashboard linki sadece yetkili kullanıcılara gösterilir

## Hata Durumları

### Yetkisiz Erişim
Yetkisiz kullanıcılar dashboard'a erişmeye çalıştığında:
- Erişim reddedildi mesajı gösterilir
- Mevcut yetki seviyesi bilgisi gösterilir
- "Geri Dön" butonu ile önceki sayfaya dönüş sağlanır

### Yükleme Durumu
Kullanıcı profili yüklenirken:
- Loading spinner gösterilir
- "Yetki kontrol ediliyor..." mesajı gösterilir

## Güvenlik Notları

- Yetki kontrolü hem frontend hem backend'de yapılmalıdır
- Frontend kontrolü sadece UI/UX için, asıl güvenlik backend'de sağlanmalıdır
- Kullanıcı yetki seviyesi Supabase `user_profiles` tablosunda saklanır
- RLS (Row Level Security) politikaları ile veri erişimi kontrol edilir

## Gelecek Geliştirmeler

1. **Sayfa Bazlı Yetki Kontrolü**: Her sayfa için ayrı yetki seviyeleri
2. **Özellik Bazlı Yetki**: Belirli özellikler için ayrı yetki kontrolleri
3. **Dinamik Yetki Yönetimi**: Admin panelinden yetki seviyelerini değiştirme
4. **Yetki Geçmişi**: Kullanıcı yetki değişikliklerinin loglanması
