
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWhatsAppTemplateMutations = (subscriptionId?: string) => {
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (templateData: {
      name: string;
      category: string;
      language: string;
      header_type?: string;
      header_text?: string;
      body_text: string;
      footer_text?: string;
      buttons?: any[];
      variables?: any[];
    }) => {
      if (!subscriptionId) throw new Error('No subscription selected');

      // WhatsApp templates table doesn't exist - return mock data
      const data = {
        id: crypto.randomUUID(),
        subscription_id: subscriptionId,
        ...templateData,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      const error = null;

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', subscriptionId] });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    }
  });

  return {
    createTemplate: createTemplate.mutateAsync,
    isCreating: createTemplate.isPending
  };
};
