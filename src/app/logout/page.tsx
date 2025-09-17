'use client';

// Logout Page
// Handles user sign out

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/GoogleAuthContext';

export default function LogoutPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Sign out immediately
    signOut();
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      router.push('/login');
    }, 1000);
  }, [signOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Signing out...</h2>
        <p className="mt-2 text-gray-600">Redirecting to login page...</p>
      </div>
    </div>
  );
}
