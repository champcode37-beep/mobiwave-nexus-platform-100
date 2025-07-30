import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Edit, 
  Trash2, 
  Calendar,
  Database,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useDataHubRecords } from '@/hooks/useDataHubRecords';
import { useDataHubModels } from '@/hooks/useDataHubModels';
import { formatDistanceToNow } from 'date-fns';

interface DataHubRecordsListProps {
  selectedModelId: string;
}

export function DataHubRecordsList({ selectedModelId }: DataHubRecordsListProps) {
  const { models } = useDataHubModels();
  const { 
    records, 
    isLoading, 
    deleteRecord,
    isDeletingRecord,
    refetch
  } = useDataHubRecords(selectedModelId);

  const selectedModel = models?.find(m => m.id === selectedModelId);

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      await deleteRecord.mutateAsync(recordId);
    }
  };

  if (!selectedModelId) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a data model</h3>
            <p className="text-gray-600">Choose a data model from the Models tab to view its records</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Records for {selectedModel?.name}
          </h2>
          <p className="text-gray-600">
            {records?.length || 0} records found
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {!records || records.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
              <p className="text-gray-600 mb-4">This data model doesn't have any records yet</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Record
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-lg">Record #{record.id.slice(-8)}</CardTitle>
                  </div>
                  <Badge variant={record.is_active ? 'default' : 'secondary'}>
                    {record.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Data:</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(record.data, null, 2)}
                  </pre>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDistanceToNow(new Date(record.created_at))} ago</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement edit functionality
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRecord(record.id)}
                    disabled={isDeletingRecord}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}