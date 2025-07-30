import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApiCredential {
  id: string;
  user_id: string;
  username: string;
  service_name: string;
  api_key_encrypted?: string;
  additional_config?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  last_used_at?: string;
  permissions?: string[];
  rate_limit?: number;
}

export const useSecureApiCredentials = () => {
  const queryClient = useQueryClient();

  const { data: credentials = [], isLoading, error } = useQuery({
    queryKey: ['api-credentials'],
    queryFn: async (): Promise<ApiCredential[]> => {
      const { data, error } = await supabase
        .from('api_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Ensure username is present for type safety
      return (data || []).map((row: any) => ({
        ...row,
        username: row.username ?? ''
      }));
    }
  });

  // Save credential directly to database
  const saveCredential = useMutation({
    mutationFn: async ({ service_name, api_key, user_id, username }: { service_name: string; api_key: string; user_id: string; username: string }) => {
      const { data, error } = await supabase
        .from('api_credentials')
        .insert({
          service_name,
          api_key_encrypted: api_key, // Store directly
          user_id,
          username,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to save credentials');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      toast.success('API credentials saved successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to save credentials: ${error.message}`);
    }
  });

  const updateCredential = useMutation({
    mutationFn: async ({ id, api_key }: { id: string; api_key: string }) => {
      const { data, error } = await supabase
        .from('api_credentials')
        .update({ api_key_encrypted: api_key }) // Store directly
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update credentials');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      toast.success('API credential updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update credential: ${error.message}`);
    }
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_credentials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      toast.success('API credential deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete credential: ${error.message}`);
    }
  });

  const getDecryptedCredential = async (serviceName: string): Promise<string | null> => {
    // For security, don't return decrypted credentials to client
    return null;
  };

  // Generate API key functionality (previously in useApiKeys)
  const generateApiKey = useMutation({
    mutationFn: async ({
      keyName,
      serviceName = 'mspace',
      permissions = [],
      rateLimit = 1000,
      expiresAt
    }: {
      keyName: string;
      serviceName?: string;
      permissions?: string[];
      rateLimit?: number;
      expiresAt?: string;
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      // Generate a random API key
      const apiKey = `${serviceName}_${keyName.includes('live') ? 'live' : 'test'}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      const { data, error } = await supabase
        .from('api_credentials')
        .insert({
          service_name: serviceName,
          api_key_encrypted: apiKey, // Store directly
          user_id: user.data.user.id,
          username: keyName,
          is_active: true,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to generate API key');
      }

      return {
        ...data,
        api_key: apiKey // Return the unencrypted key for one-time display
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      toast.success('API key created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create API key: ${error.message}`);
    }
  });

  // Toggle API key functionality (previously in useApiKeys)
  const toggleApiKey = useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('api_credentials')
        .update({ is_active: isActive })
        .eq('id', keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      toast.success('API key updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update API key: ${error.message}`);
    }
  });

  // Get API usage functionality (mock implementation since api_usage table doesn't exist)
  const getApiUsage = async (keyId: string) => {
    try {
      // Return empty array since api_usage table doesn't exist in current schema
      return [];
    } catch (error) {
      console.error('Error fetching API usage:', error);
      return [];
    }
  };

  return {
    // Original functionality
    credentials,
    isLoading,
    error,
    saveCredential: saveCredential.mutateAsync,
    updateCredential: updateCredential.mutateAsync,
    deleteCredential: deleteCredential.mutateAsync,
    getDecryptedCredential,
    isSaving: saveCredential.isPending,
    isUpdating: updateCredential.isPending,
    isDeleting: deleteCredential.isPending,
    
    // Added functionality from useApiKeys
    generateApiKey: generateApiKey.mutateAsync,
    toggleApiKey: toggleApiKey.mutateAsync,
    getApiUsage,
    isGenerating: generateApiKey.isPending,
    isToggling: toggleApiKey.isPending
  };
};
