import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from 'lucide-react';
import { useUserServiceActivations } from '@/hooks/useUserServiceActivations';
import { useServiceActivationMutations } from '@/hooks/useServiceActivationMutations';

export function UserServiceActivations() {
  const { data: userActivations = [], isLoading, error } = useUserServiceActivations();
  const { deactivateUserService } = useServiceActivationMutations();

  const handleDeactivate = async (userId: string, serviceId: string) => {
    if (window.confirm('Are you sure you want to deactivate this service for the user?')) {
      try {
        await deactivateUserService.mutateAsync({ userId, serviceId });
      } catch (error) {
        console.error('Failed to deactivate service:', error);
      }
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'ussd': return '📱';
      case 'shortcode': return '💬';
      case 'mpesa': return '💳';
      case 'survey': return '📊';
      case 'servicedesk': return '🎫';
      case 'rewards': return '🎁';
      case 'whatsapp': return '💚';
      case 'sms': return '📧';
      default: return '⚙️';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Active User Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <p>Error loading user services: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Active User Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        {userActivations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active user services found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Activated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userActivations.map((activation) => (
                <TableRow key={activation.id}>
                  <TableCell>
                    <div className="text-sm">
                      {activation.user_id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getServiceIcon(activation.service.service_type)}</span>
                      <div>
                        <div className="font-medium">{activation.service.service_name}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {activation.service.service_type}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(activation.activated_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeactivate(activation.user_id, activation.service_id)}
                    >
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}