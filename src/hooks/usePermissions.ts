import { useAuth } from '@/contexts/AuthContext';
import { AuthorityLevel, hasPermission, canAccessDashboard } from '@/types/permissions';

export function usePermissions() {
  const { userProfile } = useAuth();

  const checkPermission = (requiredLevel: AuthorityLevel): boolean => {
    if (!userProfile) return false;
    return hasPermission(userProfile.authority_level, requiredLevel);
  };

  const canAccess = {
    dashboard: (): boolean => {
      if (!userProfile) return false;
      return canAccessDashboard(userProfile.authority_level);
    },
    admin: (): boolean => checkPermission('admin'),
    director: (): boolean => checkPermission('director'),
    manager: (): boolean => checkPermission('manager'),
    teamLead: (): boolean => checkPermission('team_lead'),
  };

  return {
    userProfile,
    checkPermission,
    canAccess,
    isAdmin: userProfile?.authority_level === 'admin',
    isDirector: userProfile?.authority_level === 'director',
    isManager: userProfile?.authority_level === 'manager',
    isTeamLead: userProfile?.authority_level === 'team_lead',
    isEmployee: userProfile?.authority_level === 'employee',
  };
}
