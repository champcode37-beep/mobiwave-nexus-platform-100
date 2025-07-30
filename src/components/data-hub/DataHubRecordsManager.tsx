import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Plus, Search, Edit, Trash2, Calendar, Database, RefreshCw } from 'lucide-react';
import { useDataHubRecords } from '@/hooks/useDataHubRecords';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface DataHubRecordsManagerProps {
  selectedModelId: string;
  models: any[];
}

export function DataHubRecordsManager({ selectedModelId, models }: DataHubRecordsManagerProps) {
  const { 
    records = [], 
    isLoading, 
    createRecord, 
    updateRecord, 
    deleteRecord, 
    isDeletingRecord,
    refetch 
  } = useDataHubRecords(selectedModelId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const selectedModel = models?.find(m => m.id === selectedModelId);
  const [recordData, setRecordData] = useState<Record<string, any>>({});

  const filteredRecords = records.filter(record => {
    const matchesSearch = Object.values(record.data || {}).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && record.is_active) ||
      (statusFilter === 'inactive' && !record.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleAddRecord = async () => {
    if (!selectedModelId) {
      toast.error('Please select a model first');
      return;
    }

    try {
      await createRecord.mutateAsync({
        model_id: selectedModelId,
        data: recordData
      });
      setRecordData({});
      setIsAddRecordOpen(false);
    } catch (error) {
      console.error('Error adding record:', error);
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    
    try {
      await updateRecord.mutateAsync({
        id: editingRecord.id,
        updates: {
          data: recordData,
          is_active: editingRecord.is_active
        }
      });
      setEditingRecord(null);
      setRecordData({});
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await deleteRecord.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };

  const startEditing = (record: any) => {
    setEditingRecord(record);
    setRecordData(record.data || {});
  };

  const resetForm = () => {
    setRecordData({});
    setEditingRecord(null);
    setIsAddRecordOpen(false);
  };

  if (!selectedModelId) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a data model</h3>
            <p className="text-gray-600">Choose a data model from the Models tab to manage its records</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                <p className="text-sm font-medium text-gray-600 mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Records</p>
                <p className="text-3xl font-bold text-gray-900">
                  {records.filter(r => r.is_active).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Model</p>
                <p className="text-xl font-bold text-gray-900">{selectedModel?.name || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <Database className="w-6 h-6 text-purple-600" />
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
              <CardTitle>Records Management</CardTitle>
              <CardDescription>Manage records for {selectedModel?.name}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Record</DialogTitle>
                    <DialogDescription>Add a new record to {selectedModel?.name}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedModel?.fields && Array.isArray(selectedModel.fields) && selectedModel.fields.map((field: any) => (
                      <div key={field.id}>
                        <Label htmlFor={field.name}>{field.name}</Label>
                        <Input
                          id={field.name}
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                          value={recordData[field.name] || ''}
                          onChange={(e) => setRecordData({
                            ...recordData,
                            [field.name]: e.target.value
                          })}
                          placeholder={`Enter ${field.name}`}
                        />
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={handleAddRecord}>Create Record</Button>
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
                placeholder="Search records..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-mono text-sm">#{record.id.slice(-8)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-hidden">
                        {JSON.stringify(record.data, null, 2)}
                      </pre>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.is_active ? 'default' : 'secondary'}>
                      {record.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDistanceToNow(new Date(record.created_at))} ago
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(record)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecord(record.id)}
                        disabled={isDeletingRecord}
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

          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No records found</p>
              <p className="text-sm">Create your first record to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>Update record data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedModel?.fields && Array.isArray(selectedModel.fields) && selectedModel.fields.map((field: any) => (
              <div key={field.id}>
                <Label htmlFor={`edit-${field.name}`}>{field.name}</Label>
                <Input
                  id={`edit-${field.name}`}
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                  value={recordData[field.name] || ''}
                  onChange={(e) => setRecordData({
                    ...recordData,
                    [field.name]: e.target.value
                  })}
                  placeholder={`Enter ${field.name}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleUpdateRecord}>Update Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}