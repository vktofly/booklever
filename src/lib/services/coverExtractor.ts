// Cover Extraction Service
// Handles extraction and generation of book covers from EPUB and PDF files

import { Book } from '@/types';

export interface CoverExtractionResult {
  coverUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: 'jpeg' | 'png' | 'webp';
  size: number; // in bytes
}

export interface CoverMetadata {
  title?: string;
  author?: string;
  cover?: CoverExtractionResult;
  totalPages?: number;
}

export class CoverExtractor {
  private maxCoverSize: number = 2 * 1024 * 1024; // 2MB
  private thumbnailSize: number = 300; // 300px max dimension
  private quality: number = 0.8; // JPEG quality

  /**
   * Extract cover from EPUB file
   */
  async extractEPUBCover(fileData: Uint8Array): Promise<CoverExtractionResult | null> {
    try {
      // Dynamic import for JSZip to avoid build issues
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(fileData);
      
      // Parse container.xml to find OPF file
      const containerFile = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerFile) {
        return null;
      }

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerFile, 'text/xml');
      const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
      
      if (!opfPath) {
        return null;
      }

      // Parse OPF file for cover metadata
      const opfFile = await zip.file(opfPath)?.async('text');
      if (!opfFile) {
        return null;
      }

      const opfDoc = parser.parseFromString(opfFile, 'text/xml');
      
      // Try multiple methods to find cover image
      let coverPath: string | null = null;
      
      // Method 1: Look for cover meta tag
      const coverId = opfDoc.querySelector('metadata meta[name="cover"]')?.getAttribute('content');
      if (coverId) {
        const coverItem = opfDoc.querySelector(`manifest item[id="${coverId}"]`);
        if (coverItem) {
          const coverHref = coverItem.getAttribute('href');
          if (coverHref) {
            coverPath = this.resolvePath(coverHref, opfPath);
          }
        }
      }
      
      // Method 2: Look for cover-image meta tag
      if (!coverPath) {
        const coverImageId = opfDoc.querySelector('metadata meta[name="cover-image"]')?.getAttribute('content');
        if (coverImageId) {
          const coverItem = opfDoc.querySelector(`manifest item[id="${coverImageId}"]`);
          if (coverItem) {
            const coverHref = coverItem.getAttribute('href');
            if (coverHref) {
              coverPath = this.resolvePath(coverHref, opfPath);
            }
          }
        }
      }
      
      // Method 3: Look for common cover image names
      if (!coverPath) {
        const commonNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif', 'cover.webp'];
        for (const name of commonNames) {
          if (zip.file(name)) {
            coverPath = name;
            break;
          }
        }
      }
      
