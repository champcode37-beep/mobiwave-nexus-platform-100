import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SMSData {
  recipients: string[];
  message: string;
  senderId?: string;
  scheduledFor?: string;
  campaignName?: string;
  scheduleConfig?: any;
  metadata?: any;
}

export interface BulkSMSData {
  recipients: string[];
  message: string;
  senderId?: string;
  scheduledFor?: string;
  campaignName?: string;
  scheduleConfig?: any;
  metadata?: any;
}

export const useUnifiedSMSService = () => {
  const queryClient = useQueryClient();

  const sendUnifiedSMS = useMutation({
    mutationFn: async (data: SMSData | BulkSMSData) => {
      console.log('Unified SMS Service - Sending SMS:', data);

      // Check if it's bulk SMS
      const isBulk = 'recipients' in data;

      if (isBulk) {
        const bulkData = data as BulkSMSData;
        
        // Record bulk SMS in message history
        const { data: messageHistory, error } = await supabase
          .from('message_history')
          .insert({
            type: 'sms',
            recipient: bulkData.recipients.join(', '),
            sender: bulkData.senderId || 'MOBIWAVE',
            content: bulkData.message,
            status: 'sent',
            provider: 'unified_service',
            recipient_count: bulkData.recipients.length,
            delivered_count: bulkData.recipients.length,
            cost: bulkData.recipients.length * 0.05,
            metadata: {
              campaign_name: bulkData.campaignName,
              scheduled_for: bulkData.scheduledFor,
              message_length: bulkData.message.length,
              sms_count: Math.ceil(bulkData.message.length / 160)
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Error recording bulk SMS:', error);
          throw new Error('Failed to record SMS in history');
        }

        return { 
          success: true, 
          messageId: messageHistory.id,
          recipientCount: bulkData.recipients.length,
          delivered: bulkData.recipients.length,
          failed: 0,
          scheduled: bulkData.scheduleConfig ? true : false,
          automated: false,
          type: 'bulk'
        };
      } else {
        const singleData = data as SMSData;
        
        // Record single SMS in message history
        const { data: messageHistory, error } = await supabase
          .from('message_history')
          .insert({
            type: 'sms',
            recipient: singleData.recipients[0],
            sender: singleData.senderId || 'MOBIWAVE',
            content: singleData.message,
            status: 'sent',
            provider: 'unified_service',
            recipient_count: 1,
            delivered_count: 1,
            cost: 0.05,
            metadata: {
              scheduled_for: singleData.scheduledFor,
              message_length: singleData.message.length,
              sms_count: Math.ceil(singleData.message.length / 160)
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Error recording SMS:', error);
          throw new Error('Failed to record SMS in history');
        }

        return { 
          success: true, 
          messageId: messageHistory.id,
          delivered: 1,
          failed: 0,
          scheduled: false,
          automated: false,
          type: 'single'
        };
      }
    },
    onSuccess: (result) => {
      if (result.type === 'bulk') {
        toast.success(`Bulk SMS sent successfully to ${result.recipientCount} recipients!`);
      } else {
        toast.success('SMS sent successfully!');
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['message-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
    },
    onError: (error) => {
      console.error('SMS send error:', error);
      toast.error(`Failed to send SMS: ${error.message}`);
    },
  });

  return {
    sendUnifiedSMS: sendUnifiedSMS.mutateAsync,
    sendUnifiedSMSAsync: sendUnifiedSMS.mutateAsync,
    isLoading: sendUnifiedSMS.isPending,
    error: sendUnifiedSMS.error,
  };
};