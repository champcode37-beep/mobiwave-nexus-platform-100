import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  Users, 
  Building2, 
  RefreshCw, 
  Plus, 
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import { useMspaceApi } from '@/hooks/useMspaceApi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CredentialsStatusAlert } from '@/components/common/CredentialsStatusAlert';
import { ClientProfileManagement } from './ClientProfileManagement';

export function MspaceUserManagement() {
  const {
    balance,
    subUsers,
    resellerClients,
    hasCredentials,
    credentialsLoading,
    isLoadingBalance,
    isLoadingSubUsers,
    isLoadingResellerClients,
    topUpResellerClient,
    topUpSubAccount,
    testCredentials,
    checkBalance,
    isToppingUpReseller,
    isToppingUpSub,
    isTestingCredentials,
    isCheckingBalance,
    refreshAll
  } = useMspaceApi();

  // Top-up Form State
  const [resellerTopUp, setResellerTopUp] = useState({ clientname: '', noofsms: '' });
  const [subTopUp, setSubTopUp] = useState({ subaccname: '', noofsms: '' });

  const handleResellerTopUp = async () => {
    if (!resellerTopUp.clientname || !resellerTopUp.noofsms) {
      return;
    }

    await topUpResellerClient.mutateAsync({
      clientname: resellerTopUp.clientname,
      noofsms: parseInt(resellerTopUp.noofsms)
    });

    // Clear form on success
    if (topUpResellerClient.isSuccess) {
      setResellerTopUp({ clientname: '', noofsms: '' });
    }
  };

  const handleSubTopUp = async () => {
    if (!subTopUp.subaccname || !subTopUp.noofsms) {
      return;
    }

    await topUpSubAccount.mutateAsync({
      subaccname: subTopUp.subaccname,
      noofsms: parseInt(subTopUp.noofsms)
    });

    // Clear form on success
    if (topUpSubAccount.isSuccess) {
      setSubTopUp({ subaccname: '', noofsms: '' });
    }
  };

  if (credentialsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading Mspace configuration...</span>
      </div>
    );
  }

  if (!hasCredentials) {
    return (
      <div className="space-y-4">
        <CredentialsStatusAlert />
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No Mspace credentials found. Please configure your Mspace API credentials in the API Credentials tab first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check for CORS/API connection issues
  const hasConnectionIssues = checkBalance.error?.message?.includes('CORS') ||
                              checkBalance.error?.message?.includes('Failed to send a request to the Edge Function') ||
                             checkBalance.error?.message?.includes('CORS') ||
                             checkBalance.error?.message?.includes('Failed to send a request to the Edge Function');

  if (hasConnectionIssues) {
    return (
      <div className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>API Connection Issue Detected</strong>
            <br />
            There's currently a CORS configuration issue with the Mspace API edge function. This is being resolved.
            <br />
            <br />
            <strong>Error Details:</strong>
            <br />
            {checkBalance.error?.message}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Temporary Status
            </CardTitle>
            <CardDescription>
              The Mspace integration is currently experiencing connection issues due to CORS policy restrictions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <strong>Issue:</strong> CORS (Cross-Origin Resource Sharing) policy is blocking API requests
              </p>
              <p className="text-sm text-gray-600">
                <strong>Impact:</strong> Balance checking and account management features are temporarily unavailable
              </p>
              <p className="text-sm text-gray-600">
                <strong>Resolution:</strong> The edge function configuration is being updated to fix this issue
              </p>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    checkBalance.reset();
                    testCredentials.reset();
                    refreshAll();
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isCheckingBalance}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                  Retry Connection
                </Button>

                <Button
                  onClick={() => checkBalance.mutate()}
                  size="sm"
                  disabled={isCheckingBalance}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Test API Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with balance and controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mspace Management</h2>
          <p className="text-gray-600">Manage your Mspace SMS account, sub-users, and reseller clients</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => testCredentials.mutate({} as any)}
            disabled={isTestingCredentials}
          >
            {isTestingCredentials ? <Clock className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Test Credentials
          </Button>
          <Button 
            variant="outline" 
            onClick={() => checkBalance.mutateAsync().catch(() => {})}
            disabled={isCheckingBalance}
          >
            {isCheckingBalance ? <Clock className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Check Balance
          </Button>
          <Button onClick={refreshAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            Account Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBalance ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ) : balance ? (
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-green-600">
                {balance.balance} SMS
              </div>
              <Badge variant={balance.status === 'success' ? 'default' : 'destructive'}>
                {balance.status === 'success' ? 'Active' : 'Error'}
              </Badge>
              {balance.error && (
                <span className="text-red-600 text-sm">{balance.error}</span>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Balance information unavailable</div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subusers">Sub Users</TabsTrigger>
          <TabsTrigger value="resellers">Reseller Clients</TabsTrigger>
          <TabsTrigger value="topup">Top-up</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balance?.balance || 0} SMS
                </div>
                <p className="text-xs text-muted-foreground">
                  Available credits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sub Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total: {subUsers.reduce((sum, user) => sum + parseInt(user.smsBalance || '0'), 0)} SMS
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reseller Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resellerClients.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total: {resellerClients.reduce((sum, client) => sum + parseInt(client.smsBalance || '0'), 0)} SMS
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="subusers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sub Account Users
              </CardTitle>
              <CardDescription>Manage your sub-account users and their balances</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSubUsers ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-3 border rounded">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : subUsers.length > 0 ? (
                <div className="space-y-3">
                  {subUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{user.subUserName}</span>
                      </div>
                      <Badge variant="outline">
                        {user.smsBalance} SMS
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No sub-account users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resellers" className="space-y-6">
          <Tabs defaultValue="api-clients" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="api-clients">API Clients</TabsTrigger>
              <TabsTrigger value="profiles">Client Profiles</TabsTrigger>
            </TabsList>
            
            <TabsContent value="api-clients">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Reseller Clients (API)
                  </CardTitle>
                  <CardDescription>Manage your reseller clients and their balances from Mspace API</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingResellerClients ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center justify-between p-3 border rounded">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  ) : resellerClients.length > 0 ? (
                    <div className="space-y-3">
                      {resellerClients.map((client, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{(client as any).clientUserName || client.clientname}</span>
                          </div>
                          <Badge variant="outline">
                            {client.smsBalance} SMS
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No reseller clients found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profiles">
              <ClientProfileManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="topup" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reseller Client Top-up */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Top-up Reseller Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reseller-client">Client Name</Label>
                  <Input
                    id="reseller-client"
                    placeholder="Enter client name"
                    value={resellerTopUp.clientname}
                    onChange={(e) => setResellerTopUp(prev => ({ ...prev, clientname: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reseller-sms">Number of SMS</Label>
                  <Input
                    id="reseller-sms"
                    type="number"
                    placeholder="Enter SMS count"
                    value={resellerTopUp.noofsms}
                    onChange={(e) => setResellerTopUp(prev => ({ ...prev, noofsms: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleResellerTopUp}
                  disabled={!resellerTopUp.clientname || !resellerTopUp.noofsms || isToppingUpReseller}
                  className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isToppingUpReseller ? 'Processing...' : 'Top-up Client'}
                </Button>
              </CardContent>
            </Card>

            {/* Sub Account Top-up */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Top-up Sub Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-account">Sub Account Name</Label>
                  <Input
                    id="sub-account"
                    placeholder="Enter sub account name"
                    value={subTopUp.subaccname}
                    onChange={(e) => setSubTopUp(prev => ({ ...prev, subaccname: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-sms">Number of SMS</Label>
                  <Input
                    id="sub-sms"
                    type="number"
                    placeholder="Enter SMS count"
                    value={subTopUp.noofsms}
                    onChange={(e) => setSubTopUp(prev => ({ ...prev, noofsms: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleSubTopUp}
                  disabled={!subTopUp.subaccname || !subTopUp.noofsms || isToppingUpSub}
                  className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isToppingUpSub ? 'Processing...' : 'Top-up Account'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
