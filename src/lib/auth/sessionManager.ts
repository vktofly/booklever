// Session Management
// Handles user session persistence, token management, and authentication state

import { GoogleUser, GoogleDriveInfo } from './googleAuth';

export interface UserSession {
  user: GoogleUser;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  driveInfo: GoogleDriveInfo;
  folders: {
    booksFolderId: string;
    highlightsFolderId: string;
  };
  lastSync: Date;
  isAuthenticated: boolean;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'booklever_session';
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  /**
   * Save user session to localStorage
   */
  static saveSession(session: UserSession): void {
    try {
      const sessionData = {
        ...session,
        lastSync: session.lastSync.toISOString()
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Load user session from localStorage
   */
  static loadSession(): UserSession | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) {
        return null;
      }

      const parsed = JSON.parse(sessionData);
      return {
        ...parsed,
        lastSync: new Date(parsed.lastSync)
      };
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Clear user session
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const session = this.loadSession();
    return session?.isAuthenticated === true;
  }

  /**
   * Get current user session
   */
  static getCurrentSession(): UserSession | null {
    return this.loadSession();
  }

  /**
   * Check if access token needs refresh
   */
  static needsTokenRefresh(): boolean {
    const session = this.loadSession();
    if (!session) {
      return false;
    }

    const now = Date.now();
    const timeUntilExpiry = session.expiryDate - now;
    
    return timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD;
  }

  /**
   * Update session with new tokens
   */
  static updateTokens(accessToken: string, refreshToken: string, expiryDate: number): void {
    const session = this.loadSession();
    if (!session) {
      return;
    }

    const updatedSession: UserSession = {
      ...session,
      accessToken,
      refreshToken,
      expiryDate
    };

    this.saveSession(updatedSession);
  }

  /**
   * Update last sync time
   */
  static updateLastSync(): void {
    const session = this.loadSession();
    if (!session) {
      return;
    }

    const updatedSession: UserSession = {
      ...session,
      lastSync: new Date()
    };

    this.saveSession(updatedSession);
  }

  /**
   * Update Drive info
   */
  static updateDriveInfo(driveInfo: GoogleDriveInfo): void {
    const session = this.loadSession();
    if (!session) {
      return;
    }

    const updatedSession: UserSession = {
      ...session,
      driveInfo
    };

    this.saveSession(updatedSession);
  }

  /**
   * Get user info
   */
  static getUser(): GoogleUser | null {
    const session = this.loadSession();
    return session?.user || null;
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    const session = this.loadSession();
    return session?.accessToken || null;
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    const session = this.loadSession();
    return session?.refreshToken || null;
  }

  /**
   * Get Drive folders
   */
  static getDriveFolders(): { booksFolderId: string; highlightsFolderId: string } | null {
    const session = this.loadSession();
    return session?.folders || null;
  }

  /**
   * Check if session is valid (not expired)
   */
  static isSessionValid(): boolean {
    const session = this.loadSession();
    if (!session) {
      return false;
    }

    const now = Date.now();
    return session.expiryDate > now;
  }

  /**
   * Get session expiry time
   */
  static getSessionExpiry(): Date | null {
    const session = this.loadSession();
    if (!session) {
      return null;
    }

    return new Date(session.expiryDate);
  }

  /**
   * Get time until session expires
   */
  static getTimeUntilExpiry(): number {
    const session = this.loadSession();
    if (!session) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, session.expiryDate - now);
  }

  /**
   * Format time until expiry for display
   */
  static getTimeUntilExpiryFormatted(): string {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    
    if (timeUntilExpiry === 0) {
      return 'Expired';
    }

    const minutes = Math.floor(timeUntilExpiry / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}
