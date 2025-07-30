import React from 'react';
import { ClientDashboardLayout } from '../components/client/ClientDashboardLayout';
import { EnhancedDataHubManager } from '../components/data-hub/EnhancedDataHubManager';

const DataHubPage = () => {
  return (
    <ClientDashboardLayout>
      <EnhancedDataHubManager />
    </ClientDashboardLayout>
  );
};

export default DataHubPage;