import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Key,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useClientProfiles } from '@/hooks/useClientProfiles';
import { useMspaceApi } from '@/hooks/useMspaceApi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function ClientProfileManagement() {
  const { 
    clientProfiles, 
    isLoading, 
    createClientProfile, 
    updateClientProfile, 
    deleteClientProfile,
    isCreating,
    isUpdating,
    isDeleting
  } = useClientProfiles();

  const { 
    resellerClients, 
    isLoadingResellerClients, 
    refreshResellerClients 
  } = useMspaceApi();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedResellerClient, setSelectedResellerClient] = useState<string>('');
  const [formData, setFormData] = useState({
    client_name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    sms_balance: 0
  });

  // Update form data when reseller client is selected
  useEffect(() => {
    if (selectedResellerClient) {
      const client = resellerClients.find(c => {
        const clientName = (c as any).clientUserName || c.clientname;
        return clientName === selectedResellerClient;
      });
      if (client) {
        setFormData(prev => ({
          ...prev,
          username: selectedResellerClient,
          sms_balance: parseInt(client.smsBalance || '0')
        }));
      }
    }
  }, [selectedResellerClient, resellerClients]);

  const handleCreateProfile = async () => {
    if (!formData.client_name || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createClientProfile.mutateAsync(formData);
      setFormData({
        client_name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        sms_balance: 0
      });
      setSelectedResellerClient('');
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client profile');
    }
  };

  const handleUpdateProfile = async (id: string, updates: any) => {
    try {
      await updateClientProfile.mutateAsync({ id, updates });
      setEditingProfile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update client profile');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client profile?')) {
      try {
        await deleteClientProfile.mutateAsync(id);
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete client profile');
      }
    }
  };

  const togglePasswordVisibility = (profileId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Client Profile Management</h3>
          <p className="text-gray-600">Create and manage client profiles for dashboard access using existing Mspace reseller clients</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Client Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Client Profile</DialogTitle>
              <DialogDescription>
                Create a client profile with login credentials for dashboard access using an existing Mspace reseller client
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reseller_client">Select Reseller Client *</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshResellerClients}
                    disabled={isLoadingResellerClients}
                    className="h-auto p-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingResellerClients ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <Select 
                  value={selectedResellerClient} 
                  onValueChange={setSelectedResellerClient}
                  disabled={isLoadingResellerClients}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingResellerClients ? "Loading reseller clients..." : "Select a reseller client"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {resellerClients.map((client) => {
                      const clientName = (client as any).clientUserName || client.clientname;
                      return (
                        <SelectItem key={clientName} value={clientName} className="bg-white hover:bg-gray-100">
                          {clientName} (Balance: {client.smsBalance || '0'} SMS)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_name">Display Name *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Enter display name for the client"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username (Auto-filled)</Label>
                <Input
                  id="username"
                  value={formData.username}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Select a reseller client first"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms_balance">Current SMS Balance (Auto-filled)</Label>
                <Input
                  id="sms_balance"
                  type="number"
                  value={formData.sms_balance}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Select a reseller client first"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateProfile}
                  disabled={isCreating || !selectedResellerClient}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Profile'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Client Profiles ({clientProfiles?.length || 0})
          </CardTitle>
          <CardDescription>
            Client profiles with dashboard access credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : clientProfiles && clientProfiles.length > 0 ? (
            <div className="space-y-3">
              {clientProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{profile.client_name}</h4>
                      <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Username: <span className="font-mono">{profile.username}</span></div>
                      <div className="flex items-center gap-2">
                        Password: 
                        <span className="font-mono">
                          {showPasswords[profile.id] ? '••••••••' : '••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(profile.id)}
                          className="h-auto p-1"
                        >
                          {showPasswords[profile.id] ? 
                            <EyeOff className="w-3 h-3" /> : 
                            <Eye className="w-3 h-3" />
                          }
                        </Button>
                      </div>
                      {profile.email && <div>Email: {profile.email}</div>}
                      {profile.phone && <div>Phone: {profile.phone}</div>}
                      <div>SMS Balance: {profile.sms_balance}</div>
                      <div>Last Login: {profile.last_login ? new Date(profile.last_login).toLocaleDateString() : 'Never'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProfile(profile)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProfile(profile.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No client profiles</h3>
              <p className="text-gray-600 mb-4">Create your first client profile to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Client Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Note:</strong> Client profiles created here will have access to a dedicated client dashboard. 
          Ensure strong passwords and regular credential rotation for security.
        </AlertDescription>
      </Alert>
    </div>
  );
}