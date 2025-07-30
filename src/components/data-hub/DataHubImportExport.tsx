import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileText, Database } from 'lucide-react';
import { useDataHubModels } from '@/hooks/useDataHubModels';
import { useDataHubRecords } from '@/hooks/useDataHubRecords';
import { toast } from 'sonner';

export function DataHubImportExport() {
  const { models = [] } = useDataHubModels();
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const { records = [] } = useDataHubRecords(selectedModelId);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedModelId) {
      toast.error('Please select a model and file');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const recordsToImport = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const recordData: any = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              recordData[header] = values[index];
            }
          });
          
          return recordData;
        });

      // TODO: Implement bulk import
      toast.success(`Parsed ${recordsToImport.length} records for import`);
      console.log('Records to import:', recordsToImport);
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    }
  };

  const handleExport = () => {
    if (!selectedModelId || records.length === 0) {
      toast.error('No data to export');
      return;
    }

    const selectedModel = models.find(m => m.id === selectedModelId);
    if (!selectedModel) return;

    // Get all field names from the model
    const fieldNames = Array.isArray(selectedModel.fields) 
      ? selectedModel.fields.map(field => field.name)
      : [];

    // Create CSV content
    const headers = ['id', 'created_at', 'updated_at', 'is_active', ...fieldNames];
    const csvContent = [
      headers.join(','),
      ...records.map(record => {
        const row = [
          record.id,
          record.created_at,
          record.updated_at,
          record.is_active
        ];
        
        // Add field data
        fieldNames.forEach(fieldName => {
          row.push(record.data[fieldName] || '');
        });
        
        return row.map(cell => `"${cell}"`).join(',');
      })
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedModel.name}_records.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Import Data
            </CardTitle>
            <CardDescription>
              Upload CSV files to import data into your models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="import-model">Select Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="import-file">CSV File</Label>
              <input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={!selectedModelId}
              >
                <FileText className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Import Requirements:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• CSV file with headers matching your model fields</li>
                <li>• First row should contain field names</li>
                <li>• Data rows follow the header row</li>
                <li>• Make sure data types match field types</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download your model data as CSV files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="export-model">Select Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({records.length} records)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full"
              onClick={handleExport}
              disabled={!selectedModelId || records.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Export Features:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• All model records included</li>
                <li>• Standard CSV format</li>
                <li>• Includes metadata (ID, dates, status)</li>
                <li>• Ready for import into other systems</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Selection Info */}
      {selectedModelId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              Selected Model Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const selectedModel = models.find(m => m.id === selectedModelId);
              if (!selectedModel) return null;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Model Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {selectedModel.name}</div>
                      <div><strong>Description:</strong> {selectedModel.description || 'No description'}</div>
                      <div><strong>Records:</strong> {records.length}</div>
                      <div><strong>Status:</strong> {selectedModel.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Fields ({Array.isArray(selectedModel.fields) ? selectedModel.fields.length : 0})</h4>
                    <div className="space-y-1">
                      {Array.isArray(selectedModel.fields) && selectedModel.fields.map((field: any) => (
                        <div key={field.id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{field.name}</span>
                          <span className="text-gray-500">({field.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}