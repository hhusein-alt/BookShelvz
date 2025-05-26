// Configuration file for environment variables and app settings
const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    }
  },
  app: {
    name: 'BookShelvz',
    version: '1.0.0',
    apiTimeout: 30000, // 30 seconds
    maxRetries: 3,
    pdfCacheTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  routes: {
    home: '/',
    login: '/login',
    catalog: '/catalog',
    myshelf: '/myshelf',
    profile: '/profile',
    reader: '/reader',
    admin: '/admin'
  }
};

export default config; 