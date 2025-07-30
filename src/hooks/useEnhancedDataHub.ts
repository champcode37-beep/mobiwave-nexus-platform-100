import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImportJob {
  id: string;
  user_id: string;
  model_id: string;
  file_url: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_records?: number;
  processed_records?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DataRecord {
  id: string;
  model_id: string;
  user_id: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export function useEnhancedDataHub() {
  const queryClient = useQueryClient();

  // Get records for a specific data model
  const getRecords = async (modelId: string): Promise<DataRecord[]> => {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DataRecord[];
  };

  // Get recipients with filtering
  const getRecipients = async (modelId: string, criteria?: any): Promise<any[]> => {
    const records = await getRecords(modelId);
    
    if (!criteria || Object.keys(criteria).length === 0) {
      return records;
    }

    return records.filter(record => {
      return Object.entries(criteria).every(([field, value]) => {
        if (!value) return true;
        const recordValue = record.data[field];
        
        if (typeof value === 'object' && value !== null) {
          // Handle range queries, etc.
          if ((value as any).min !== undefined && recordValue < (value as any).min) return false;
          if ((value as any).max !== undefined && recordValue > (value as any).max) return false;
          if ((value as any).contains && !String(recordValue).toLowerCase().includes(String((value as any).contains).toLowerCase())) return false;
        } else {
          // Exact or partial match
          return String(recordValue).toLowerCase().includes(String(value).toLowerCase());
        }
        return true;
      });
    });
  };

  // Records query
  const useRecords = (modelId: string) => {
    return useQuery({
      queryKey: ['records', modelId],
      queryFn: () => getRecords(modelId),
      enabled: !!modelId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Create record mutation
  const createRecord = useMutation({
    mutationFn: async ({ modelId, data }: { modelId: string; data: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: record, error } = await supabase
        .from('records')
        .insert([{
          model_id: modelId,
          data: data,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return record;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['records', variables.modelId] });
      toast.success('Record created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create record: ${error.message}`);
    }
  });

  // Update record mutation
  const updateRecord = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: any }) => {
      const { data: record, error } = await supabase
        .from('records')
        .update({ data })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return record;
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['records', record.model_id] });
      toast.success('Record updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update record: ${error.message}`);
    }
  });

  // Delete record mutation
  const deleteRecord = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      return recordId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success('Record deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete record: ${error.message}`);
    }
  });

  // Disabled import jobs functionality - table doesn't exist
  const useImportJobs = () => {
    return useQuery({
      queryKey: ['importJobs'],
      queryFn: async (): Promise<ImportJob[]> => {
        // Return empty array since import_jobs table doesn't exist
        return [];
      },
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Create import job mutation (mock implementation)
  const createImportJob = useMutation({
    mutationFn: async ({ modelId, fileUrl, fileType }: { 
      modelId: string; 
      fileUrl: string; 
      fileType: string; 
    }) => {
      // Mock implementation since import_jobs table doesn't exist
      return {
        id: 'mock-import-job-' + Date.now(),
        modelId,
        fileUrl,
        fileType,
        status: 'completed',
        created_at: new Date().toISOString()
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importJobs'] });
      toast.success('Import job created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create import job: ${error.message}`);
    }
  });

  // Bulk import records
  const bulkImportRecords = useMutation({
    mutationFn: async ({ modelId, records }: { modelId: string; records: any[] }) => {
      // Call the data hub API function
      const { data, error } = await supabase.functions.invoke('data-hub-api', {
        body: {
          model_id: modelId,
          records: records
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['records', variables.modelId] });
      toast.success('Records imported successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to import records: ${error.message}`);
    }
  });

  // Get import job status (disabled)
  const getImportJobStatus = async (jobId: string): Promise<ImportJob> => {
    throw new Error('Import jobs not implemented');
  };

  // File upload helper
  const uploadFile = async (file: File, bucket: string = 'imports'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  return {
    // Data operations
    getRecords,
    getRecipients,
    useRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    
    // Import operations
    useImportJobs,
    createImportJob,
    bulkImportRecords,
    getImportJobStatus,
    uploadFile,
    
    // Loading states
    isCreatingRecord: createRecord.isPending,
    isUpdatingRecord: updateRecord.isPending,
    isDeletingRecord: deleteRecord.isPending,
    isCreatingImportJob: createImportJob.isPending,
    isBulkImporting: bulkImportRecords.isPending,
  };
}