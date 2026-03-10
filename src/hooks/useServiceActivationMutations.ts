import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useServiceActivationMutations = () => {
  const queryClient = useQueryClient();

  const approveServiceRequest = useMutation({
    mutationFn: async (requestId: string) => {
      try {
        // Since service_activation_requests table doesn't exist, we'll work with user_service_subscriptions
        const { data, error } = await supabase
          .from('user_service_subscriptions')
          .update({ status: 'active', activated_at: new Date().toISOString() })
          .eq('id', requestId)
          .select()
          .single();

        if (error) {
          throw new Error(`Error approving service request: ${error.message}`);
        }
        return data;
      } catch (error: any) {
        throw new Error(`Error approving service request: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-activation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-service-activations'] });
      toast.success('Service request approved successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to approve request: ${error.message}`);
    }
  });

  const rejectServiceRequest = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      try {
        const { data, error } = await supabase
          .from('user_service_subscriptions')
          .update({ status: 'rejected' })
          .eq('id', requestId)
          .select()
          .single();

        if (error) {
          throw new Error(`Error rejecting service request: ${error.message}`);
        }
        return data;
      } catch (error: any) {
        throw new Error(`Error rejecting service request: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-activation-requests'] });
      toast.success('Service request rejected');
    },
    onError: (error: any) => {
      toast.error(`Failed to reject request: ${error.message}`);
    }
  });

  const deactivateUserService = useMutation({
    mutationFn: async ({ userId, serviceId }: { userId: string; serviceId: string }) => {
      try {
        const { data, error } = await supabase
          .from('user_service_subscriptions')
          .update({ status: 'inactive' })
          .eq('user_id', userId)
          .eq('service_id', serviceId)
          .select()
          .single();

        if (error) {
          throw new Error(`Error deactivating service: ${error.message}`);
        }
        return data;
      } catch (error: any) {
        throw new Error(`Error deactivating service: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-service-activations'] });
      toast.success('Service deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to deactivate service: ${error.message}`);
    }
  });

  return {
    approveServiceRequest,
    rejectServiceRequest,
    deactivateUserService,
    isApproving: approveServiceRequest.isLoading,
    isRejecting: rejectServiceRequest.isLoading
  };
};