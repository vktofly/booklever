'use client';

// OAuth Callback Page
// Handles the OAuth callback from Google

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setErrorMessage(`OAuth error: ${error}`);
        return;
      }

      if (code) {
        try {
          console.log('AuthCallback: Exchanging code for tokens...');
          // Exchange code for tokens
          const response = await fetch('/api/auth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          console.log('AuthCallback: Token exchange response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            
            // Store tokens
            localStorage.setItem('google_access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('google_refresh_token', data.refresh_token);
            }
            
            // Get user info and store it
            console.log('AuthCallback: Fetching user info...');
            let userData = null;
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                'Authorization': `Bearer ${data.access_token}`
              }
            });
            
            console.log('AuthCallback: User info response status:', userResponse.status);
            if (userResponse.ok) {
              userData = await userResponse.json();
              console.log('AuthCallback: User data received:', { id: userData.id, email: userData.email, name: userData.name });
              localStorage.setItem('google_user', JSON.stringify({
                id: userData.id,
                email: userData.email,
                name: userData.name,
                picture: userData.picture
              }));
            } else {
              console.warn('AuthCallback: Failed to fetch user info:', userResponse.status, await userResponse.text());
            }
            
            setStatus('success');
            
            // Trigger a custom event to notify the auth context
            window.dispatchEvent(new CustomEvent('googleAuthSuccess', {
              detail: { accessToken: data.access_token, user: userData }
            }));
            
            setTimeout(() => {
              router.push('/library');
            }, 1000);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to exchange code for tokens');
          }
        } catch (error) {
          console.error('Token exchange failed:', error);
          setStatus('error');
          setErrorMessage('Failed to complete authentication. Please try again.');
        }
      } else {
        setStatus('error');
        setErrorMessage('No authorization code received from Google.');
      }
    };

    handleCallback();
  }, [searchParams, router]);

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
          {status === 'error' && errorMessage}
        </p>
        {status === 'error' && (
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}