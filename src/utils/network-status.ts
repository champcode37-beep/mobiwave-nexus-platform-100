// Network status utility to handle Supabase connectivity issues

let supabaseStatus = 'unknown'; // 'online', 'offline', 'unknown'
let lastCheck = 0;
const CHECK_INTERVAL = 30000; // 30 seconds

export const checkSupabaseConnectivity = async (): Promise<boolean> => {
  const now = Date.now();
  
  // Use cached status if check was recent
  if (now - lastCheck < CHECK_INTERVAL && supabaseStatus !== 'unknown') {
    return supabaseStatus === 'online';
  }
  
  try {
    // Simple connectivity check to Supabase
    const response = await fetch('https://axkvnjozueyhjdmmbjgg.supabase.co/rest/v1/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const isOnline = response.ok || response.status === 401; // 401 is expected for unauthenticated requests
    supabaseStatus = isOnline ? 'online' : 'offline';
    lastCheck = now;
    
    console.log(`Supabase connectivity check: ${supabaseStatus}`);
    return isOnline;
  } catch (error) {
    console.warn('Supabase connectivity check failed:', error);
    supabaseStatus = 'offline';
    lastCheck = now;
    return false;
  }
};

export const getSupabaseStatus = () => supabaseStatus;

export const isSupabaseOnline = async (): Promise<boolean> => {
  return await checkSupabaseConnectivity();
};

// Auto-check connectivity on module load
checkSupabaseConnectivity().catch(() => {
  console.warn('Initial Supabase connectivity check failed');
});
