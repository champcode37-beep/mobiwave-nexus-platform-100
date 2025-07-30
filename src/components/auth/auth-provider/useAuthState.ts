import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ClientProfile } from './AuthContext';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log('Fetching user role for:', userId);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
      );

      const rolePromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const { data: profile, error: profileError } = await Promise.race([
        rolePromise,
        timeoutPromise
      ]) as any;

      if (profileError) {
        console.error('Profile fetch error:', profileError);

        // Don't retry if it's a network issue
        if (profileError.message?.includes('Failed to fetch') || profileError.message?.includes('timeout')) {
          console.warn('Network issue fetching role, defaulting to user');
          return 'user';
        }

        // Only retry for other types of errors
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

          if (!retryError && retryProfile) {
            console.log('Role found on retry:', retryProfile.role);
            return retryProfile.role || 'user';
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }

        console.log('No profile found after retry, defaulting to user');
        return 'user';
      }

      if (profile && profile.role) {
        console.log('Role from profiles table:', profile.role);
        return profile.role;
      }

      console.log('No role found in profile, defaulting to user');
      return 'user';
    } catch (error: any) {
      console.error('Role fetch failed:', error);

      // Handle network connectivity issues gracefully
      if (error.message?.includes('Failed to fetch') || error.message?.includes('timeout')) {
        console.warn('Network connectivity issue fetching role. Defaulting to user.');
      }

      return 'user';
    }
  };

  const checkClientProfileSession = () => {
    try {
      const clientProfileData = localStorage.getItem('clientProfile');
      if (clientProfileData) {
        const profile = JSON.parse(clientProfileData);
        console.log('Found client profile session:', profile.client_name);
        setClientProfile(profile);
        setUserRole('user'); // Client profiles are always 'user' role
        return true;
      }
    } catch (error) {
      console.error('Error parsing client profile session:', error);
      localStorage.removeItem('clientProfile');
    }
    return false;
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setUserRole(null);
          // Don't clear client profile here, it's managed separately
          setIsLoading(false);
          return;
        }

        // Clear client profile if we have a regular auth session
        setClientProfile(null);
        localStorage.removeItem('clientProfile');

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
            console.log('User role set to:', role);
          }, 100);
        } else {
          setUserRole(null);
        }

        setIsLoading(false);
      }
    );

    const getSession = async () => {
      try {
        console.log('Checking for existing session...');

        // First check for client profile session
        const hasClientProfile = checkClientProfileSession();
        if (hasClientProfile) {
          setIsLoading(false);
          return;
        }

        // Add timeout to prevent hanging on network issues
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('Error getting session:', error);

          // If it's a network error, set user as unauthenticated but don't crash
          if (error.message?.includes('Failed to fetch') || error.message?.includes('timeout')) {
            console.warn('Network issue detected, continuing without session');
            setSession(null);
            setUser(null);
            setUserRole(null);
            setIsLoading(false);
            return;
          }

          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Existing session found:', !!session);
          setSession(session);
          setUser(session.user);

          try {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
            console.log('Existing user role:', role);
          } catch (roleError) {
            console.error('Failed to fetch user role:', roleError);
            setUserRole('user'); // Default role
          }
        }
      } catch (error: any) {
        console.error('Session check failed:', error);

        // Handle network/connectivity issues gracefully
        if (error.message?.includes('Failed to fetch') || error.message?.includes('timeout')) {
          console.warn('Network connectivity issue detected. App will continue without authentication.');
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    clientProfile,
    isLoading,
    userRole,
    setUser,
    setSession,
    setClientProfile,
    setUserRole,
    setIsLoading
  };
}
