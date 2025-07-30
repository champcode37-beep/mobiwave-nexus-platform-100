import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface UserCredits {
  id: string;
  user_id: string;
  service_type: string;
  credits: number;
  credits_remaining: number; // For backward compatibility
  credits_purchased: number; // For backward compatibility
  created_at: string;
  updated_at: string;
}

export const useUserCredits = () => {
  const queryClient = useQueryClient();
  const { user, clientProfile, isClientProfile } = useAuth();

  const { data: credits, isLoading, error } = useQuery({
    queryKey: ['user-credits', isClientProfile ? clientProfile?.id : user?.id],
    queryFn: async (): Promise<UserCredits | null> => {
      let currentUserId: string;

      if (isClientProfile && clientProfile) {
        // For client profiles, fetch SMS balance from client_profiles table
        const { data: clientData, error: clientError } = await supabase
          .from('client_profiles')
          .select('sms_balance')
          .eq('id', clientProfile.id)
          .single();

        if (clientError) {
          console.error('Error fetching client profile SMS balance:', clientError);
          // Return default structure if error
          return {
            id: 'default',
            user_id: clientProfile.id,
            service_type: 'sms',
            credits: 0,
            credits_remaining: 0,
            credits_purchased: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }

        // Convert client profile SMS balance to UserCredits format
        const smsBalance = clientData?.sms_balance || 0;
        return {
          id: clientProfile.id,
          user_id: clientProfile.id,
          service_type: 'sms',
          credits: smsBalance,
          credits_remaining: smsBalance,
          credits_purchased: smsBalance,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else if (user) {
        // For regular users, use the user_credits table
        currentUserId = user.id;

        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('service_type', 'sms')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          return {
            ...data,
            credits_remaining: data.credits_remaining || data.credits || 0
          };
        }

        // Return default structure if no record exists
        return {
          id: 'default',
          user_id: currentUserId,
          service_type: 'sms',
          credits: 0,
          credits_remaining: 0,
          credits_purchased: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else {
        return null;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!(user || clientProfile), // Only run query if we have a user
  });

  const purchaseCredits = useMutation({
    mutationFn: async (amount: number) => {
      let currentUserId: string;

      if (isClientProfile && clientProfile) {
        currentUserId = clientProfile.id;
      } else if (user) {
        currentUserId = user.id;
      } else {
        throw new Error('No authenticated user found');
      }

      const { data, error } = await supabase
        .from('user_credits')
        .update({
          credits: (credits?.credits || 0) + amount,
          credits_remaining: (credits?.credits_remaining || 0) + amount,
          credits_purchased: (credits?.credits_purchased || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUserId)
        .eq('service_type', 'sms')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      toast.success('Credits purchased successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to purchase credits: ${error.message}`);
    }
  });

  const refetch = async () => {
    return queryClient.refetchQueries({ queryKey: ['user-credits'] });
  };

  return {
    credits,
    data: credits, // For backward compatibility
    isLoading,
    error,
    purchaseCredits,
    refetch
  };
};
