// PDF Renderer using PDF.js
// Provides PDF rendering functionality for the web platform

// PDF.js imports - only on client side
let pdfjsLib: any = null;

// Dynamically import PDF.js only on client side
const loadPDFJS = async () => {
  if (typeof window !== 'undefined' && !pdfjsLib) {
    const pdfjs = await import('pdfjs-dist');
    pdfjsLib = pdfjs;
    // Set up PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
};

export interface PDFRenderResult {
  content: string;
  metadata: {
    totalPages: number;
    chapters: Array<{
      id: string;
      title: string;
      startPage: number;
    }>;
  };
  styles?: string;
}

export interface PDFSelection {
  toString(): string;
  startOffset: number;
  endOffset: number;
  context?: {
    before: string;
    after: string;
  };
}

export class PDFRenderer {
  private pdfDocument: any = null;
  private currentPage: number = 1;
  private totalPages: number = 0;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  constructor() {}

  /**
   * Load PDF from data
   */
  async loadPDF(data: Uint8Array): Promise<void> {
    try {
      // Ensure PDF.js is loaded
      const pdfjs = await loadPDFJS();
      if (!pdfjs) {
        throw new Error('PDF.js failed to load');
      }

      // Use the data directly as ArrayBuffer
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

      // Load PDF document
      this.pdfDocument = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      this.totalPages = this.pdfDocument.numPages;
    } catch (error) {
      console.error('Failed to load PDF:', error);
      throw error;
    }
  }

  /**
   * Render the PDF content
   */
  async render(container: HTMLElement): Promise<PDFRenderResult> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    try {
      this.container = container;
      
      // Create canvas for rendering
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      
      if (!this.context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size
      this.canvas.style.width = '100%';
      this.canvas.style.height = 'auto';
      this.canvas.style.display = 'block';
      
      // Clear container and add canvas
      container.innerHTML = '';
      container.appendChild(this.canvas);

      // Render first page
      await this.renderPage(this.currentPage);

      return {
        content: container.innerHTML,
        metadata: {
          totalPages: this.totalPages,
          chapters: [] // PDFs typically don't have chapters
        }
      };
    } catch (error) {
      console.error('Failed to render PDF:', error);
      throw error;
    }
  }

  /**
   * Render a specific page
   */
  async renderPage(pageNumber: number): Promise<void> {
    if (!this.pdfDocument || !this.canvas || !this.context) {
      throw new Error('PDF not loaded or canvas not initialized');
    }

    try {
      // Get page
      const page = await this.pdfDocument.getPage(pageNumber);
      
      // Set up viewport
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Set canvas dimensions
      this.canvas.width = viewport.width;
      this.canvas.height = viewport.height;
      
      // Render page
      const renderContext = {
        canvasContext: this.context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      this.currentPage = pageNumber;
    } catch (error) {
      console.error('Failed to render page:', error);
      throw error;
    }
  }

  /**
   * Navigate to a specific position
   */
  async navigateToPosition(position: any): Promise<void> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    try {
      if (position.primary?.type === 'coordinates' && position.primary.value) {
        const coords = position.primary.value;
        await this.renderPage(coords.pageNumber);
      } else if (position.fallback.pageNumber) {
        await this.renderPage(position.fallback.pageNumber);
      }
    } catch (error) {
      console.error('Failed to navigate to position:', error);
      throw error;
    }
  }

  /**
   * Navigate to text content
   */
  async navigateToText(textContent: string, pageNumber?: number): Promise<void> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    try {
      // Search for text in the specified page or current page
      const searchPage = pageNumber || this.currentPage;
      const page = await this.pdfDocument.getPage(searchPage);
      
      // Get text content
      const textContentObj = await page.getTextContent();
      const text = textContentObj.items.map((item: any) => item.str).join(' ');
      
      if (text.includes(textContent)) {
        await this.renderPage(searchPage);
      }
    } catch (error) {
      console.error('Failed to navigate to text:', error);
      throw error;
    }
  }

  /**
   * Get current selection (simplified for PDF)
   */
  getCurrentSelection(): PDFSelection | null {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      return null;
    }

    return {
      toString: () => selection.toString(),
      startOffset: selection.anchorOffset || 0,
      endOffset: selection.focusOffset || 0,
      context: {
        before: selection.anchorNode?.parentElement?.textContent?.substring(0, 50) || '',
        after: selection.focusNode?.parentElement?.textContent?.substring(50) || ''
      }
    };
  }

  /**
   * Calculate coordinates for current selection
   */
  calculateCoordinates(selection: PDFSelection): {
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    // For PDF, we'll use a simplified approach
    // In a real implementation, you'd calculate actual coordinates
    return {
      pageNumber: this.currentPage,
      x: 100, // These would be calculated from actual selection
      y: 200,
      width: 300,
      height: 20
    };
  }

  /**
   * Get page number for current selection
   */
  getPageNumber(selection: PDFSelection): number {
    return this.currentPage;
  }

  /**
   * Get current page
   */
  getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * Get total pages
   */
  getTotalPages(): number {
    return this.totalPages;
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    if (this.currentPage < this.totalPages) {
      await this.renderPage(this.currentPage + 1);
    }
  }

  /**
   * Go to previous page
   */
  async previousPage(): Promise<void> {
    if (this.currentPage > 1) {
      await this.renderPage(this.currentPage - 1);
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(pageNumber: number): Promise<void> {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      await this.renderPage(pageNumber);
    }
  }

  /**
   * Set zoom level
   */
  async setZoom(scale: number): Promise<void> {
    if (!this.pdfDocument || !this.canvas || !this.context) {
      throw new Error('PDF not loaded or canvas not initialized');
    }

    try {
      const page = await this.pdfDocument.getPage(this.currentPage);
      const viewport = page.getViewport({ scale });
      
      this.canvas.width = viewport.width;
      this.canvas.height = viewport.height;
      
      const renderContext = {
        canvasContext: this.context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
    } catch (error) {
      console.error('Failed to set zoom:', error);
      throw error;
    }
  }

  /**
   * Search for text in the PDF
   */
  async searchText(query: string): Promise<Array<{
    pageNumber: number;
    text: string;
    x: number;
    y: number;
  }>> {
    if (!this.pdfDocument) {
      throw new Error('PDF not loaded');
    }

    const results: Array<{
      pageNumber: number;
      text: string;
      x: number;
      y: number;
    }> = [];

    try {
      for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
        const page = await this.pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach((item: any) => {
          if (item.str.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              pageNumber: pageNum,
              text: item.str,
              x: item.transform[4] || 0,
              y: item.transform[5] || 0
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to search text:', error);
      throw error;
    }

    return results;
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    if (this.canvas && this.container && this.container.contains(this.canvas)) {
      try {
        this.container.removeChild(this.canvas);
      } catch (error) {
        console.warn('PDFRenderer: Could not remove canvas:', error);
      }
    }
    this.canvas = null;
    this.context = null;
    this.container = null;
    this.pdfDocument = null;
  }
}
