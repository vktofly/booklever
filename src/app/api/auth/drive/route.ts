// API Route: Get Drive information
// Handles server-side Google Drive operations

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

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
      case 'uploadFile':
        return await uploadFile(oauth2Client, data);
      case 'listFiles':
        return await listFiles(oauth2Client, data);
      case 'downloadFile':
        return await downloadFile(oauth2Client, data);
      case 'deleteFile':
        return await deleteFile(oauth2Client, data);
      case 'createBookFolder':
        return await createBookFolder(oauth2Client, data);
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

async function createBookFolder(oauth2Client: any, data: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const { bookTitle, booksFolderId } = data;
  
  if (!bookTitle || !booksFolderId) {
    throw new Error('Book title and books folder ID are required');
  }

  // Sanitize folder name (remove invalid characters)
  const sanitizedTitle = bookTitle.replace(/[<>:"/\\|?*]/g, '_').trim();
  
  // Create individual book folder
  const bookFolder = await createFolderIfNotExists(drive, sanitizedTitle, booksFolderId);

  return NextResponse.json({
    bookFolderId: bookFolder.id,
    bookFolderName: sanitizedTitle
  });
}

async function uploadFile(oauth2Client: any, data: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const { fileName, fileData, mimeType, parentFolderId } = data;
  
  // Convert base64 to buffer and create a readable stream
  const buffer = Buffer.from(fileData, 'base64');
  const stream = new Readable({
    read() {
      this.push(buffer);
      this.push(null); // End the stream
    }
  });

  const { data: uploadedFile } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId]
    },
    media: {
      mimeType: mimeType,
      body: stream
    },
    fields: 'id, name, size, createdTime, modifiedTime'
  });

  return NextResponse.json({
    id: uploadedFile.id,
    name: uploadedFile.name,
    size: uploadedFile.size,
    createdTime: uploadedFile.createdTime,
    modifiedTime: uploadedFile.modifiedTime
  });
}

async function listFiles(oauth2Client: any, data: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const { folderId, mimeType } = data;
  
  let query = `parents in '${folderId}' and trashed=false`;
  if (mimeType) {
    query += ` and mimeType='${mimeType}'`;
  }

  const { data: files } = await drive.files.list({
    q: query,
    fields: 'files(id, name, size, mimeType, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc'
  });

  return NextResponse.json({
    files: files.files || []
  });
}

async function downloadFile(oauth2Client: any, data: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const { fileId } = data;
  
  const { data: fileData } = await drive.files.get({
    fileId: fileId,
    alt: 'media'
  }, {
    responseType: 'arraybuffer'
  });

  return NextResponse.json({
    data: Buffer.from(fileData as ArrayBuffer).toString('base64')
  });
}

async function deleteFile(oauth2Client: any, data: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const { fileId } = data;
  
  await drive.files.delete({
    fileId: fileId
  });

  return NextResponse.json({
    success: true
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
