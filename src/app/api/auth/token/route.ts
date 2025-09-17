// API Route: Exchange OAuth code for tokens
// Handles server-side Google OAuth token exchange

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json(
        { error: 'Failed to obtain tokens from Google' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || Date.now() + 3600000
    });

  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.json(
      { error: 'Token exchange failed' },
      { status: 500 }
    );
  }
}
