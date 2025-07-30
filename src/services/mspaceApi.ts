/**
 * Mspace API Service
 * Based on official documentation: https://www.mspace.co.ke/api.h
 * 
 * All endpoints follow the format:
 * http://main_url/mspaceservice/wr/sms/{endpoint}/username={username}/password={password}/...
 */

export interface MspaceCredentials {
  username: string;
  password: string;
  senderId?: string;
}

export interface BalanceResponse {
  balance: number;
  status: 'success' | 'error';
  error?: string;
}

export interface SendSMSResponse {
  messageId: string;
  responseTime: string;
  status: 'successful' | 'failed';
  error?: string;
}

export interface SubUser {
  smsBalance: string;
  subUserName: string;
}

export interface ResellerClient {
  smsBalance: string;
  clientname: string;
}

export interface TopUpResponse {
  status: 'success' | 'error';
  message: string;
  error?: string;
}

export interface LoginResponse {
  status: 'success' | 'error';
  message: string;
  error?: string;
}

class MspaceApiService {
  private baseUrl = 'https://api.mspace.co.ke/mspaceservice/wr/sms';

  /**
   * Query SMS Balance
   * Endpoint: /balance/username={username}/password={password}
   */
  async queryBalance(credentials: MspaceCredentials): Promise<BalanceResponse> {
    try {
      const url = `${this.baseUrl}/balance/username=${credentials.username}/password=${credentials.password}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          balance: 0,
          status: 'error',
          error: `HTTP ${response.status}: ${responseText}`
        };
      }

      // Check for authentication failure
      if (responseText.includes('Error 100: Authentication Failure')) {
        return {
          balance: 0,
          status: 'error',
          error: 'Authentication Failure - Invalid username or password'
        };
      }

      // Parse balance (should be a number)
      const balance = parseInt(responseText.trim());
      if (isNaN(balance)) {
        return {
          balance: 0,
          status: 'error',
          error: `Invalid balance response: ${responseText}`
        };
      }

      return {
        balance,
        status: 'success'
      };

    } catch (error) {
      return {
        balance: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send SMS
   * Endpoint: /sendtext/username={username}/password={password}/senderid={senderId}/recipient={recipient}/message={message}
   */
  async sendSMS(
    credentials: MspaceCredentials, 
    recipient: string, 
    message: string,
    senderId?: string
  ): Promise<SendSMSResponse> {
    try {
      const senderIdParam = senderId || credentials.senderId || 'MSPACE';
      const encodedMessage = encodeURIComponent(message);
      const encodedRecipient = encodeURIComponent(recipient);
      
      const url = `${this.baseUrl}/sendtext/username=${credentials.username}/password=${credentials.password}/senderid=${senderIdParam}/recipient=${encodedRecipient}/message=${encodedMessage}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          messageId: '',
          responseTime: new Date().toISOString(),
          status: 'failed',
          error: `HTTP ${response.status}: ${responseText}`
        };
      }

      // Check for common errors
      if (responseText.includes('Authentication failure')) {
        return {
          messageId: '',
          responseTime: new Date().toISOString(),
          status: 'failed',
          error: 'Authentication failure - Invalid credentials'
        };
      }

      if (responseText.includes('Insufficient Balance')) {
        return {
          messageId: '',
          responseTime: new Date().toISOString(),
          status: 'failed',
          error: 'Insufficient Balance'
        };
      }

      if (responseText.includes('Invalid sender ID')) {
        return {
          messageId: '',
          responseTime: new Date().toISOString(),
          status: 'failed',
          error: 'Invalid sender ID'
        };
      }

      try {
        // Parse JSON response
        const jsonResponse = JSON.parse(responseText);
        if (Array.isArray(jsonResponse) && jsonResponse.length > 0) {
          const result = jsonResponse[0];
          return {
            messageId: result.messageId || '',
            responseTime: result.responseTime || new Date().toISOString(),
            status: result.status === 'successful' ? 'successful' : 'failed',
            error: result.status !== 'successful' ? 'SMS sending failed' : undefined
          };
        }
      } catch (parseError) {
        // If not JSON, treat as error
        return {
          messageId: '',
          responseTime: new Date().toISOString(),
          status: 'failed',
          error: `Invalid response format: ${responseText}`
        };
      }

