import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Plus, Search, Edit, Trash2, FileText, Calendar } from 'lucide-react';
import { useDataHubModels } from '@/hooks/useDataHubModels';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface DataHubModelsManagerProps {
  onModelSelect: (modelId: string) => void;
  selectedModelId: string;
}

export function DataHubModelsManager({ onModelSelect, selectedModelId }: DataHubModelsManagerProps) {
  const { models = [], isLoading, createModel, updateModel, deleteModel, isDeletingModel } = useDataHubModels();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    fields: [] as any[]
  });

  const [newField, setNewField] = useState({
    name: '',
    type: 'text' as 'text' | 'number' | 'date' | 'email' | 'phone'
  });

  const filteredModels = models.filter(model => 
    model.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddModel = async () => {
    if (!newModel.name.trim()) {
      toast.error('Model name is required');
      return;
    }

    try {
      await createModel.mutateAsync(newModel);
      setNewModel({ name: '', description: '', fields: [] });
      setIsAddModelOpen(false);
    } catch (error) {
      console.error('Error adding model:', error);
    }
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;
    
    try {
      await updateModel.mutateAsync({
        id: editingModel.id,
        updates: newModel
      });
      setEditingModel(null);
      setNewModel({ name: '', description: '', fields: [] });
    } catch (error) {
      console.error('Error updating model:', error);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this model? This will also delete all associated records.')) {
      try {
        await deleteModel.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting model:', error);
      }
    }
  };

  const addField = () => {
    if (!newField.name.trim()) {
      toast.error('Field name is required');
      return;
    }
    
    const field = {
      id: Date.now().toString(),
      name: newField.name.trim(),
      type: newField.type
    };
    
    setNewModel({
      ...newModel,
      fields: [...newModel.fields, field]
    });
    
    setNewField({ name: '', type: 'text' });
  };

  const removeField = (fieldId: string) => {
    setNewModel({
      ...newModel,
      fields: newModel.fields.filter(f => f.id !== fieldId)
    });
  };

  const startEditing = (model: any) => {
    setEditingModel(model);
    setNewModel({
      name: model.name,
      description: model.description || '',
      fields: Array.isArray(model.fields) ? model.fields : []
    });
  };

  const resetForm = () => {
    setNewModel({ name: '', description: '', fields: [] });
    setEditingModel(null);
    setIsAddModelOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Models</p>
                <p className="text-3xl font-bold text-gray-900">{models.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Models</p>
                <p className="text-3xl font-bold text-gray-900">
                  {models.filter(m => m.is_active).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <Database className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Fields</p>
                <p className="text-3xl font-bold text-gray-900">
                  {models.reduce((acc, model) => acc + (Array.isArray(model.fields) ? model.fields.length : 0), 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Models Management</CardTitle>
              <CardDescription>Create and manage your data models and their fields</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Data Model</DialogTitle>
                    <DialogDescription>Define a new data model with custom fields</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="model-name">Model Name *</Label>
                        <Input
                          id="model-name"
                          value={newModel.name}
                          onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                          placeholder="Enter model name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="model-description">Description</Label>
                        <Textarea
                          id="model-description"
                          value={newModel.description}
                          onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                          placeholder="Enter model description"
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Fields</Label>
                      <div className="flex gap-2 mb-4">
                        <Input
                          value={newField.name}
                          onChange={(e) => setNewField({...newField, name: e.target.value})}
                          placeholder="Field name"
                        />
                        <Select value={newField.type} onValueChange={(value: any) => setNewField({...newField, type: value})}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={addField} variant="outline">Add</Button>
                      </div>
                      
                      {newModel.fields.length > 0 && (
                        <div className="border rounded-lg p-4">
                          {newModel.fields.map((field) => (
                            <div key={field.id} className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{field.name}</span>
                                <Badge variant="outline">{field.type}</Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(field.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleAddModel}>Create Model</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search models..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map((model) => (
                <TableRow 
                  key={model.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedModelId === model.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => onModelSelect(model.id)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{model.name}</div>
                      {model.description && (
                        <div className="text-sm text-gray-500">{model.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{Array.isArray(model.fields) ? model.fields.length : 0} fields</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={model.is_active ? 'default' : 'secondary'}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDistanceToNow(new Date(model.created_at))} ago
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(model);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModel(model.id);
                        }}
                        disabled={isDeletingModel}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No data models found</p>
              <p className="text-sm">Create your first data model to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Model</DialogTitle>
            <DialogDescription>Update your data model configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-model-name">Model Name *</Label>
                <Input
                  id="edit-model-name"
                  value={newModel.name}
                  onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                  placeholder="Enter model name"
                />
              </div>
              <div>
                <Label htmlFor="edit-model-description">Description</Label>
                <Textarea
                  id="edit-model-description"
                  value={newModel.description}
                  onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                  placeholder="Enter model description"
                  rows={3}
                />
              </div>
            </div>
            
            <div>
              <Label>Fields</Label>
              <div className="flex gap-2 mb-4">
                <Input
                  value={newField.name}
                  onChange={(e) => setNewField({...newField, name: e.target.value})}
                  placeholder="Field name"
                />
                <Select value={newField.type} onValueChange={(value: any) => setNewField({...newField, type: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addField} variant="outline">Add</Button>
              </div>
              
              {newModel.fields.length > 0 && (
                <div className="border rounded-lg p-4">
                  {newModel.fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.name}</span>
                        <Badge variant="outline">{field.type}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleUpdateModel}>Update Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}