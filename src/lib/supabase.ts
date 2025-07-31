import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://riacmnpxjsbrppzfjeur.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWNtbnB4anNicnBwemZqZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzUxODIsImV4cCI6MjA2OTQxMTE4Mn0.kYOmpbDvos5aghqzGNjK7ArtEnc8z4X0-fnGErEdJ1Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
