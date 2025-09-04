'use client';

import { useState, useEffect } from 'react';
import { X, Send, Users, ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle, User, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Task, UserProfile, TaskTransfer } from '@/types';

interface SimpleUser {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  department?: string;
  profile_photo_url?: string;
  authority_level: string;
}

interface TaskTransferModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: () => void;
}

export default function TaskTransferModal({
  task,
  isOpen,
  onClose,
  onTransferSuccess
}: TaskTransferModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'pending' | 'history'>('create');
  const [isLoading, setIsLoading] = useState(false);
  
  // Yeni transfer formu
  const [transferForm, setTransferForm] = useState({
    to_user_id: '',
    reason: '',
    transfer_type: 'reassign' as 'reassign' | 'delegate' | 'escalate'
  });
  
  // Kullanıcılar ve transfer verileri
  const [availableUsers, setAvailableUsers] = useState<SimpleUser[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<TaskTransfer[]>([]);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      fetchTransferData();
    }
  }, [isOpen, task.id]);

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, position, department, profile_photo_url, authority_level')
        .eq('status', 'active')
        .neq('id', task.assigned_to || '')
        .order('first_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTransferData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('No session found, skipping transfer data fetch');
        return;
      }

      console.log('Fetching transfer data for task:', task.id);
      
      const response = await fetch(`/api/tasks/${task.id}/transfer`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('Transfer data response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Transfer data result:', result);
        setPendingTransfers(result.data?.pending_transfers || []);
        setTransferHistory(result.data?.transfer_history || []);
      } else {
        console.warn('Transfer data fetch failed:', response.status, response.statusText);
        // Hata durumunda boş array'ler set et
        setPendingTransfers([]);
        setTransferHistory([]);
      }
    } catch (error) {
      console.error('Error fetching transfer data:', error);
      // Hata durumunda boş array'ler set et
      setPendingTransfers([]);
      setTransferHistory([]);
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.to_user_id || !transferForm.reason.trim()) {
      alert('Lütfen hedef kullanıcı ve sebep alanlarını doldurun');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`/api/tasks/${task.id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(transferForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transfer request failed');
      }

      alert('Yönlendirme talebi başarıyla oluşturuldu');
      setTransferForm({
        to_user_id: '',
        reason: '',
        transfer_type: 'reassign'
      });
      
      // Verileri yenile
      await fetchTransferData();
      setActiveTab('pending');
      onTransferSuccess();

    } catch (error: any) {
      console.error('Transfer error:', error);
      alert(`Hata: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferAction = async (transferId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`/api/task-transfers/${transferId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action,
          rejection_reason: rejectionReason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Action failed');
      }

      alert(result.message);
      await fetchTransferData();
      onTransferSuccess();

    } catch (error: any) {
      console.error('Transfer action error:', error);
      alert(`Hata: ${error.message}`);
    }
  };

  const getTransferTypeLabel = (type: string) => {
    switch (type) {
      case 'reassign': return 'Yeniden Atama';
      case 'delegate': return 'Yardım İste';
      case 'escalate': return 'Uzman Desteği';
      default: return type;
    }
  };

  const getTransferTypeColor = (type: string) => {
    switch (type) {
      case 'reassign': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'delegate': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'escalate': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'accepted': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'accepted': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Görev Yönlendirme</h3>
                <p className="text-slate-300">{task.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6 bg-slate-700/30 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <Send className="w-4 h-4 inline mr-2" />
              Yönlendir
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pending'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Bekleyen ({pendingTransfers.filter(t => t.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Geçmiş ({pendingTransfers.filter(t => t.status !== 'pending').length + transferHistory.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] pb-20">
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                <h4 className="text-lg font-semibold text-white mb-4">Yeni Yönlendirme Talebi</h4>
                
                <div className="space-y-4">
                  {/* Transfer Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Yönlendirme Türü
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'reassign', label: 'Yeniden Atama', desc: 'Görevi tamamen başkasına devret' },
                        { value: 'delegate', label: 'Yardım İste', desc: 'Birlikte çalışmak için destek al' },
                        { value: 'escalate', label: 'Uzman Desteği', desc: 'Konusunda uzman kişiye yönlendir' }
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setTransferForm({ ...transferForm, transfer_type: type.value as any })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            transferForm.transfer_type === type.value
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                              : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:border-slate-500/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs opacity-75 mt-1">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target User */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Hedef Kullanıcı
                    </label>
                    <select
                      value={transferForm.to_user_id}
                      onChange={(e) => setTransferForm({ ...transferForm, to_user_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    >
                      <option value="">Kullanıcı seçin...</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} - {user.position} ({user.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Yönlendirme Sebebi
                    </label>
                    <textarea
                      value={transferForm.reason}
                      onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
                      rows={4}
                      placeholder="Neden bu görevi yönlendirmek istiyorsunuz?"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleCreateTransfer}
                      disabled={isLoading || !transferForm.to_user_id || !transferForm.reason.trim()}
                      className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isLoading ? 'Gönderiliyor...' : 'Yönlendirme Talebi Gönder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingTransfers.filter(t => t.status === 'pending').length === 0 ? (
                <div className="text-center py-12 bg-slate-700/20 rounded-xl border border-slate-600/30">
                  <Clock className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h5 className="text-lg font-semibold text-white mb-2">Bekleyen Talep Yok</h5>
                  <p className="text-slate-400">Bu görev için bekleyen yönlendirme talebi bulunmuyor</p>
                </div>
              ) : (
                pendingTransfers.filter(t => t.status === 'pending').map((transfer) => (
                  <div key={transfer.id} className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getTransferTypeColor(transfer.transfer_type)}`}>
                              {getTransferTypeLabel(transfer.transfer_type)}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(transfer.status)}`}>
                              {getStatusLabel(transfer.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300">
                            {transfer.from_user?.first_name} {transfer.from_user?.last_name} → {transfer.to_user?.first_name} {transfer.to_user?.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(transfer.created_at).toLocaleString('tr-TR')}
                      </div>
                    </div>

                    <div className="bg-slate-800/40 rounded-lg p-4 mb-4">
                      <p className="text-slate-300 text-sm">{transfer.reason}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Talep eden: {transfer.requester?.first_name} {transfer.requester?.last_name}
                      </div>
                      
                      {transfer.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTransferAction(transfer.id, 'approve')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-all text-xs font-medium flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Onayla
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Red nedeni:');
                              if (reason) {
                                handleTransferAction(transfer.id, 'reject', reason);
                              }
                            }}
                            className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-all text-xs font-medium flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Onaylanan/Reddedilen Transferler */}
              {pendingTransfers.filter(t => t.status !== 'pending').map((transfer) => (
                <div key={transfer.id} className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transfer.status === 'accepted' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}>
                        {transfer.status === 'accepted' ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                          <XCircle className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getTransferTypeColor(transfer.transfer_type)}`}>
                            {getTransferTypeLabel(transfer.transfer_type)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(transfer.status)}`}>
                            {getStatusLabel(transfer.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {transfer.from_user?.first_name} {transfer.from_user?.last_name} → {transfer.to_user?.first_name} {transfer.to_user?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(transfer.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div className="bg-slate-800/40 rounded-lg p-4 mb-4">
                    <p className="text-slate-300 text-sm">{transfer.reason}</p>
                  </div>

                  <div className="text-xs text-slate-400">
                    Talep eden: {transfer.requester?.first_name} {transfer.requester?.last_name}
                    {transfer.status === 'rejected' && transfer.rejection_reason && (
                      <div className="mt-1 text-red-400">
                        Red nedeni: {transfer.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Eski Transfer Geçmişi */}
              {transferHistory.length === 0 && pendingTransfers.filter(t => t.status !== 'pending').length === 0 ? (
                <div className="text-center py-12 bg-slate-700/20 rounded-xl border border-slate-600/30">
                  <MessageSquare className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h5 className="text-lg font-semibold text-white mb-2">Geçmiş Yok</h5>
                  <p className="text-slate-400">Bu görev için yönlendirme geçmişi bulunmuyor</p>
                </div>
              ) : (
                transferHistory.map((transfer) => (
                  <div key={transfer.id} className="bg-slate-700/20 rounded-xl p-6 border border-slate-600/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getTransferTypeColor(transfer.transfer_type)}`}>
                              {getTransferTypeLabel(transfer.transfer_type)}
                            </span>
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded text-xs font-medium">
                              Tamamlandı
                            </span>
                          </div>
                          <p className="text-sm text-slate-300">
                            {transfer.from_user?.first_name} {transfer.from_user?.last_name} → {transfer.to_user?.first_name} {transfer.to_user?.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(transfer.transferred_at).toLocaleString('tr-TR')}
                      </div>
                    </div>

                    <div className="bg-slate-800/40 rounded-lg p-4 mb-4">
                      <p className="text-slate-300 text-sm">{transfer.reason}</p>
                    </div>

                    <div className="text-xs text-slate-400">
                      Yönlendiren: {transfer.transferrer?.first_name} {transfer.transferrer?.last_name}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
