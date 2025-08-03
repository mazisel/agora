'use client';

import { useState, useEffect } from 'react';
import { X, Users, Crown, Shield, UserPlus, UserMinus, Search, MoreVertical, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Member {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  user_profile?: {
    first_name: string;
    last_name?: string;
    profile_photo_url?: string;
  };
}

interface MembersModalProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export default function MembersModal({ channelId, channelName, onClose }: MembersModalProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Üyeleri yükle
  useEffect(() => {
    loadMembers();
    loadCurrentUserRole();
  }, [channelId]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      
      // Kanal üyelerini çek
      const { data: channelMembers } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channelId);

      if (channelMembers && channelMembers.length > 0) {
        // User profiles bilgilerini çek
        const userIds = channelMembers.map(m => m.user_id);
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, profile_photo_url')
          .in('user_id', userIds);

        // Üyeleri user_profiles ile birleştir
        const membersWithProfiles = channelMembers.map(member => ({
          ...member,
          user_profile: userProfiles?.find(profile => profile.user_id === member.user_id)
        }));

        setMembers(membersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mevcut kullanıcının rolünü yükle
  const loadCurrentUserRole = async () => {
    if (!user) return;
    
    try {
      const { data: memberData } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        setCurrentUserRole(memberData.role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  // Kullanıcı rolünü değiştir
  const changeUserRole = async (memberId: string, newRole: 'admin' | 'moderator' | 'member') => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Üyeleri yeniden yükle
      loadMembers();
    } catch (error) {
      console.error('Error changing user role:', error);
      alert('Rol değiştirme başarısız oldu.');
    }
  };

  // Üyeyi kanaldan çıkar
  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName} kullanıcısını kanaldan çıkarmak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Üyeleri yeniden yükle
      loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Üye çıkarma başarısız oldu.');
    }
  };

  // Yeni üye ekle
  const addMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;

      // Üyeleri yeniden yükle
      loadMembers();
      setShowAddMember(false);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Üye ekleme başarısız oldu.');
    }
  };

  // Kullanıcı arama fonksiyonu
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Mevcut kanal üyelerinin ID'lerini al
      const currentMemberIds = members.map(m => m.user_id);

      // İsim veya soyisim ile kullanıcı ara (kanal üyesi olmayanlar)
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, profile_photo_url')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .not('user_id', 'in', `(${currentMemberIds.join(',')})`)
        .limit(10);

      setSearchResults(users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Arama terimi değiştiğinde arama yap
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (showAddMember) {
        searchUsers(userSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm, showAddMember, members]);

  // Kullanıcının yetki kontrolü
  const canManageMembers = currentUserRole === 'admin' || currentUserRole === 'moderator';
  const canManageRoles = currentUserRole === 'admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-400" />;
      default:
        return <Users className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Yönetici';
      case 'moderator':
        return 'Moderatör';
      default:
        return 'Üye';
    }
  };

  const getUserDisplayName = (member: Member) => {
    if (member.user_profile) {
      const { first_name, last_name } = member.user_profile;
      if (first_name) {
        return `${first_name} ${last_name || ''}`.trim();
      }
    }
    return 'Kullanıcı';
  };

  const getUserAvatar = (member: Member) => {
    const name = getUserDisplayName(member);
    
    // Profil resmi varsa göster
    if (member.user_profile?.profile_photo_url) {
      return (
        <img 
          src={member.user_profile.profile_photo_url} 
          alt={name}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }

    // Profil resmi yoksa renkli avatar
    const initial = name.charAt(0).toUpperCase();
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;
    
    return (
      <div className={`w-10 h-10 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
        {initial}
      </div>
    );
  };

  const filteredMembers = members.filter(member => {
    const name = getUserDisplayName(member);
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Kanal Üyeleri</h2>
            <p className="text-sm text-slate-400">#{channelName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Üye ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-400 text-sm">Üyeler yükleniyor...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">
                {searchTerm ? 'Üye bulunamadı' : 'Henüz üye yok'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {getUserAvatar(member)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">
                        {getUserDisplayName(member)}
                      </p>
                      {member.user_id === user?.id && (
                        <span className="text-xs text-blue-400 bg-blue-400/20 px-2 py-0.5 rounded">
                          Sen
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {getRoleIcon(member.role)}
                      <span className="text-xs text-slate-400">
                        {getRoleText(member.role)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {(canManageMembers || canManageRoles) && member.user_id !== user?.id && (
                      <div className="relative group">
                        <button className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-8 bg-slate-700 border border-slate-600 rounded-lg shadow-lg py-1 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          {canManageRoles && (
                            <>
                              {member.role !== 'admin' && (
                                <button
                                  onClick={() => changeUserRole(member.id, 'admin')}
                                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-600 flex items-center gap-2"
                                >
                                  <Crown className="w-3 h-3 text-yellow-400" />
                                  Yönetici Yap
                                </button>
                              )}
                              {member.role !== 'moderator' && (
                                <button
                                  onClick={() => changeUserRole(member.id, 'moderator')}
                                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-600 flex items-center gap-2"
                                >
                                  <Shield className="w-3 h-3 text-blue-400" />
                                  Moderatör Yap
                                </button>
                              )}
                              {member.role !== 'member' && (
                                <button
                                  onClick={() => changeUserRole(member.id, 'member')}
                                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-600 flex items-center gap-2"
                                >
                                  <Users className="w-3 h-3 text-slate-400" />
                                  Üye Yap
                                </button>
                              )}
                              <hr className="border-slate-600 my-1" />
                            </>
                          )}
                          {canManageMembers && (
                            <button
                              onClick={() => removeMember(member.id, getUserDisplayName(member))}
                              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2"
                            >
                              <UserMinus className="w-3 h-3" />
                              Kanaldan Çıkar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>{filteredMembers.length} üye</span>
            {canManageMembers && (
              <button 
                onClick={() => setShowAddMember(true)}
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                title="Üye Ekle"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-xs">Ekle</span>
              </button>
            )}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-slate-700 rounded-lg p-6 w-96 mx-4 max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Üye Ekle</h3>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setUserSearchTerm('');
                    setSearchResults([]);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4 flex-1 overflow-hidden">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Kullanıcı Ara
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="İsim veya soyisim ile ara..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-center py-4">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-slate-400 text-sm">Aranıyor...</p>
                    </div>
                  ) : userSearchTerm.length < 2 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">En az 2 karakter girin</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Kullanıcı bulunamadı</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((searchUser) => {
                        const displayName = `${searchUser.first_name} ${searchUser.last_name || ''}`.trim();
                        const initial = displayName.charAt(0).toUpperCase();
                        const colors = [
                          'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
                          'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
                        ];
                        const colorIndex = displayName.charCodeAt(0) % colors.length;

                        return (
                          <div
                            key={searchUser.user_id}
                            onClick={() => {
                              addMember(searchUser.user_id);
                              setUserSearchTerm('');
                              setSearchResults([]);
                            }}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-600 cursor-pointer transition-colors"
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {searchUser.profile_photo_url ? (
                                <img 
                                  src={searchUser.profile_photo_url} 
                                  alt={displayName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`w-8 h-8 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium text-xs`}>
                                  {initial}
                                </div>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {displayName}
                              </p>
                            </div>

                            {/* Add Icon */}
                            <div className="flex-shrink-0">
                              <UserPlus className="w-4 h-4 text-blue-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Cancel Button */}
                <div className="pt-4 border-t border-slate-600">
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setUserSearchTerm('');
                      setSearchResults([]);
                    }}
                    className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
