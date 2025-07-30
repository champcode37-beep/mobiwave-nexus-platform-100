import { useState, useEffect } from 'react';
import { adminProfileService, AdminProfile, AdminPreferences, AdminSecuritySettings } from '@/services/adminProfileService';
import { toast } from 'sonner';

export interface UseAdminProfileReturn {
  profile: AdminProfile | null;
  preferences: AdminPreferences | null;
  securitySettings: AdminSecuritySettings | null;
  apiKeys: any[];
  loading: boolean;
  updating: boolean;
  error: string | null;
  
  // Actions
  updateProfile: (profileData: Partial<AdminProfile>) => Promise<void>;
  updatePreferences: (preferences: Partial<AdminPreferences>) => Promise<void>;
  updateSecurity: (securityData: Partial<AdminSecuritySettings>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  createApiKey: (keyData: { name: string; permissions: string[] }) => Promise<void>;
  deleteApiKey: (keyId: string) => Promise<void>;
  regenerateApiKey: (keyId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useAdminProfile(): UseAdminProfileReturn {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [preferences, setPreferences] = useState<AdminPreferences | null>(null);
  const [securitySettings, setSecuritySettings] = useState<AdminSecuritySettings | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [profileData, apiKeysData] = await Promise.all([
        adminProfileService.getAdminProfile(),
        adminProfileService.listApiKeys()
      ]);
      
      setProfile(profileData);
      setApiKeys(apiKeysData);
      
      // Extract nested data if available
      if (profileData.admin_preferences) {
        setPreferences(profileData.admin_preferences);
      }
      
      if (profileData.admin_security_settings) {
        setSecuritySettings(profileData.admin_security_settings);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load admin profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<AdminProfile>) => {
    try {
      setUpdating(true);
      const updatedProfile = await adminProfileService.updateAdminProfile(profileData);
      setProfile(updatedProfile);
      toast.success('Profile updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<AdminPreferences>) => {
    try {
      setUpdating(true);
      await adminProfileService.updateAdminPreferences(newPreferences);
      
      // Update local state
      if (preferences) {
        setPreferences({ ...preferences, ...newPreferences });
      }
      
      toast.success('Preferences updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updateSecurity = async (securityData: Partial<AdminSecuritySettings>) => {
    try {
      setUpdating(true);
      await adminProfileService.updateAdminSecurity(securityData);
      
      // Update local state
      if (securitySettings) {
        setSecuritySettings({ ...securitySettings, ...securityData });
      }
      
      toast.success('Security settings updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update security settings';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUpdating(true);
      const result = await adminProfileService.uploadAvatar(file);
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: result.avatar_url,
          avatar_file_name: result.file_name
        });
      }
      
      toast.success('Avatar uploaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setUpdating(true);
      await adminProfileService.deleteAvatar();
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: undefined,
          avatar_file_name: undefined
        });
      }
      
      toast.success('Avatar deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete avatar';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const createApiKey = async (keyData: { name: string; permissions: string[] }) => {
    try {
      setUpdating(true);
      const newKey = await adminProfileService.createApiKey(keyData);
      setApiKeys([...apiKeys, newKey]);
      toast.success('API key created successfully');
      
      // Show the API key securely (you might want to use a modal for this)
      toast.info(`API Key: ${newKey.api_key.substring(0, 20)}...`, {
        duration: 10000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create API key';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      setUpdating(true);
      await adminProfileService.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      toast.success('API key deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete API key';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const regenerateApiKey = async (keyId: string) => {
    try {
      setUpdating(true);
      const updatedKey = await adminProfileService.regenerateApiKey(keyId);
      
      // Update the key in the list
      setApiKeys(apiKeys.map(key => 
        key.id === keyId ? updatedKey : key
      ));
      
      toast.success('API key regenerated successfully');
      
      // Show the new API key securely
      toast.info(`New API Key: ${updatedKey.api_key.substring(0, 20)}...`, {
        duration: 10000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate API key';
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    profile,
    preferences,
    securitySettings,
    apiKeys,
    loading,
    updating,
    error,
    updateProfile,
    updatePreferences,
    updateSecurity,
    uploadAvatar,
    deleteAvatar,
    createApiKey,
    deleteApiKey,
    regenerateApiKey,
    refreshData,
  };
}