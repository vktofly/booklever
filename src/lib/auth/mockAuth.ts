// Mock Authentication Service
// Provides mock authentication for testing without Google APIs

export interface MockUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface MockDriveInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
}

export class MockAuthService {
  private user: MockUser | null = null;
  private driveInfo: MockDriveInfo | null = null;

  constructor() {
    // Initialize with mock data
    this.user = {
      id: 'mock-user-123',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://via.placeholder.com/150'
    };

    this.driveInfo = {
      totalSpace: 15 * 1024 * 1024 * 1024, // 15GB
      usedSpace: 2 * 1024 * 1024 * 1024,   // 2GB used
      availableSpace: 13 * 1024 * 1024 * 1024 // 13GB available
    };
  }

  /**
   * Get mock user information
   */
  getUser(): MockUser | null {
    return this.user;
  }

  /**
   * Get mock drive information
   */
  getDriveInfo(): MockDriveInfo | null {
    return this.driveInfo;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  /**
   * Sign out (mock)
   */
  signOut(): void {
    this.user = null;
    this.driveInfo = null;
  }

  /**
   * Get auth URL (mock)
   */
  getAuthUrl(): string {
    return '/login';
  }

  /**
   * Exchange code for tokens (mock)
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
  }> {
    // Mock successful token exchange
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiryDate: Date.now() + 3600000 // 1 hour
    };
  }

  /**
   * Get user info (mock)
   */
  async getUserInfo(accessToken: string): Promise<MockUser> {
    return this.user!;
  }

  /**
   * Get drive info (mock)
   */
  async getDriveInfo(accessToken: string): Promise<MockDriveInfo> {
    return this.driveInfo!;
  }
}
