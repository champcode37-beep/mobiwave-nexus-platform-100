
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessage {
  id: string;
  subscription_id: string;
  recipient_phone: string;
  message_type: string;
  content: string;
  template_name?: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_reason?: string;
  created_at: string;
}

const fetchWhatsAppMessages = async (subscriptionId?: string): Promise<WhatsAppMessage[]> => {
  // Return empty array since whatsapp_messages table doesn't exist in current schema
  return [];
};

export const useWhatsAppMessagesData = (subscriptionId?: string) => {
  return useQuery({
    queryKey: ['whatsapp-messages', subscriptionId],
    queryFn: () => fetchWhatsAppMessages(subscriptionId),
    enabled: !!subscriptionId
  });
};
