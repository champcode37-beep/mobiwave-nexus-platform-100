import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface ServiceActivationRequest {
  serviceId: number;
  businessJustification?: string;
  expectedUsage?: string;
  priority?: string;
}

export const useServiceActivation = () => {
  const queryClient = useQueryClient();
  const { user, clientProfile, isClientProfile } = useAuth();

  const requestServiceActivation = useMutation({
    mutationFn: async ({ serviceId, businessJustification, expectedUsage, priority = 'medium' }: ServiceActivationRequest) => {
      const currentUserId = isClientProfile ? clientProfile?.id : user?.id;
      if (!currentUserId) throw new Error('User not authenticated');

      // Create a service activation request (not direct subscription)
      const { data, error } = await supabase
        .from('service_activation_requests')
        .insert({
          user_id: currentUserId,
          service_id: serviceId,
          business_justification: businessJustification || 'Service access request',
          expected_usage: expectedUsage || 'Standard usage',
          priority: priority,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-activation-requests-user'] });
      toast.success('Service access request submitted successfully. Admin approval required.');
    },
    onError: (error: any) => {
      toast.error(`Failed to request service activation: ${error.message}`);
    }
  });

  return {
    requestServiceActivation: requestServiceActivation.mutateAsync,
    isRequesting: requestServiceActivation.isPending
  };
};
