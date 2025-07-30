import { supabase } from '@/integrations/supabase/client';

export interface AdminProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  department?: string;
  job_title?: string;
  bio?: string;
  avatar_url?: string;
  avatar_file_name?: string;
  role: string;
  created_at: string;
  updated_at: string;
  admin_preferences?: AdminPreferences;
  admin_security_settings?: AdminSecuritySettings;
}

export interface AdminSecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  ip_whitelist: string[];
  last_login?: string;
  login_attempts: number;
  password_change_required: boolean;
  password_last_changed?: string;
}

export interface AdminPreferences {
  theme: string;
  timezone: string;
  date_format: string;
  time_format: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  system_alerts: boolean;
  security_alerts: boolean;
  performance_alerts: boolean;
  backup_notifications: boolean;
  user_activity_alerts: boolean;
  maintenance_notifications: boolean;
}

export interface AdminApiKey {
  id: string;
  key_name: string;
  api_key_preview: string;
  permissions: string[];
  status: string;
  last_used?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  id: string;
  session_token: string;
  ip_address: string;
  user_agent: string;
  location?: any;
  is_active: boolean;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

class AdminProfileService {
  private async callFunction(functionName: string, payload: any) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      throw new Error(`Function call failed: ${error.message}`);
    }

    return data;
  }

  // Profile Management
  async getAdminProfile(): Promise<AdminProfile> {
    const response = await this.callFunction('admin-profile-management', {
      action: 'get'
    });
    return response.data;
  }

  async updateAdminProfile(profileData: Partial<AdminProfile>): Promise<AdminProfile> {
    const response = await this.callFunction('admin-profile-management', {
      action: 'update',
      profileData
    });
    return response.data;
  }

  async updateAdminSecurity(securityData: Partial<AdminSecuritySettings>): Promise<void> {
    await this.callFunction('admin-profile-management', {
      action: 'updateSecurity',
      securityData
    });
  }

  async updateAdminPreferences(preferences: Partial<AdminPreferences>): Promise<void> {
    await this.callFunction('admin-profile-management', {
      action: 'updatePreferences',
      preferences
    });
  }

  async getAdminProfileAuditLog(): Promise<any[]> {
    const response = await this.callFunction('admin-profile-management', {
      action: 'getAuditLog'
    });
    return response.data;
  }

  // Avatar Management
  async uploadAvatar(file: File): Promise<{ avatar_url: string; file_name: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const { data, error } = await supabase.functions.invoke('admin-avatar-upload', {
      body: formData,
    });

    if (error) {
      throw new Error(`Avatar upload failed: ${error.message}`);
    }

    return data.data;
  }

  async deleteAvatar(): Promise<void> {
    const { error } = await supabase.functions.invoke('admin-avatar-upload', {
      method: 'DELETE',
    });

    if (error) {
      throw new Error(`Avatar deletion failed: ${error.message}`);
    }
  }

  // API Key Management
  async listApiKeys(): Promise<AdminApiKey[]> {
    const response = await this.callFunction('admin-api-keys', {
      action: 'list'
    });
    return response.data;
  }

  async createApiKey(keyData: {
    name: string;
    permissions: string[];
    expires_at?: string;
  }): Promise<AdminApiKey & { api_key: string }> {
    const response = await this.callFunction('admin-api-keys', {
      action: 'create',
      keyData
    });
    return response.data;
  }

  async updateApiKey(keyId: string, keyData: {
    name?: string;
    permissions?: string[];
    expires_at?: string;
  }): Promise<AdminApiKey> {
    const response = await this.callFunction('admin-api-keys', {
      action: 'update',
      keyId,
      keyData
    });
    return response.data;
  }

  async deleteApiKey(keyId: string): Promise<void> {
    await this.callFunction('admin-api-keys', {
      action: 'delete',
      keyId
    });
  }

  async regenerateApiKey(keyId: string): Promise<AdminApiKey & { api_key: string }> {
    const response = await this.callFunction('admin-api-keys', {
      action: 'regenerate',
      keyId
    });
    return response.data;
  }

  // Session Management
  async listAdminSessions(): Promise<AdminSession[]> {
    const response = await this.callFunction('admin-session-management', {
      action: 'list'
    });
    return response.data;
  }

  async createAdminSession(sessionData?: {
    ip_address?: string;
    user_agent?: string;
    location?: any;
  }): Promise<{ session_id: string; session_token: string; expires_at: string }> {
    const response = await this.callFunction('admin-session-management', {
      action: 'create',
      sessionData: sessionData || {}
    });
    return response.data;
  }

  async terminateAdminSession(sessionId: string): Promise<void> {
    await this.callFunction('admin-session-management', {
      action: 'terminate',
      sessionId
    });
  }

  async terminateAllAdminSessions(): Promise<{ terminated_count: number }> {
    const response = await this.callFunction('admin-session-management', {
      action: 'terminateAll'
    });
    return response;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.callFunction('admin-session-management', {
      action: 'updateActivity',
      sessionId
    });
  }

  async getAdminSecurityLog(): Promise<{
    security_logs: any[];
    security_settings: AdminSecuritySettings;
    active_sessions_count: number;
  }> {
    const response = await this.callFunction('admin-session-management', {
      action: 'getSecurityLog'
    });
    return response.data;
  }

  // Utility Methods
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  async enableTwoFactor(): Promise<void> {
    // This would integrate with your 2FA provider
    // For now, just update the security settings
    await this.updateAdminSecurity({
      two_factor_enabled: true
    });
  }

  async disableTwoFactor(): Promise<void> {
    await this.updateAdminSecurity({
      two_factor_enabled: false
    });
  }

  async updateSessionTimeout(timeoutMinutes: number): Promise<void> {
    await this.updateAdminSecurity({
      session_timeout: timeoutMinutes * 60 // Convert to seconds
    });
  }

  async addIpToWhitelist(ipAddress: string): Promise<void> {
    const profile = await this.getAdminProfile();
    const currentWhitelist = profile.admin_security_settings?.ip_whitelist || [];
    
    if (!currentWhitelist.includes(ipAddress)) {
      await this.updateAdminSecurity({
        ip_whitelist: [...currentWhitelist, ipAddress]
      });
    }
  }

  async removeIpFromWhitelist(ipAddress: string): Promise<void> {
    const profile = await this.getAdminProfile();
    const currentWhitelist = profile.admin_security_settings?.ip_whitelist || [];
    
    await this.updateAdminSecurity({
      ip_whitelist: currentWhitelist.filter(ip => ip !== ipAddress)
    });
  }
}

export const adminProfileService = new AdminProfileService();