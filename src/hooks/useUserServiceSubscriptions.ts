import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserServiceSubscription {
  id: string;
  user_id: string;
  service_id: string;
  status: string;
  subscribed_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export const useUserServiceSubscriptions = () => {
  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['user-service-subscriptions'],
    queryFn: async (): Promise<UserServiceSubscription[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_service_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    subscriptions: subscriptions || [],
    isLoading,
    error
  };
};