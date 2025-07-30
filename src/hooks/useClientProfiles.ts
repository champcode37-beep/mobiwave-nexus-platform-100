import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ClientProfile = {
  id: string;
  user_id: string;
  client_name: string;
  username: string;
  password_hash: string;
  email?: string;
  phone?: string;
  sms_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  metadata: any;
};

export type NewClientProfile = {
  client_name: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  sms_balance?: number;
};

// Fetch all client profiles for the current user
const fetchClientProfiles = async (): Promise<ClientProfile[]> => {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
};

// Create a new client profile
const createClientProfile = async (profileData: NewClientProfile): Promise<ClientProfile> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Simple password hashing (in production, use proper bcrypt or similar)
  const password_hash = btoa(profileData.password); // Base64 encoding for demo

  const { data, error } = await supabase
    .from('client_profiles')
    .insert([{
      user_id: user.id,
      client_name: profileData.client_name,
      username: profileData.username,
      password_hash,
      email: profileData.email,
      phone: profileData.phone,
      sms_balance: profileData.sms_balance || 0
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Update a client profile
const updateClientProfile = async ({ id, updates }: { id: string; updates: Partial<ClientProfile> }): Promise<ClientProfile> => {
  const updateData = { ...updates };
  
  // If password is being updated, hash it
  if ('password' in updates) {
    updateData.password_hash = btoa((updates as any).password);
    delete (updateData as any).password;
  }

  const { data, error } = await supabase
    .from('client_profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Delete a client profile
const deleteClientProfile = async (profileId: string): Promise<void> => {
  const { error } = await supabase
    .from('client_profiles')
    .delete()
    .eq('id', profileId);

  if (error) {
    throw new Error(error.message);
  }
};

export function useClientProfiles() {
  const queryClient = useQueryClient();

  const { data: clientProfiles, isLoading, error } = useQuery<ClientProfile[], Error>({
    queryKey: ['clientProfiles'],
    queryFn: fetchClientProfiles,
  });

  const createProfileMutation = useMutation<ClientProfile, Error, NewClientProfile>({
    mutationFn: createClientProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientProfiles'] });
      toast.success('Client profile created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create client profile: ${error.message}`);
    },
  });

  const updateProfileMutation = useMutation<ClientProfile, Error, { id: string; updates: Partial<ClientProfile> }>({
    mutationFn: updateClientProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientProfiles'] });
      toast.success('Client profile updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update client profile: ${error.message}`);
    },
  });

  const deleteProfileMutation = useMutation<void, Error, string>({
    mutationFn: deleteClientProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientProfiles'] });
      toast.success('Client profile deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete client profile: ${error.message}`);
    },
  });

  return {
    clientProfiles,
    isLoading,
    error,
    createClientProfile: createProfileMutation,
    updateClientProfile: updateProfileMutation,
    deleteClientProfile: deleteProfileMutation,
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    isDeleting: deleteProfileMutation.isPending,
  };
}