// API Route: Exchange OAuth code for tokens
// Handles server-side Google OAuth token exchange

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    console.log('Token API: Starting token exchange...');
    const { code } = await request.json();

    if (!code) {
      console.log('Token API: No authorization code provided');
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    console.log('Token API: Creating OAuth2 client...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    console.log('Token API: Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Token API: Tokens received:', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date 
    });

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json(
        { error: 'Failed to obtain tokens from Google' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: 3600,
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('Token exchange failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      status: (error as any)?.status
    });
    return NextResponse.json(
      { error: 'Token exchange failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
