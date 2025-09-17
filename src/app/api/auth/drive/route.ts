// API Route: Get Drive information
// Handles server-side Google Drive operations

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, action, data } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    switch (action) {
      case 'getInfo':
        return await getDriveInfo(oauth2Client);
      case 'createFolders':
        return await createRequiredFolders(oauth2Client);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Drive operation failed:', error);
    return NextResponse.json(
      { error: 'Drive operation failed' },
      { status: 500 }
    );
  }
}

async function getDriveInfo(oauth2Client: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const { data } = await drive.about.get({ fields: 'storageQuota' });

  const quota = data.storageQuota;
  if (!quota) {
    throw new Error('Failed to get Drive storage information');
  }

  return NextResponse.json({
    totalSpace: parseInt(quota.limit || '0'),
    usedSpace: parseInt(quota.usage || '0'),
    availableSpace: parseInt(quota.limit || '0') - parseInt(quota.usage || '0')
  });
}

async function createRequiredFolders(oauth2Client: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Create BookLever root folder
  const rootFolder = await createFolderIfNotExists(drive, 'BookLever', 'root');
  
  // Create Books folder
  const booksFolder = await createFolderIfNotExists(drive, 'Books', rootFolder.id);
  
  // Create Highlights folder
  const highlightsFolder = await createFolderIfNotExists(drive, 'Highlights', rootFolder.id);

  return NextResponse.json({
    booksFolderId: booksFolder.id,
    highlightsFolderId: highlightsFolder.id
  });
}

async function createFolderIfNotExists(
  drive: any,
  folderName: string,
  parentId: string
): Promise<{ id: string; name: string }> {
  try {
    // Check if folder already exists
    const { data: existingFolders } = await drive.files.list({
      q: `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)'
    });

    if (existingFolders.files && existingFolders.files.length > 0) {
      return {
        id: existingFolders.files[0].id,
        name: existingFolders.files[0].name
      };
    }

    // Create new folder
    const { data: newFolder } = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      },
      fields: 'id, name'
    });

    return {
      id: newFolder.id,
      name: newFolder.name
    };
  } catch (error) {
    console.error(`Failed to create folder ${folderName}:`, error);
    throw error;
  }
}
