'use client';

// Simple Authentication Context
// Provides mock authentication for testing without Google APIs

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MockUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface MockDriveInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
}

interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: MockUser | null;
  driveInfo: MockDriveInfo | null;
  session: any;
  
  // Methods
  signIn: () => Promise<void>;
  signOut: () => void;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<MockUser | null>(null);
  const [driveInfo, setDriveInfo] = useState<MockDriveInfo | null>(null);
  const [session, setSession] = useState<any>(null);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set up mock user
        const mockUser: MockUser = {
          id: 'mock-user-123',
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://via.placeholder.com/150'
        };

        const mockDriveInfo: MockDriveInfo = {
          totalSpace: 15 * 1024 * 1024 * 1024, // 15GB
          usedSpace: 2 * 1024 * 1024 * 1024,   // 2GB used
          availableSpace: 13 * 1024 * 1024 * 1024 // 13GB available
        };

        setUser(mockUser);
        setDriveInfo(mockDriveInfo);
        setIsAuthenticated(true);
        
        // Create a mock session
        const mockSession = {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiryDate: Date.now() + 3600000,
          user: mockUser
        };
        setSession(mockSession);
        
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setIsAuthenticated(false);
        setUser(null);
        setDriveInfo(null);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async () => {
    // Mock sign in - just redirect to library
    window.location.href = '/library';
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    setDriveInfo(null);
    setSession(null);
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    driveInfo,
    session,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
