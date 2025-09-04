'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestRealtimePage() {
  const [status, setStatus] = useState<string>('Connecting...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    addLog('🔌 Testing Supabase Realtime connection...');

    // Test basic connection
    const testChannel = supabase.channel('test-basic-connection');
    
    testChannel.subscribe((status) => {
      addLog(`📡 Basic connection status: ${status}`);
      setStatus(status);
      
      if (status === 'SUBSCRIBED') {
        addLog('✅ Basic WebSocket connection successful!');
        
        // Test notifications table subscription
        const notificationTestChannel = supabase.channel('test-notifications');
        
        notificationTestChannel
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            (payload) => {
              addLog(`🔥 Notification event received: ${payload.eventType}`);
              addLog(`📄 Payload: ${JSON.stringify(payload, null, 2)}`);
            }
          )
          .subscribe((notificationStatus) => {
            addLog(`📨 Notification subscription status: ${notificationStatus}`);
            
            if (notificationStatus === 'SUBSCRIBED') {
              addLog('✅ Notification table subscription successful!');
            } else if (notificationStatus === 'CHANNEL_ERROR') {
              addLog('❌ Notification table subscription failed!');
            }
          });
          
      } else if (status === 'CHANNEL_ERROR') {
        addLog('❌ Basic WebSocket connection failed!');
      } else if (status === 'CLOSED') {
        addLog('🔒 WebSocket connection closed!');
      }
    });

    return () => {
      testChannel.unsubscribe();
      addLog('🧹 Cleaned up test connections');
    };
  }, []);

  const testSendMessage = async () => {
    try {
      addLog('📤 Testing message send...');
      
      // Get first channel
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .limit(1);
        
      if (!channels || channels.length === 0) {
        addLog('❌ No channels found to test with');
        return;
      }
      
      const channelId = channels[0].id;
      addLog(`📍 Using channel: ${channelId}`);
      
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: user?.id,
          title: 'Test Notification',
          message: `Test notification from realtime test - ${new Date().toISOString()}`,
          type: 'general'
        })
        .select()
        .single();
        
      if (error) {
        addLog(`❌ Error sending test notification: ${error.message}`);
      } else {
        addLog(`✅ Test notification sent successfully: ${notification.id}`);
        addLog('⏳ Waiting for WebSocket event... (should appear in 1-2 seconds)');
      }
    } catch (error) {
      addLog(`❌ Exception sending test message: ${error}`);
    }
  };

  const checkRealtimeSettings = async () => {
    try {
      addLog('🔍 Checking Supabase Realtime settings...');
      
      // Test if we can get realtime info
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);
        
      if (error) {
        addLog(`❌ Database access error: ${error.message}`);
      } else {
        addLog('✅ Database access working');
      }
      
      // Check if realtime is enabled by trying to subscribe to a simple channel
      const testChannel2 = supabase.channel('settings-test');
      
      testChannel2
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          (payload) => {
            addLog(`🎯 Direct notification event: ${payload.eventType}`);
          }
        )
        .subscribe((status) => {
          addLog(`🔧 Settings test channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            addLog('✅ Realtime subscription working for notifications table');
          } else if (status === 'CHANNEL_ERROR') {
            addLog('❌ Realtime NOT enabled for notifications table in Supabase dashboard!');
            addLog('💡 Go to Supabase Dashboard > Database > Replication and enable realtime for notifications table');
          }
        });
        
    } catch (error) {
      addLog(`❌ Settings check error: ${error}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Realtime Test</h1>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">Connection Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            status === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' :
            status === 'CHANNEL_ERROR' || status === 'CLOSED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {status}
          </span>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={testSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={status !== 'SUBSCRIBED'}
          >
            Send Test Message
          </button>
          
          <button
            onClick={checkRealtimeSettings}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Check Realtime Settings
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Realtime Logs:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Bu sayfa Supabase Realtime bağlantısını test eder.</p>
        <p>WebSocket bağlantısı başarılı olursa, test verisi gönderebilirsiniz.</p>
        <p>Eğer realtime çalışıyorsa, gönderilen veri logda görünecektir.</p>
      </div>
    </div>
  );
}
