// API Route: Get user information
// Handles server-side Google user info retrieval

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.id || !data.email || !data.name) {
      return NextResponse.json(
        { error: 'Failed to get user information from Google' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    });

  } catch (error) {
    console.error('Failed to get user info:', error);
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}