      // Method 4: Look for images in images folder
      if (!coverPath) {
        const imageFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('images/') && 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
        );
        if (imageFiles.length > 0) {
          coverPath = imageFiles[0]; // Use first image found
        }
      }
      
      // Method 5: Look for any image in the root
      if (!coverPath) {
        const rootImages = Object.keys(zip.files).filter(name => 
          !name.includes('/') && 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
        );
        if (rootImages.length > 0) {
          coverPath = rootImages[0]; // Use first image found
        }
      }

      if (!coverPath) {
        return null;
      }

      // Extract cover image
      const coverFile = zip.file(coverPath);
      if (!coverFile) {
        return null;
      }

      const coverBlob = await coverFile.async('blob');
      
      // Check file size
      if (coverBlob.size > this.maxCoverSize) {
        console.warn('Cover image too large, skipping:', coverBlob.size);
        return null;
      }

      // Process and optimize the cover
      return await this.processCoverImage(coverBlob, coverPath);

    } catch (error) {
      console.error('Failed to extract EPUB cover:', error);
      return null;
    }
  }

  /**
   * Extract cover from PDF file (first page as thumbnail)
   */
  async extractPDFCover(fileData: Uint8Array): Promise<CoverExtractionResult | null> {
    try {
      // Dynamic import for PDF.js to avoid build issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set up PDF.js worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
      
      if (pdf.numPages === 0) {
        return null;
      }

      // Get first page
      const page = await pdf.getPage(1);
      
      // Set up canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        return null;
      }

      // Calculate scale to fit thumbnail size
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        this.thumbnailSize / viewport.width,
        this.thumbnailSize / viewport.height
      );
      
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        canvas: canvas
      }).promise;
      
      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert canvas to blob'));
              return;
            }
            
            try {
              const result = await this.processCoverImage(blob, 'pdf-page-1');
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          'image/jpeg',
          this.quality
        );
      });

    } catch (error) {
      console.error('Failed to extract PDF cover:', error);
      return null;
    }
  }

  /**
   * Safely resolve relative paths in EPUB files
   */
  private resolvePath(href: string, basePath: string): string {
    try {
      // If href is already absolute, return it
      if (href.startsWith('/') || href.includes('://')) {
        return href;
      }
      
      // If basePath is a valid URL, use URL constructor
      if (basePath.includes('://')) {
        return new URL(href, basePath).pathname;
      }
      
      // For relative paths, manually resolve them
      const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
      return baseDir + href;
    } catch (error) {
      console.warn('Failed to resolve path:', href, 'with base:', basePath, error);
      // Fallback: return the href as-is
      return href;
    }
  }

  /**
   * Process and optimize cover image
   */
  private async processCoverImage(blob: Blob, filename: string): Promise<CoverExtractionResult> {
    // Create image element to get dimensions
    const img = new Image();
    const imageUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const { width, height } = img;
          
          // Create thumbnail
          const thumbnailCanvas = document.createElement('canvas');
          const thumbnailContext = thumbnailCanvas.getContext('2d');
          
          if (!thumbnailContext) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Calculate thumbnail dimensions
          const thumbnailScale = Math.min(
            this.thumbnailSize / width,
            this.thumbnailSize / height
          );
          
          const thumbnailWidth = Math.round(width * thumbnailScale);
          const thumbnailHeight = Math.round(height * thumbnailScale);
          
          thumbnailCanvas.width = thumbnailWidth;
          thumbnailCanvas.height = thumbnailHeight;
          
          // Draw thumbnail
          thumbnailContext.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
          
          // Convert to blob
          const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
            thumbnailCanvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to create thumbnail blob'));
                }
              },
              'image/jpeg',
              this.quality
            );
          });
          
          // Create URLs
          const coverUrl = URL.createObjectURL(blob);
          const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
          
          // Determine format
          const format = blob.type.includes('png') ? 'png' : 
                        blob.type.includes('webp') ? 'webp' : 'jpeg';
          
          // Clean up
          URL.revokeObjectURL(imageUrl);
          
          resolve({
            coverUrl,
            thumbnailUrl,
            width,
            height,
            format,
            size: blob.size
          });
          
        } catch (error) {
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Generate a default cover for a book
   */
  generateDefaultCover(book: Book): Promise<CoverExtractionResult> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    // Set canvas size
    const width = 400;
    const height = 600;
    canvas.width = width;
    canvas.height = height;
    
    // Background gradient
    const gradient = context.createLinearGradient(0, 0, width, height);
    if (book.fileType === 'epub') {
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#1E40AF');
    } else {
      gradient.addColorStop(0, '#EF4444');
      gradient.addColorStop(1, '#DC2626');
    }
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    
    // Add border
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 4;
    context.strokeRect(2, 2, width - 4, height - 4);
    
    // Add text
    context.fillStyle = '#FFFFFF';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Title
    const titleLines = this.wrapText(context, book.title, width - 40);
    let y = height / 2 - (titleLines.length * 30) / 2;
    
    titleLines.forEach(line => {
      context.fillText(line, width / 2, y);
      y += 30;
    });
    
    // Author
    context.font = '16px Arial';
    context.fillText(book.author, width / 2, y + 20);
    
    // File type indicator
    context.font = '12px Arial';
    context.fillText(book.fileType.toUpperCase(), width / 2, height - 30);
    
    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create default cover'));
            return;
          }
          
          const coverUrl = URL.createObjectURL(blob);
          const thumbnailUrl = URL.createObjectURL(blob); // Same for default covers
          
          resolve({
            coverUrl,
            thumbnailUrl,
            width,
            height,
            format: 'jpeg',
            size: blob.size
          });
        },
        'image/jpeg',
        this.quality
      );
    });
  }

  /**
   * Wrap text to fit within width
   */
  private wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = context.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Extract metadata from EPUB file
   */
  async extractEPUBMetadata(fileData: Uint8Array): Promise<CoverMetadata> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(fileData);
      
      // Parse container.xml
      const containerFile = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerFile) {
        return {};
      }

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerFile, 'text/xml');
      const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
      
      if (!opfPath) {
        return {};
      }

      // Parse OPF file
      const opfFile = await zip.file(opfPath)?.async('text');
      if (!opfFile) {
        return {};
      }

      const opfDoc = parser.parseFromString(opfFile, 'text/xml');
      
      // Extract metadata
      const title = opfDoc.querySelector('metadata title')?.textContent;
      const author = opfDoc.querySelector('metadata creator')?.textContent;
      
      // Extract cover
      const cover = await this.extractEPUBCover(fileData);
      
      // Count pages (approximate by counting spine items)
      const spineItems = opfDoc.querySelectorAll('spine itemref');
      const totalPages = spineItems.length;
      
      return {
        title: title || undefined,
        author: author || undefined,
        cover: cover || undefined,
        totalPages: totalPages || undefined
      };
      
    } catch (error) {
      console.error('Failed to extract EPUB metadata:', error);
      return {};
    }
  }

  /**
   * Extract metadata from PDF file
   */
  async extractPDFMetadata(fileData: Uint8Array): Promise<CoverMetadata> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
      
      // Get document info
      const info = await pdf.getMetadata();
      const title = (info.info as any)?.Title;
      const author = (info.info as any)?.Author;
      
      // Extract cover
      const cover = await this.extractPDFCover(fileData);
      
      return {
        title: title || undefined,
        author: author || undefined,
        cover: cover || undefined,
        totalPages: pdf.numPages || undefined
      };
      
    } catch (error) {
      console.error('Failed to extract PDF metadata:', error);
      return {};
    }
  }

  /**
   * Clean up object URLs
   */
  cleanupUrls(urls: string[]): void {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }
}
