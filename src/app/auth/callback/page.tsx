'use client';

// OAuth Callback Page
// Handles the OAuth callback from Google (simplified for mock auth)

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // For mock auth, just redirect to library
    setStatus('success');
    setTimeout(() => {
      router.push('/library');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          {status === 'loading' && 'Authenticating...'}
          {status === 'success' && 'Authentication successful!'}
          {status === 'error' && 'Authentication failed'}
        </h2>
        <p className="mt-2 text-gray-600">
          {status === 'loading' && 'Please wait while we complete your sign-in...'}
          {status === 'success' && 'Redirecting to your library...'}
          {status === 'error' && 'Please try signing in again.'}
        </p>
      </div>
    </div>
  );
}