import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DataHubRecord = {
  id: string;
  user_id: string;
  model_id: string;
  data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NewDataHubRecord = {
  model_id: string;
  data: any;
};

// Fetch all records for a specific model
const fetchDataHubRecords = async (modelId: string): Promise<DataHubRecord[]> => {
  if (!modelId) return [];

  const { data, error } = await supabase
    .from('data_hub_records')
    .select('*')
    .eq('model_id', modelId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
};

// Create a new record
const createDataHubRecord = async (recordData: NewDataHubRecord): Promise<DataHubRecord> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('data_hub_records')
    .insert([{
      user_id: user.id,
      model_id: recordData.model_id,
      data: recordData.data
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Update a record
const updateDataHubRecord = async ({ id, updates }: { id: string; updates: Partial<DataHubRecord> }): Promise<DataHubRecord> => {
  const { data, error } = await supabase
    .from('data_hub_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Delete a record
const deleteDataHubRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase
    .from('data_hub_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    throw new Error(error.message);
  }
};

export function useDataHubRecords(modelId: string) {
  const queryClient = useQueryClient();

  const { data: records, isLoading, error, refetch } = useQuery<DataHubRecord[], Error>({
    queryKey: ['dataHubRecords', modelId],
    queryFn: () => fetchDataHubRecords(modelId),
    enabled: !!modelId,
  });

  const createRecordMutation = useMutation<DataHubRecord, Error, NewDataHubRecord>({
    mutationFn: createDataHubRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataHubRecords', modelId] });
      toast.success('Record created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create record: ${error.message}`);
    },
  });

  const updateRecordMutation = useMutation<DataHubRecord, Error, { id: string; updates: Partial<DataHubRecord> }>({
    mutationFn: updateDataHubRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataHubRecords', modelId] });
      toast.success('Record updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update record: ${error.message}`);
    },
  });

  const deleteRecordMutation = useMutation<void, Error, string>({
    mutationFn: deleteDataHubRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataHubRecords', modelId] });
      toast.success('Record deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete record: ${error.message}`);
    },
  });

  return {
    records,
    isLoading,
    error,
    refetch,
    createRecord: createRecordMutation,
    updateRecord: updateRecordMutation,
    deleteRecord: deleteRecordMutation,
    isCreatingRecord: createRecordMutation.isPending,
    isUpdatingRecord: updateRecordMutation.isPending,
    isDeletingRecord: deleteRecordMutation.isPending,
  };
}