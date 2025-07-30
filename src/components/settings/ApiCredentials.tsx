import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

import { Key, Shield, CheckCircle, AlertCircle, Bug } from 'lucide-react';
import { checkAndFixApiCredentialsTable, testApiCredentialsSave } from '@/utils/database-check';

// Type definition for api_credentials table with new schema
interface ApiCredentialsRow {
  id: string;
  user_id: string;
  service_name: string;
  api_key_encrypted: string | null;
  username: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiCredentialsData {
  api_key: string;
  username: string;
  is_active: boolean;
}

export function ApiCredentials() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<ApiCredentialsData>({
    api_key: '',
    username: '',
    is_active: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const [isDebugging, setIsDebugging] = useState(false);

  useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  const loadCredentials = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_credentials')
        .select('id, user_id, service_name, api_key_encrypted, username, is_active, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('service_name', 'mspace')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading credentials:', error);
        // Don't show error toast for loading - it's not critical
        return;
      }

      if (data) {
        // Direct database access
        const dbData = data as ApiCredentialsRow;
        setCredentials({
          api_key: '', // Don't show the actual API key for security
          username: dbData.username || '',
          is_active: dbData.is_active || false
        });
      }
    } catch (error) {
      console.error('Credentials load failed:', error);
      // Don't show error toast for loading - it's not critical
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async () => {
    if (!user) {
      toast.error('User not authenticated. Please log in again.');
      return;
    }

    if (!credentials.api_key.trim()) {
      toast.error('API key is required');
      return;
    }

    if (!credentials.username.trim()) {
      toast.error('Username is required');
      return;
    }

    setIsSaving(true);
    try {
      // Check if credentials already exist
      const { data: existing } = await supabase
        .from('api_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('service_name', 'mspace')
        .single();

      if (existing) {
        // Update existing credentials
        const { error: updateError } = await supabase
          .from('api_credentials')
          .update({
            api_key_encrypted: credentials.api_key,
            username: credentials.username,
            is_active: true
          })
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new credentials
        const { error: insertError } = await supabase
          .from('api_credentials')
          .insert({
            user_id: user.id,
            service_name: 'mspace',
            api_key_encrypted: credentials.api_key,
            username: credentials.username,
            is_active: true
          });

        if (insertError) {
          throw insertError;
        }
      }

      setCredentials(prev => ({ ...prev, is_active: true }));
      toast.success('API credentials saved successfully');

      // Reload credentials to ensure UI is in sync
      await loadCredentials();

    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast.error(`Failed to save API credentials: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!credentials.username) {
      toast.error('Please save your credentials first');
      return;
    }

    setIsTestingConnection(true);
    try {
      // Test the credentials by calling the login endpoint
      // Let the edge function fetch credentials from database
      const { data, error } = await supabase.functions.invoke('mspace-api', {
        body: {
          operation: 'login'
          // No credentials passed - edge function will fetch from database
        }
      });

      if (error) {
        throw new Error('Failed to test connection');
      }

      if (!data.success) {
        throw new Error(data.error || 'Connection test failed');
      }

      if (data.data.status === 'success') {
        toast.success('Connection test successful! Credentials are valid.');
      } else {
        toast.error('Connection test failed: Invalid credentials');
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      toast.error(`Connection test failed: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const runDiagnostics = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsDebugging(true);
    try {
      toast.info('Running diagnostics...');
      
      // Check table accessibility
      const tableCheck = await checkAndFixApiCredentialsTable();
      console.log('Table check result:', tableCheck);
      
      // Test user authentication
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { user: currentUser?.id, error: authError });
      
      if (currentUser) {
        // Test insert capability
        const insertTest = await testApiCredentialsSave(currentUser.id);
        console.log('Insert test result:', insertTest);
        
        if (insertTest.success) {
          toast.success('Diagnostics passed! Database is working correctly.');
        } else {
          toast.error(`Database test failed: ${insertTest.error?.message || 'Unknown error'}`);
        }
      } else {
        toast.error('Authentication test failed');
      }
      
    } catch (error: any) {
      console.error('Diagnostics failed:', error);
      toast.error(`Diagnostics failed: ${error.message}`);
    } finally {
      setIsDebugging(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Mspace API Configuration
          </CardTitle>
          <Badge variant={credentials.is_active ? "default" : "secondary"}>
            {credentials.is_active ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Active
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="apiKey"
                type="password"
                value={credentials.api_key}
                onChange={(e) => setCredentials(prev => ({ ...prev, api_key: e.target.value }))}
                className="pl-10"
                placeholder="Enter your SMS API key"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter your SMS API username"
            />
          </div>


        </div>

        <div className="flex gap-3">
          <Button 
            onClick={saveCredentials} 
            disabled={isSaving || !credentials.api_key || !credentials.username}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : 'Save Credentials'}
          </Button>
          <Button 
            variant="outline" 
            onClick={testConnection}
            disabled={isTestingConnection || !credentials.username}
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={runDiagnostics}
            disabled={isDebugging}
          >
            <Bug className="w-4 h-4 mr-1" />
            {isDebugging ? 'Running...' : 'Debug'}
          </Button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How to get your Mspace credentials:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Visit <a href="https://mspace.co.ke" target="_blank" rel="noopener noreferrer" className="underline">mspace.co.ke</a></li>
            <li>Sign up for an account or log in</li>
            <li>Navigate to API settings in your dashboard</li>
            <li>Copy your API key and username</li>
            <li>Set up your preferred sender ID</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