      return {
        messageId: '',
        responseTime: new Date().toISOString(),
        status: 'failed',
        error: 'Unexpected response format'
      };

    } catch (error) {
      return {
        messageId: '',
        responseTime: new Date().toISOString(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Query Sub-Account Users
   * Endpoint: /subusers/username={username}/password={password}
   */
  async querySubUsers(credentials: MspaceCredentials): Promise<SubUser[]> {
    try {
      const url = `${this.baseUrl}/subusers/username=${credentials.username}/password=${credentials.password}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      if (responseText.includes('Authentication failure')) {
        throw new Error('Authentication failure - Invalid credentials');
      }

      try {
        const jsonResponse = JSON.parse(responseText);
        if (Array.isArray(jsonResponse)) {
          return jsonResponse;
        }
        return [];
      } catch (parseError) {
        throw new Error(`Invalid response format: ${responseText}`);
      }

    } catch (error) {
      console.error('Error querying sub users:', error);
      throw error;
    }
  }

  /**
   * Query Reseller Clients
   * Endpoint: /resellerclients/username={username}/password={password}
   */
  async queryResellerClients(credentials: MspaceCredentials): Promise<ResellerClient[]> {
    try {
      const url = `${this.baseUrl}/resellerclients/username=${credentials.username}/password=${credentials.password}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      if (responseText.includes('Authentication failure')) {
        throw new Error('Authentication failure - Invalid credentials');
      }

      try {
        const jsonResponse = JSON.parse(responseText);
        if (Array.isArray(jsonResponse)) {
          return jsonResponse;
        }
        return [];
      } catch (parseError) {
        throw new Error(`Invalid response format: ${responseText}`);
      }

    } catch (error) {
      console.error('Error querying reseller clients:', error);
      throw error;
    }
  }

  /**
   * Reseller Client Top-Up
   * Endpoint: /resellerclienttopup/username={username}/password={password}/clientname={clientname}/noofsms={noofsms}
   */
  async topUpResellerClient(
    credentials: MspaceCredentials,
    clientname: string,
    noofsms: number
  ): Promise<TopUpResponse> {
    try {
      const url = `${this.baseUrl}/resellerclienttopup/username=${credentials.username}/password=${credentials.password}/clientname=${clientname}/noofsms=${noofsms}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${responseText}`,
          error: responseText
        };
      }

      // Check for success message
      if (responseText.includes('Successful Top up')) {
        return {
          status: 'success',
          message: responseText
        };
      }

      // Check for common errors
      if (responseText.includes('Authentication failure')) {
        return {
          status: 'error',
          message: 'Authentication failure - Invalid credentials',
          error: 'Authentication failure'
        };
      }

      if (responseText.includes('Insufficient Balance')) {
        return {
          status: 'error',
          message: 'Insufficient Balance',
          error: 'Insufficient Balance'
        };
      }

      if (responseText.includes('You are not Authorized')) {
        return {
          status: 'error',
          message: 'You are not authorized to make this transaction',
          error: 'Not Authorized'
        };
      }

      return {
        status: 'error',
        message: responseText,
        error: 'Unknown error'
      };

    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sub-Account User Top-Up
   * Endpoint: /subacctopup/username={username}/password={password}/subaccname={subaccname}/noofsms={noofsms}
   */
  async topUpSubAccount(
    credentials: MspaceCredentials,
    subaccname: string,
    noofsms: number
  ): Promise<TopUpResponse> {
    try {
      const url = `${this.baseUrl}/subacctopup/username=${credentials.username}/password=${credentials.password}/subaccname=${subaccname}/noofsms=${noofsms}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${responseText}`,
          error: responseText
        };
      }

      // Check for success message
      if (responseText.includes('Successful Top up')) {
        return {
          status: 'success',
          message: responseText
        };
      }

      // Check for common errors
      if (responseText.includes('Authentication failure')) {
        return {
          status: 'error',
          message: 'Authentication failure - Invalid credentials',
          error: 'Authentication failure'
        };
      }

      if (responseText.includes('Insufficient Balance')) {
        return {
          status: 'error',
          message: 'Insufficient Balance',
          error: 'Insufficient Balance'
        };
      }

      if (responseText.includes('You are not Authorized')) {
        return {
          status: 'error',
          message: 'You are not authorized to make this transaction',
          error: 'Not Authorized'
        };
      }

      return {
        status: 'error',
        message: responseText,
        error: 'Unknown error'
      };

    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * System Login (Test Credentials)
   * Endpoint: /login/username={username}/password={password}
   */
  async testLogin(credentials: MspaceCredentials): Promise<LoginResponse> {
    try {
      const url = `${this.baseUrl}/login/username=${credentials.username}/password=${credentials.password}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${responseText}`,
          error: responseText
        };
      }

      if (responseText.includes('Authentication failure')) {
        return {
          status: 'error',
          message: 'Authentication failure - Invalid credentials',
          error: 'Authentication failure'
        };
      }

      return {
        status: 'success',
        message: 'Login successful - User credentials are valid'
      };

    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const mspaceApi = new MspaceApiService();

// Export the class for testing or multiple instances
export { MspaceApiService };
