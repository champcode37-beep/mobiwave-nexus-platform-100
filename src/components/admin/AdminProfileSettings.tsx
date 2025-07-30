import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from 'sonner';
import { 
  User, 
  Upload, 
  Shield, 
  Bell, 
  Key, 
  Settings, 
  Clock, 
  Globe, 
  Database,
  Activity,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { ApiCredentials } from '@/components/settings/ApiCredentials';
import { adminProfileService, AdminProfile, AdminPreferences, AdminSecuritySettings } from '@/services/adminProfileService';

export function AdminProfileSettings() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [adminPreferences, setAdminPreferences] = useState<AdminPreferences | null>(null);
  const [securitySettings, setSecuritySettings] = useState<AdminSecuritySettings | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load admin profile data on component mount
  useEffect(() => {
    loadAdminProfile();
    loadApiKeys();
  }, []);

  const loadAdminProfile = async () => {
    try {
      setLoading(true);
      const profileData = await adminProfileService.getAdminProfile();
      setProfile(profileData);
      
      if (profileData.admin_preferences) {
        setAdminPreferences(profileData.admin_preferences);
      }
      
      if (profileData.admin_security_settings) {
        setSecuritySettings(profileData.admin_security_settings);
      }
    } catch (error) {
      console.error('Failed to load admin profile:', error);
      toast.error('Failed to load admin profile');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const keys = await adminProfileService.listApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    }
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
      } catch (error) {
        console.error('Avatar upload failed:', error);
        toast.error('Failed to upload avatar');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    try {
      setUpdating(true);
      const updatedProfile = await adminProfileService.updateAdminProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        company: profile.company,
        department: profile.department,
        job_title: profile.job_title,
        bio: profile.bio
      });
      
      setProfile(updatedProfile);
      toast.success('Admin profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!adminPreferences) return;
    
    try {
      setUpdating(true);
      await adminProfileService.updateAdminPreferences(adminPreferences);
      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Preferences update failed:', error);
      toast.error('Failed to update preferences');
    } finally {
      setUpdating(false);
    }
  };

  const handleSecurityUpdate = async () => {
    if (!securitySettings) return;
    
    try {
      setUpdating(true);
      await adminProfileService.updateAdminSecurity(securitySettings);
      toast.success('Security settings updated successfully');
    } catch (error) {
      console.error('Security update failed:', error);
      toast.error('Failed to update security settings');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      // This would typically open a password change dialog
      // For now, we'll just show a message
      toast.info('Password change functionality would be implemented here');
    } catch (error) {
      console.error('Password change failed:', error);
      toast.error('Failed to initiate password change');
    }
  };

  const generateApiKey = async () => {
    try {
      setUpdating(true);
      const newKey = await adminProfileService.createApiKey({
        name: 'New Admin API Key',
        permissions: ['read'],
      });
      
      setApiKeys([...apiKeys, newKey]);
      toast.success('New admin API key generated');
      
      // Show the API key in a secure way (you might want to use a modal)
      toast.info(`API Key: ${newKey.api_key.substring(0, 20)}...`);
    } catch (error) {
      console.error('API key generation failed:', error);
      toast.error('Failed to generate API key');
    } finally {
      setUpdating(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      setUpdating(true);
      await adminProfileService.deleteApiKey(id);
      setApiKeys(apiKeys.filter(key => key.id !== id));
      toast.success('API key revoked');
    } catch (error) {
      console.error('API key revocation failed:', error);
      toast.error('Failed to revoke API key');
    } finally {
      setUpdating(false);
    }
  };

  const handleEmergencyAccess = async () => {
    try {
      // This would implement emergency access protocols
      toast.info('Emergency access protocols would be implemented here');
    } catch (error) {
      console.error('Emergency access failed:', error);
      toast.error('Failed to activate emergency access');
    }
  };

  const handleSystemMaintenance = () => {
    toast.info('System maintenance mode toggle would be implemented here');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading admin profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Profile</h3>
          <p className="text-gray-600 mb-4">Unable to load admin profile data</p>
          <Button onClick={loadAdminProfile}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Administrator Profile
          </CardTitle>
          <CardDescription>
            Manage your administrator profile information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-xl bg-red-100 text-red-700">
                {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button 
                onClick={handleAvatarUpload} 
                variant="outline"
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Photo
              </Button>
              <p className="text-sm text-gray-500">
                JPG, PNG or GIF (max. 5MB)
              </p>
              <Badge variant="secondary" className="text-xs">
                {profile.role === 'super_admin' ? 'Super Administrator' : 'Administrator'}
              </Badge>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.first_name || ''}
                onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                disabled={updating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.last_name || ''}
                onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                disabled={updating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                disabled={updating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile.phone || ''}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                disabled={updating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={profile.company || ''}
                onChange={(e) => setProfile({...profile, company: e.target.value})}
                disabled={updating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={profile.department || ''}
                onChange={(e) => setProfile({...profile, department: e.target.value})}
                disabled={updating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={profile.job_title || ''}
                onChange={(e) => setProfile({...profile, job_title: e.target.value})}
                disabled={updating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              rows={3}
              disabled={updating}
            />
          </div>

          <Button 
            onClick={handleProfileUpdate} 
            className="bg-red-600 hover:bg-red-700"
            disabled={updating}
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Admin Profile'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* System Access & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Access Control
          </CardTitle>
          <CardDescription>
            Manage your administrator security settings and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Account Status</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Active
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Last Login</span>
                </div>
                <span className="text-sm text-gray-600">
                  {securitySettings?.last_login ? 
                    new Date(securitySettings.last_login).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Session Timeout</span>
                </div>
                <span className="text-sm text-gray-600">
                  {securitySettings?.session_timeout ? 
                    `${Math.floor(securitySettings.session_timeout / 60)} minutes` : 
                    '60 minutes'
                  }
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Admin Permissions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    User Management
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    System Config
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Security Admin
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">IP Whitelist</Label>
                <div className="space-y-1 mt-2">
                  {securitySettings?.ip_whitelist && securitySettings.ip_whitelist.length > 0 ? (
                    securitySettings.ip_whitelist.map((ip, index) => (
                      <div key={index} className="text-xs font-mono bg-gray-100 p-2 rounded">
                        {ip}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 p-2">
                      No IP restrictions configured
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500">
                  Enhanced security for administrator access
                </p>
              </div>
              <Switch
                checked={securitySettings?.two_factor_enabled || false}
                onCheckedChange={(checked) => {
                  if (securitySettings) {
                    setSecuritySettings({...securitySettings, two_factor_enabled: checked});
                  }
                }}
                disabled={updating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Select
                  value={securitySettings?.session_timeout ? String(Math.floor(securitySettings.session_timeout / 60)) : "60"}
                  onValueChange={(value) => {
                    if (securitySettings) {
                      setSecuritySettings({...securitySettings, session_timeout: parseInt(value) * 60});
                    }
                  }}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Select
                  value={adminPreferences?.timezone || "Africa/Nairobi"}
                  onValueChange={(value) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, timezone: value});
                    }
                  }}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSecurityUpdate} 
              className="bg-red-600 hover:bg-red-700"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Security Settings'
              )}
            </Button>
            <Button onClick={handlePasswordChange} variant="outline" disabled={updating}>
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button onClick={handleEmergencyAccess} variant="destructive" disabled={updating}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Access
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Administrator Notifications
          </CardTitle>
          <CardDescription>
            Configure system alerts and notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>System Alerts</Label>
                  <p className="text-sm text-gray-500">Critical system notifications</p>
                </div>
                <Switch
                  checked={adminPreferences?.system_alerts || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, system_alerts: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Security Alerts</Label>
                  <p className="text-sm text-gray-500">Security breach notifications</p>
                </div>
                <Switch
                  checked={adminPreferences?.security_alerts || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, security_alerts: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Performance Alerts</Label>
                  <p className="text-sm text-gray-500">System performance warnings</p>
                </div>
                <Switch
                  checked={adminPreferences?.performance_alerts || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, performance_alerts: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Backup Notifications</Label>
                  <p className="text-sm text-gray-500">Backup status updates</p>
                </div>
                <Switch
                  checked={adminPreferences?.backup_notifications || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, backup_notifications: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>User Activity Alerts</Label>
                  <p className="text-sm text-gray-500">User registration and activity</p>
                </div>
                <Switch
                  checked={adminPreferences?.user_activity_alerts || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, user_activity_alerts: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Notifications</Label>
                  <p className="text-sm text-gray-500">Scheduled maintenance alerts</p>
                </div>
                <Switch
                  checked={adminPreferences?.maintenance_notifications || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, maintenance_notifications: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Email delivery for alerts</p>
                </div>
                <Switch
                  checked={adminPreferences?.email_notifications || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, email_notifications: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-500">SMS delivery for critical alerts</p>
                </div>
                <Switch
                  checked={adminPreferences?.sms_notifications || false}
                  onCheckedChange={(checked) => {
                    if (adminPreferences) {
                      setAdminPreferences({...adminPreferences, sms_notifications: checked});
                    }
                  }}
                  disabled={updating}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={handlePreferencesUpdate} 
              className="bg-red-600 hover:bg-red-700"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Notification Preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Preferences
          </CardTitle>
          <CardDescription>
            Configure your dashboard and system display preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={adminPreferences?.date_format || "DD/MM/YYYY"}
                onValueChange={(value) => {
                  if (adminPreferences) {
                    setAdminPreferences({...adminPreferences, date_format: value});
                  }
                }}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select
                value={adminPreferences?.time_format || "24h"}
                onValueChange={(value) => {
                  if (adminPreferences) {
                    setAdminPreferences({...adminPreferences, time_format: value});
                  }
                }}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12 Hour</SelectItem>
                  <SelectItem value="24h">24 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSystemMaintenance} variant="outline">
              <Database className="w-4 h-4 mr-2" />
              System Maintenance
            </Button>
            <Button variant="outline">
              <Globe className="w-4 h-4 mr-2" />
              Export Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mspace API Configuration */}
      <ApiCredentials />

      {/* Admin API Key Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Administrator API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for administrative access and system integrations
              </CardDescription>
            </div>
            <Button 
              onClick={generateApiKey} 
              className="bg-red-600 hover:bg-red-700"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Admin Key'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{apiKey.key_name}</h3>
                    <Badge 
                      variant={apiKey.status === 'active' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {apiKey.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 font-mono">{apiKey.api_key_preview}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                    <span>Last used: {apiKey.last_used ? new Date(apiKey.last_used).toLocaleDateString() : 'Never'}</span>
                  </div>
                  <div className="flex gap-1">
                    {apiKey.permissions.map((permission: string) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={updating}>
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => revokeApiKey(apiKey.id)}
                    disabled={updating}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}