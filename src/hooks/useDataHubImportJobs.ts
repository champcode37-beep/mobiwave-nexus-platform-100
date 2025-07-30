import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ImportJob = {
  id: string;
  user_id: string;
  model_id: string;
  filename: string;
  file_size?: number;
  status: string;
  progress: number;
  total_records: number;
  processed_records: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
};

export type NewImportJob = {
  model_id: string;
  filename: string;
  file_size?: number;
};

// Fetch all import jobs for the current user
const fetchImportJobs = async (): Promise<ImportJob[]> => {
  const { data, error } = await supabase
    .from('import_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
};

// Create a new import job
const createImportJob = async (jobData: NewImportJob): Promise<ImportJob> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('import_jobs')
    .insert([{
      user_id: user.id,
      model_id: jobData.model_id,
      filename: jobData.filename,
      file_size: jobData.file_size
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Update an import job
const updateImportJob = async ({ id, updates }: { id: string; updates: Partial<ImportJob> }): Promise<ImportJob> => {
  const { data, error } = await supabase
    .from('import_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Delete an import job
const deleteImportJob = async (jobId: string): Promise<void> => {
  const { error } = await supabase
    .from('import_jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    throw new Error(error.message);
  }
};

export function useDataHubImportJobs() {
  const queryClient = useQueryClient();

  const { data: importJobs, isLoading, error, refetch } = useQuery<ImportJob[], Error>({
    queryKey: ['importJobs'],
    queryFn: fetchImportJobs,
  });

  const createJobMutation = useMutation<ImportJob, Error, NewImportJob>({
    mutationFn: createImportJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importJobs'] });
      toast.success('Import job created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create import job: ${error.message}`);
    },
  });

  const updateJobMutation = useMutation<ImportJob, Error, { id: string; updates: Partial<ImportJob> }>({
    mutationFn: updateImportJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importJobs'] });
      toast.success('Import job updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update import job: ${error.message}`);
    },
  });

  const deleteJobMutation = useMutation<void, Error, string>({
    mutationFn: deleteImportJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importJobs'] });
      toast.success('Import job deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete import job: ${error.message}`);
    },
  });

  return {
    importJobs,
    isLoading,
    error,
    refetch,
    createJob: createJobMutation,
    updateJob: updateJobMutation,
    deleteJob: deleteJobMutation,
    isCreatingJob: createJobMutation.isPending,
    isUpdatingJob: updateJobMutation.isPending,
    isDeletingJob: deleteJobMutation.isPending,
  };
}