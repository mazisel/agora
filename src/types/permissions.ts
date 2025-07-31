// Yetki seviyeleri
export type AuthorityLevel = 'employee' | 'team_lead' | 'manager' | 'director' | 'admin';

// Yetki kontrol fonksiyonları
export const AUTHORITY_LEVELS: Record<AuthorityLevel, number> = {
  employee: 1,
  team_lead: 2,
  manager: 3,
  director: 4,
  admin: 5
};

// Yetki kontrol fonksiyonları
export const hasPermission = (userLevel: AuthorityLevel, requiredLevel: AuthorityLevel): boolean => {
  return AUTHORITY_LEVELS[userLevel] >= AUTHORITY_LEVELS[requiredLevel];
};

// Dashboard erişimi için gerekli minimum yetki seviyesi
export const DASHBOARD_REQUIRED_LEVELS: AuthorityLevel[] = ['admin', 'director', 'manager'];

// Dashboard erişim kontrolü
export const canAccessDashboard = (userLevel: AuthorityLevel): boolean => {
  return DASHBOARD_REQUIRED_LEVELS.includes(userLevel);
};

// Proje yönetimi için gerekli minimum yetki seviyesi
export const PROJECT_MANAGEMENT_LEVELS: AuthorityLevel[] = ['admin', 'director', 'manager', 'team_lead'];

// Proje oluşturma ve düzenleme kontrolü
export const canManageProjects = (userLevel: AuthorityLevel): boolean => {
  return PROJECT_MANAGEMENT_LEVELS.includes(userLevel);
};

// Yetki seviyesi açıklamaları
export const AUTHORITY_DESCRIPTIONS: Record<AuthorityLevel, string> = {
  employee: 'Çalışan',
  team_lead: 'Takım Lideri',
  manager: 'Yönetici',
  director: 'Direktör',
  admin: 'Admin'
};
