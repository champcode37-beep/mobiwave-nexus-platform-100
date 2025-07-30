
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  features: string[];
  service_limits: Record<string, number>;
  is_active: boolean;
}

export interface UserPlanSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  plan: SubscriptionPlan;
}

export const useUserPlanSubscription = () => {
  const queryClient = useQueryClient();

  const { data: userPlan, isLoading } = useQuery({
    queryKey: ['user-plan-subscription'],
    queryFn: async (): Promise<UserPlanSubscription | null> => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get user's plan subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_plan_subscriptions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      if (!subscription) return null;

      // Get plan details separately
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', subscription.plan_id)
        .single();

      if (planError) throw planError;

      // Transform the data to match expected interface
      const transformedData: UserPlanSubscription = {
        id: String(subscription.id),
        user_id: subscription.user_id || '',
        plan_id: String(subscription.plan_id),
        status: subscription.status || 'active',
        started_at: subscription.subscribed_at || new Date().toISOString(),
        expires_at: null,
        auto_renew: false,
        plan: {
          id: String(plan.id),
          name: plan.name,
          description: plan.description || '',
          price: plan.price || 0,
          billing_cycle: 'monthly',
          features: [],
          service_limits: {},
          is_active: true
        }
      };

      return transformedData;
    }
  });

  const { data: availablePlans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price');

      if (error) throw error;
      
      // Transform the data to match expected interface
      const transformedData: SubscriptionPlan[] = (data || []).map(plan => ({
        id: String(plan.id),
        name: plan.name,
        description: plan.description || '',
        price: plan.price || 0,
        billing_cycle: 'monthly',
        features: [],
        service_limits: {},
        is_active: true
      }));

      return transformedData;
    }
  });

  const upgradePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Deactivate current plan
      if (userPlan) {
        await supabase
          .from('user_plan_subscriptions')
          .update({ status: 'inactive' })
          .eq('id', parseInt(userPlan.id));
      }

      // Create new plan subscription
      const { data, error } = await supabase
        .from('user_plan_subscriptions')
        .insert({
          user_id: user.user.id,
          plan_id: parseInt(planId),
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-plan-subscription'] });
      toast.success('Plan upgraded successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to upgrade plan: ${error.message}`);
    }
  });

  return {
    userPlan,
    availablePlans,
    isLoading,
    upgradePlan: upgradePlan.mutateAsync,
    isUpgrading: upgradePlan.isPending
  };
};
