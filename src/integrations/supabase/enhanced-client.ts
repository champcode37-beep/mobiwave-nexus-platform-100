// Enhanced Supabase client with better error handling and connectivity checks
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { checkSupabaseConnectivity } from '@/utils/network-status';

const SUPABASE_URL = "https://axkvnjozueyhjdmmbjgg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a3Zuam96dWV5aGpkbW1iamdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzU0MTgsImV4cCI6MjA2ODk1MTQxOH0.S9BzFd4Ks9TjpmtdzzCqWKsN5uxcIl1CO71ebShahvA";

// Create the base client
const baseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'mobiwave-sms-web'
    }
  }
});

// Enhanced client with error handling
class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>;
  private isOnline = true;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
    this.setupConnectivityMonitoring();
  }

  private setupConnectivityMonitoring() {
    // Check connectivity every 30 seconds
    setInterval(async () => {
      this.isOnline = await checkSupabaseConnectivity();
    }, 30000);
  }

  // Wrapper for auth methods with enhanced error handling
  get auth() {
    const originalAuth = this.client.auth;
    
    return {
      ...originalAuth,
      getSession: async () => {
        try {
          if (!this.isOnline) {
            console.warn('Supabase appears to be offline, skipping session check');
            return { data: { session: null }, error: null };
          }
          
          return await originalAuth.getSession();
        } catch (error: any) {
          console.error('Enhanced client: getSession failed:', error);
          
          if (error.message?.includes('Failed to fetch')) {
            this.isOnline = false;
            return { data: { session: null }, error: null };
          }
          
          throw error;
        }
      },
      
      getUser: async () => {
        try {
          if (!this.isOnline) {
            console.warn('Supabase appears to be offline, skipping user check');
            return { data: { user: null }, error: null };
          }
          
          return await originalAuth.getUser();
        } catch (error: any) {
          console.error('Enhanced client: getUser failed:', error);
          
          if (error.message?.includes('Failed to fetch')) {
            this.isOnline = false;
            return { data: { user: null }, error: null };
          }
          
          throw error;
        }
      },
      
      onAuthStateChange: originalAuth.onAuthStateChange.bind(originalAuth),
      signInWithPassword: originalAuth.signInWithPassword.bind(originalAuth),
      signUp: originalAuth.signUp.bind(originalAuth),
      signOut: originalAuth.signOut.bind(originalAuth),
      resetPasswordForEmail: originalAuth.resetPasswordForEmail.bind(originalAuth)
    };
  }

  // Wrapper for database methods
  from(table: string) {
    const query = this.client.from(table as any);
    
    // Add error handling to common query methods
    const originalSelect = query.select.bind(query);
    const originalInsert = query.insert.bind(query);
    const originalUpdate = query.update.bind(query);
    const originalDelete = query.delete.bind(query);
    
    return {
      ...query,
      select: (...args: any[]) => {
        const result = originalSelect(...args);
        
        // Wrap the promise to handle network errors
        const originalThen = result.then.bind(result);
        result.then = (onFulfilled?: any, onRejected?: any) => {
          return originalThen(
            onFulfilled,
            (error: any) => {
              if (error?.message?.includes('Failed to fetch')) {
                console.warn(`Database query to ${table} failed due to network issues`);
                this.isOnline = false;
              }
              
              if (onRejected) {
                return onRejected(error);
              }
              throw error;
            }
          );
        };
        
        return result;
      },
      
      insert: (...args: any[]) => originalInsert(...args),
      update: (...args: any[]) => originalUpdate(...args),
      delete: (...args: any[]) => originalDelete(...args)
    };
  }

  // Wrapper for functions
  get functions() {
    const originalFunctions = this.client.functions;
    
    return {
      ...originalFunctions,
      invoke: async (functionName: string, options?: any) => {
        try {
          if (!this.isOnline) {
            throw new Error(`Function ${functionName} unavailable - Supabase appears to be offline`);
          }
          
          return await originalFunctions.invoke(functionName, options);
        } catch (error: any) {
          console.error(`Enhanced client: Function ${functionName} failed:`, error);
          
          if (error.message?.includes('Failed to fetch')) {
            this.isOnline = false;
            throw new Error(`Function ${functionName} unavailable due to network connectivity issues`);
          }
          
          throw error;
        }
      }
    };
  }
}

// Export enhanced client instance
export const enhancedSupabase = new EnhancedSupabaseClient(baseClient);

// Export original client for cases where enhanced wrapper isn't needed
export { baseClient as supabase };
