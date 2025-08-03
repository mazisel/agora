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
        
        // Test message table subscription
        const messageTestChannel = supabase.channel('test-messages');
        
        messageTestChannel
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            (payload) => {
              addLog(`🔥 Message event received: ${payload.eventType}`);
              addLog(`📄 Payload: ${JSON.stringify(payload, null, 2)}`);
            }
          )
          .subscribe((messageStatus) => {
            addLog(`📨 Message subscription status: ${messageStatus}`);
            
            if (messageStatus === 'SUBSCRIBED') {
              addLog('✅ Message table subscription successful!');
            } else if (messageStatus === 'CHANNEL_ERROR') {
              addLog('❌ Message table subscription failed!');
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
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          content: `Test message from realtime test - ${new Date().toISOString()}`,
          message_type: 'text'
        })
        .select()
        .single();
        
      if (error) {
        addLog(`❌ Error sending test message: ${error.message}`);
      } else {
        addLog(`✅ Test message sent successfully: ${message.id}`);
      }
    } catch (error) {
      addLog(`❌ Exception sending test message: ${error}`);
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
        
        <button
          onClick={testSendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={status !== 'SUBSCRIBED'}
        >
          Send Test Message
        </button>
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
        <p>WebSocket bağlantısı başarılı olursa, test mesajı gönderebilirsiniz.</p>
        <p>Eğer realtime çalışıyorsa, gönderilen mesaj logda görünecektir.</p>
      </div>
    </div>
  );
}
