import React from 'react';
import { ClientDashboardLayout } from '../components/client/ClientDashboardLayout';
import { USSDApplicationBuilder } from '../components/services/ussd/USSDApplicationBuilder';
import logger from '../logger';

const USSDServices = () => {
  try {
    return (
      <ClientDashboardLayout>
        <USSDApplicationBuilder />
      </ClientDashboardLayout>
    );
  } catch (error) {
    logger.error('USSDServices render error:', error);
    return null;
  }
};

export default USSDServices;