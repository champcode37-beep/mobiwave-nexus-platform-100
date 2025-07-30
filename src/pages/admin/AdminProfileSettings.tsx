import React from 'react';
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout';
import { AdminProfileSettings as AdminProfileSettingsComponent } from '@/components/admin/AdminProfileSettings';

const AdminProfileSettings = () => {
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-r from-red-900 via-red-800 to-red-700 bg-clip-text text-transparent">
            Admin Profile Settings
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl">
            Manage your administrator profile, security settings, and system preferences.
          </p>
        </div>
        <AdminProfileSettingsComponent />
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminProfileSettings;