import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DataHubModelField = {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone';
};

export type DataHubModel = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  fields: DataHubModelField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NewDataHubModel = {
  name: string;
  description?: string;
  fields?: DataHubModelField[];
};

// Fetch all data hub models for the current user
const fetchDataHubModels = async (): Promise<DataHubModel[]> => {
  const { data, error } = await supabase
    .from('data_hub_models')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  
  return (data || []).map(model => ({
    ...model,
    fields: Array.isArray(model.fields) ? model.fields as DataHubModelField[] : []
  }));
};

// Create a new data hub model
const createDataHubModel = async (modelData: NewDataHubModel): Promise<DataHubModel> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('data_hub_models')
    .insert([{
      user_id: user.id,
      name: modelData.name,
      description: modelData.description,
      fields: modelData.fields || []
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return {
    ...data,
    fields: Array.isArray(data.fields) ? data.fields as DataHubModelField[] : []
  };
};

// Update a data hub model
const updateDataHubModel = async ({ id, updates }: { id: string; updates: Partial<DataHubModel> }): Promise<DataHubModel> => {
  const { data, error } = await supabase
    .from('data_hub_models')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return {
    ...data,
    fields: Array.isArray(data.fields) ? data.fields as DataHubModelField[] : []
  };
};

// Delete a data hub model
const deleteDataHubModel = async (modelId: string): Promise<void> => {
  const { error } = await supabase
    .from('data_hub_models')
    .delete()
    .eq('id', modelId);

  if (error) {
    throw new Error(error.message);
  }
};

export function useDataHubModels() {
  const queryClient = useQueryClient();

  const { data: models, isLoading, error } = useQuery<DataHubModel[], Error>({
    queryKey: ['dataHubModels'],
    queryFn: fetchDataHubModels,
  });

  const createModelMutation = useMutation<DataHubModel, Error, NewDataHubModel>({
    mutationFn: createDataHubModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataHubModels'] });
      toast.success('Data model created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create data model: ${error.message}`);
    },
  });

  const updateModelMutation = useMutation<DataHubModel, Error, { id: string; updates: Partial<DataHubModel> }>({
    mutationFn: updateDataHubModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataHubModels'] });
      toast.success('Data model updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update data model: ${error.message}`);
    },
  });

  const deleteModelMutation = useMutation<void, Error, string>({
    mutationFn: deleteDataHubModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataHubModels'] });
      queryClient.invalidateQueries({ queryKey: ['dataHubRecords'] });
      toast.success('Data model deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete data model: ${error.message}`);
    },
  });

  return {
    models,
    isLoading,
    error,
    createModel: createModelMutation,
    updateModel: updateModelMutation,
    deleteModel: deleteModelMutation,
    isCreatingModel: createModelMutation.isPending,
    isUpdatingModel: updateModelMutation.isPending,
    isDeletingModel: deleteModelMutation.isPending,
  };
}