import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, CheckCircle, AlertTriangle } from 'lucide-react';

interface ServiceStatus {
  id: string;
  service_name: string;
  status: string;
  version: string;
  uptime_percentage: number;
}

interface ServicesStatusProps {
  serviceStatus?: ServiceStatus[];
}

export function ServicesStatus({ serviceStatus }: ServicesStatusProps) {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string): React.ComponentType<React.ComponentProps<'svg'>> => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Server;
    }
  };

  if (!serviceStatus) {
    return (
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-green-600" />
            Service Status
          </CardTitle>
          <CardDescription>
            Monitor the health and status of all system services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">
            No service status available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5 text-green-600" />
          Service Status
        </CardTitle>
        <CardDescription>
          Monitor the health and status of all system services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {serviceStatus?.map((service, index) => {
            const StatusIcon = getStatusIcon(service.status);
            return (
              <div key={service.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-5 h-5 ${getStatusColor(service.status)}`} />
                  <div>
                    <h3 className="font-medium">{service.service_name}</h3>
                    <p className="text-sm text-gray-500">Version {service.version}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status}
                  </p>
                  <p className="text-xs text-gray-500">{service.uptime_percentage}% uptime</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}