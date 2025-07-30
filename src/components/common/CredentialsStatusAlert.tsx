import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useMspaceApi } from "@/hooks/useMspaceApi";

export function CredentialsStatusAlert() {
  const { hasCredentials, credentialsLoading } = useMspaceApi();

  // Don't show anything while loading
  if (credentialsLoading) {
    return null;
  }

  // Don't show if credentials are configured
  if (hasCredentials) {
    return null;
  }

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-orange-800">
          <strong>API Credentials Required:</strong> Configure your Mspace API credentials to use SMS services.
        </div>
        <Button asChild size="sm" variant="outline" className="ml-4">
          <Link to="/profile" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configure Now
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}