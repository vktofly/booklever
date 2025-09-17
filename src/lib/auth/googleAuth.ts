// Google OAuth 2.0 Authentication
// Handles Google sign-in, Drive permissions, and session management

// Note: This service is designed for client-side use only
// Server-side operations should be handled through API routes

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleDriveInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
}

export class GoogleAuthService {
  private clientId: string;
  private redirectUri: string;
  private scopes: string[];

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    this.redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback';
    this.scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
  }> {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return await response.json();
  }

  /**
   * Get user information from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUser> {
    const response = await fetch('/api/auth/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to get user information from Google');
    }

    return await response.json();
  }

  /**
   * Get Google Drive storage information
   */
  async getDriveInfo(accessToken: string): Promise<GoogleDriveInfo> {
    const response = await fetch('/api/auth/drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken, action: 'getInfo' }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Drive storage information');
    }

    return await response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiryDate: number;
  }> {
    // For now, we'll implement a simple refresh mechanism
    // In a production app, you'd want to implement proper token refresh
    throw new Error('Token refresh not implemented yet');
  }

  /**
   * Create required folders in Google Drive
   */
  async createRequiredFolders(accessToken: string): Promise<{
    booksFolderId: string;
    highlightsFolderId: string;
  }> {
    const response = await fetch('/api/auth/drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken, action: 'createFolders' }),
    });

    if (!response.ok) {
      throw new Error('Failed to create required folders');
    }

    return await response.json();
  }


  /**
   * Validate if access token is still valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }
}
