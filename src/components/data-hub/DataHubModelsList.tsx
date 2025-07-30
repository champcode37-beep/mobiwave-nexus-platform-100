import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Edit, 
  Trash2, 
  Calendar,
  FileText,
  Plus
} from 'lucide-react';
import { useDataHubModels } from '@/hooks/useDataHubModels';
import { formatDistanceToNow } from 'date-fns';

interface DataHubModelsListProps {
  onModelSelect: (modelId: string) => void;
  selectedModelId: string;
}

export function DataHubModelsList({ onModelSelect, selectedModelId }: DataHubModelsListProps) {
  const { 
    models, 
    isLoading, 
    deleteModel,
    isDeletingModel 
  } = useDataHubModels();

  const handleDeleteModel = async (modelId: string) => {
    if (window.confirm('Are you sure you want to delete this model? This will also delete all associated records.')) {
      await deleteModel.mutateAsync(modelId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data models found</h3>
            <p className="text-gray-600 mb-4">Create your first data model to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((model) => (
        <Card 
          key={model.id} 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedModelId === model.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onModelSelect(model.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">{model.name}</CardTitle>
              </div>
              <Badge variant={model.is_active ? 'default' : 'secondary'}>
                {model.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {model.description && (
              <p className="text-sm text-gray-600 mt-2">{model.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{Array.isArray(model.fields) ? model.fields.length : 0} fields</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDistanceToNow(new Date(model.created_at))} ago</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModel(model.id);
                }}
                disabled={isDeletingModel}
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
  );
}