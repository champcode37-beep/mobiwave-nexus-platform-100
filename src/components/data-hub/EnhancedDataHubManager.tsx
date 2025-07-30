import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataHubModelsManager } from './DataHubModelsManager';
import { DataHubRecordsManager } from './DataHubRecordsManager';
import { DataHubImportExport } from './DataHubImportExport';
import { ImportJobsMonitor } from './ImportJobsMonitor';
import { Database, Upload, Activity, BarChart3 } from 'lucide-react';
import { useDataHubModels } from '@/hooks/useDataHubModels';

export function EnhancedDataHubManager() {
  const { models = [] } = useDataHubModels();
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Data Hub</h1>
        <p className="text-gray-600">
          Manage your data models, records, and import operations efficiently.
        </p>
      </div>

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Models
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="import-export" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import/Export
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Import Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <DataHubModelsManager 
            onModelSelect={setSelectedModelId}
            selectedModelId={selectedModelId}
          />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <DataHubRecordsManager 
            selectedModelId={selectedModelId}
            models={models}
          />
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <DataHubImportExport />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <ImportJobsMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}