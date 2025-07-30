import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MspaceCredentials {
  username: string;
  password: string;
  senderId?: string;
}

export interface BalanceResponse {
  balance: number;
  status: 'success' | 'error';
  error?: string;
}

export interface SendSMSResponse {
  messageId: string;
  responseTime: string;
  status: 'successful' | 'failed';
  error?: string;
}

export interface SubUser {
  smsBalance: string;
  subUserName: string;
}

export interface ResellerClient {
  smsBalance: string;
  clientname: string;
}

export interface TopUpResponse {
  status: 'success' | 'error';
  message: string;
  error?: string;
}

interface MspaceApiRequest {
  operation: 'balance' | 'sendSMS' | 'subUsers' | 'resellerClients' | 'topUpReseller' | 'topUpSub' | 'login';
  credentials?: MspaceCredentials;
  recipient?: string;
  message?: string;
  senderId?: string;
  clientname?: string;
  subaccname?: string;
  noofsms?: number;
}

async function callMspaceApi<T>(request: MspaceApiRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mspace-api', {
    body: request
  });

  if (error) {
    throw new Error('Failed to send a request to the Edge Function');
  }

  if (!data) {
    throw new Error('No response from Mspace API');
  }

  if (!data.success) {
    const errorMessage = data.error || 'Mspace API returned an error';
    
    // Provide better user guidance for credential issues
    if (errorMessage.includes('Mspace credentials not found')) {
      throw new Error('Mspace credentials not configured. Please go to Profile Settings to configure your API credentials.');
    }
    
    throw new Error(errorMessage);
  }

  return data.data;
}

export const useMspaceApi = () => {
  const queryClient = useQueryClient();

  // Check credentials from database
  const { data: hasCredentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ['mspace-credentials-check'],
    queryFn: async (): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
          .from('api_credentials')
          .select('id')
          .eq('user_id', user.id)
          .eq('service_name', 'mspace')
          .eq('is_active', true)
          .single();

        return !error && !!data;
      } catch {
        return false;
      }
    }
  });

  // Balance query
  const balanceQuery = useQuery({
    queryKey: ['mspace-balance'],
    queryFn: () => callMspaceApi<BalanceResponse>({ operation: 'balance' }),
    enabled: hasCredentials,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1
  });

  // Sub users query
  const subUsersQuery = useQuery({
    queryKey: ['mspace-sub-users'],
    queryFn: () => callMspaceApi<SubUser[]>({ operation: 'subUsers' }),
    enabled: hasCredentials,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Reseller clients query
  const resellerClientsQuery = useQuery({
    queryKey: ['mspace-reseller-clients'],
    queryFn: () => callMspaceApi<ResellerClient[]>({ operation: 'resellerClients' }),
    enabled: hasCredentials,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Send SMS mutation
  const sendSMS = useMutation({
    mutationFn: async ({ recipient, message, senderId }: { recipient: string; message: string; senderId?: string }) => {
      return callMspaceApi<SendSMSResponse>({
        operation: 'sendSMS',
        recipient,
        message,
        senderId
      });
    },
    onSuccess: (data) => {
      if (data.status === 'successful') {
        toast.success(`SMS sent successfully! Message ID: ${data.messageId}`);
        queryClient.invalidateQueries({ queryKey: ['mspace-balance'] });
      } else {
        toast.error(`SMS failed: ${data.error || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    }
  });

  // Top up reseller client mutation
  const topUpResellerClient = useMutation({
    mutationFn: async ({ clientname, noofsms }: { clientname: string; noofsms: number }) => {
      return callMspaceApi<TopUpResponse>({
        operation: 'topUpReseller',
        clientname,
        noofsms
      });
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['mspace-balance'] });
        queryClient.invalidateQueries({ queryKey: ['mspace-reseller-clients'] });
      } else {
        toast.error(data.error || 'Top-up failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to top up reseller client: ${error.message}`);
    }
  });

  // Top up sub account mutation
  const topUpSubAccount = useMutation({
    mutationFn: async ({ subaccname, noofsms }: { subaccname: string; noofsms: number }) => {
      return callMspaceApi<TopUpResponse>({
        operation: 'topUpSub',
        subaccname,
        noofsms
      });
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['mspace-balance'] });
        queryClient.invalidateQueries({ queryKey: ['mspace-sub-users'] });
      } else {
        toast.error(data.error || 'Top-up failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to top up sub account: ${error.message}`);
    }
  });

  // Test credentials mutation
  const testCredentials = useMutation({
    mutationFn: async (credentials?: MspaceCredentials) => {
      return callMspaceApi<{ status: string; message: string }>({
        operation: 'login',
        credentials
      });
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast.success('Credentials are valid!');
      } else {
        toast.error('Invalid credentials');
      }
    },
    onError: (error: Error) => {
      toast.error(`Credential test failed: ${error.message}`);
    }
  });

  // Check balance manually
  const checkBalance = useMutation({
    mutationFn: () => callMspaceApi<BalanceResponse>({ operation: 'balance' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['mspace-balance'], data);
      if (data.status === 'success') {
        toast.success(`Balance: ${data.balance} SMS credits`);
      } else {
        toast.error(`Balance check failed: ${data.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to check balance: ${error.message}`);
    }
  });

  return {
    // Data
    balance: balanceQuery.data,
    subUsers: subUsersQuery.data || [],
    resellerClients: resellerClientsQuery.data || [],
    
    // Status
    hasCredentials: hasCredentials || false,
    credentialsLoading,
    isLoadingBalance: balanceQuery.isLoading,
    isLoadingSubUsers: subUsersQuery.isLoading,
    isLoadingResellerClients: resellerClientsQuery.isLoading,
    
    // Mutations
    sendSMS,
    topUpResellerClient,
    topUpSubAccount,
    testCredentials,
    checkBalance,
    
    // Loading states
    isSendingSMS: sendSMS.isPending,
    isToppingUpReseller: topUpResellerClient.isPending,
    isToppingUpSub: topUpSubAccount.isPending,
    isTestingCredentials: testCredentials.isPending,
    isCheckingBalance: checkBalance.isPending,
    
    // Refresh functions
    refreshBalance: () => queryClient.invalidateQueries({ queryKey: ['mspace-balance'] }),
    refreshSubUsers: () => queryClient.invalidateQueries({ queryKey: ['mspace-sub-users'] }),
    refreshResellerClients: () => queryClient.invalidateQueries({ queryKey: ['mspace-reseller-clients'] }),
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: ['mspace-balance'] });
      queryClient.invalidateQueries({ queryKey: ['mspace-sub-users'] });
      queryClient.invalidateQueries({ queryKey: ['mspace-reseller-clients'] });
    }
  };
};
