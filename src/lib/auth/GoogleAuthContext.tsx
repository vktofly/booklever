'use client';

// Google OAuth Authentication Context
// Provides real Google OAuth 2.0 authentication with Drive access

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface DriveInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
}

interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GoogleUser | null;
  driveInfo: DriveInfo | null;
  accessToken: string | null;
  
  // Methods
  signIn: () => Promise<void>;
  signOut: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have stored tokens
        const storedToken = localStorage.getItem('google_access_token');
        const storedUser = localStorage.getItem('google_user');
        
        if (storedToken && storedUser) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          
          // Verify token is still valid and get drive info
          await verifyTokenAndGetDriveInfo(storedToken);
        }
        
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear invalid tokens
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user');
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for custom auth success event (when user returns from OAuth callback)
    const handleAuthSuccess = (e: CustomEvent) => {
      console.log('Google auth success event received, updating auth state...');
      const { accessToken: newToken, user: newUser } = e.detail;
      
      setAccessToken(newToken);
      setUser(newUser);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // Get drive info
      verifyTokenAndGetDriveInfo(newToken);
    };

    window.addEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);

    return () => {
      window.removeEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
    };
  }, []);

  // Verify token and get drive info
  const verifyTokenAndGetDriveInfo = async (token: string) => {
    try {
      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Invalid token');
      }

      const userData = await userResponse.json();
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      });

      // Get drive info
      const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (driveResponse.ok) {
        const driveData = await driveResponse.json();
        const quota = driveData.storageQuota;
        setDriveInfo({
          totalSpace: parseInt(quota.limit || '0'),
          usedSpace: parseInt(quota.usage || '0'),
          availableSpace: parseInt(quota.limit || '0') - parseInt(quota.usage || '0')
        });
      }

    } catch (error) {
      console.error('Failed to verify token:', error);
      throw error;
    }
  };

  // Sign in with Google
  const signIn = async () => {
    try {
      setIsLoading(true);

      // Create OAuth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();

    } catch (error) {
      console.error('Failed to sign in:', error);
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    setDriveInfo(null);
    setAccessToken(null);
    
    // Clear stored tokens
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
    
    // Redirect to home
    window.location.href = '/';
  };

  // Refresh access token
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      localStorage.setItem('google_access_token', data.access_token);

      // Get updated drive info
      await verifyTokenAndGetDriveInfo(data.access_token);

    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, sign out
      signOut();
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    driveInfo,
    accessToken,
    signIn,
    signOut,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
