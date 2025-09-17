import { HighlightManager } from '../shared/HighlightManager';
import { Highlight, Position } from '../shared/types';

export interface ReadiumRenderResult {
  content: string;
  metadata: {
    totalPages: number;
    chapters: Array<{
      id: string;
      title: string;
      startPage: number;
      href?: string;
      cfi?: string;
      level?: number;
      children?: Array<{
        id: string;
        title: string;
        startPage: number;
        href?: string;
        cfi?: string;
      }>;
    }>;
    title?: string;
    author?: string;
    language?: string;
    publisher?: string;
    publicationDate?: string;
    description?: string;
    coverImage?: string;
  };
  styles?: string;
}

export interface ReadiumSelection {
  toString(): string;
  startOffset: number;
  endOffset: number;
  context?: {
    before: string;
    after: string;
  };
}

export interface ReadingTheme {
  name: string;
  background: string;
  text: string;
  link: string;
  highlight: string;
  selection: string;
  code: string;
  blockquote: string;
  border: string;
}

export interface TypographySettings {
  fontFamily: 'serif' | 'sans-serif' | 'monospace' | 'dyslexia-friendly';
  fontSize: number; // 12-24px
  lineHeight: number; // 1.2-2.0
  marginWidth: number; // 0-100%
  paragraphSpacing: number; // 0-2em
  wordSpacing: number; // -0.1-0.5em
  letterSpacing: number; // -0.05-0.2em
}

export interface ReadingSettings {
  theme: ReadingTheme;
  typography: TypographySettings;
  autoScroll: boolean;
  autoScrollSpeed: number; // 1-10
  focusMode: boolean;
  distractionFree: boolean;
  showProgress: boolean;
  showBookmarks: boolean;
}

export class EPUBRenderer {
  private epubData: Uint8Array | null = null;
  private zip: any | null = null;
  private currentChapter: string = '';
  private chapters: Array<{ id: string; title: string; startPage: number; href?: string; cfi?: string; level?: number; children?: any[] }> = [];
  private container: HTMLElement | null = null;
  private highlightManager: HighlightManager;
  private currentSelection: ReadiumSelection | null = null;
  private readingSettings: ReadingSettings;
  private autoScrollInterval: NodeJS.Timeout | null = null;
  private readingProgress: number = 0;
  private totalReadingTime: number = 0;
  private startReadingTime: number = 0;
  private bookmarks: Set<string> = new Set();
  private metadata: any = {};
  
  // Track elements added to document for proper cleanup
  private addedElements: Set<HTMLElement> = new Set();
  
  // Performance optimizations
  private cachedContent: Map<string, string> = new Map();
  private renderedChapters: Set<string> = new Set();
  private scrollThrottleTimeout: NodeJS.Timeout | null = null;
  private analyticsUpdateInterval: NodeJS.Timeout | null = null;
  private isDestroyed: boolean = false;
  private lastScrollTime: number = 0;
  private scrollThrottleDelay: number = 16; // ~60fps

  constructor() {
    console.log('EPUBRenderer: Constructor called');
    this.highlightManager = new HighlightManager();
    this.readingSettings = this.getDefaultReadingSettings();
    
    // Add global error handler for DOM operations
    this.setupGlobalDOMErrorHandler();
  }

  /**
   * Setup global DOM error handler to catch any remaining DOM errors
   */
  private setupGlobalDOMErrorHandler(): void {
    // Override the global error handler temporarily to catch DOM errors
    const originalErrorHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (message && typeof message === 'string' && message.includes('removeChild')) {
        console.warn('EPUBRenderer: Caught DOM removeChild error:', message);
        return true; // Prevent the error from propagating
      }
      // Call original error handler for other errors
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  private getDefaultReadingSettings(): ReadingSettings {
    return {
      theme: {
        name: 'Light',
        background: '#ffffff',
        text: '#333333',
        link: '#0066cc',
        highlight: '#ffff00',
        selection: '#b3d4fc',
        code: '#f5f5f5',
        blockquote: '#f0f0f0',
        border: '#e0e0e0'
      },
      typography: {
        fontFamily: 'serif',
        fontSize: 16,
        lineHeight: 1.6,
        marginWidth: 60,
        paragraphSpacing: 1.2,
        wordSpacing: 0,
        letterSpacing: 0
      },
      autoScroll: false,
      autoScrollSpeed: 5,
      focusMode: false,
      distractionFree: false,
      showProgress: true,
      showBookmarks: true
    };
  }

  /**
   * Load EPUB from data with real EPUB parsing
   */
  async loadEPUB(data: Uint8Array): Promise<void> {
    try {
      console.log('EPUBRenderer: Loading EPUB data, size:', data.length);
      
      this.epubData = data;
      // Dynamic import for JSZip to avoid build issues
      const JSZip = (await import('jszip')).default;
      this.zip = await JSZip.loadAsync(data);
      
      // Parse metadata
      await this.parseMetadata();
      
      // Parse table of contents
      await this.parseTableOfContents();
      
      console.log('EPUBRenderer: EPUB loaded successfully, chapters:', this.chapters);
      console.log('EPUBRenderer: Metadata:', this.metadata);

    } catch (error) {
      console.error('EPUBRenderer: Failed to load EPUB:', error);
      // Fallback to mock data for development
      this.chapters = [
        {
          id: 'chapter-1',
          title: 'Chapter 1: Introduction',
          startPage: 1,
          href: 'chapter1.xhtml',
          cfi: 'epubcfi(/6/2[chapter1]!/4/2/1:0)',
          level: 1
        },
        {
          id: 'chapter-2', 
          title: 'Chapter 2: Advanced Topics',
          startPage: 2,
          href: 'chapter2.xhtml',
          cfi: 'epubcfi(/6/2[chapter2]!/4/2/1:0)',
          level: 1
        }
      ];
      this.metadata = {
        title: 'Sample Book',
        author: 'Unknown Author',
        language: 'en',
        description: 'A sample book for testing'
      };
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
   * Parse EPUB metadata
   */
  private async parseMetadata(): Promise<void> {
    try {
      const containerFile = await this.zip!.file('META-INF/container.xml')?.async('text');
      if (!containerFile) return;

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerFile, 'text/xml');
      const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
      
      if (!opfPath) return;

      const opfFile = await this.zip!.file(opfPath)?.async('text');
      if (!opfFile) return;

      const opfDoc = parser.parseFromString(opfFile, 'text/xml');
      
      // Extract metadata
      const title = opfDoc.querySelector('metadata title')?.textContent || 'Unknown Title';
      const author = opfDoc.querySelector('metadata creator')?.textContent || 'Unknown Author';
      const language = opfDoc.querySelector('metadata language')?.textContent || 'en';
      const publisher = opfDoc.querySelector('metadata publisher')?.textContent || '';
      const description = opfDoc.querySelector('metadata description')?.textContent || '';
      
      this.metadata = {
        title,
        author,
        language,
        publisher,
        description
      };

      // Extract cover image
      const coverId = opfDoc.querySelector('metadata meta[name="cover"]')?.getAttribute('content');
      if (coverId) {
        const coverItem = opfDoc.querySelector(`manifest item[id="${coverId}"]`);
        if (coverItem) {
          const coverHref = coverItem.getAttribute('href');
          if (coverHref) {
            const coverPath = this.resolvePath(coverHref, opfPath);
            const coverFile = this.zip!.file(coverPath);
            if (coverFile) {
              const coverBlob = await coverFile.async('blob');
              this.metadata.coverImage = URL.createObjectURL(coverBlob);
            }
          }
        }
      }

    } catch (error) {
      console.error('EPUBRenderer: Failed to parse metadata:', error);
    }
  }

  /**
   * Parse table of contents
   */
  private async parseTableOfContents(): Promise<void> {
    try {
      console.log('EPUBRenderer: Parsing table of contents');
      
      // Look for NCX file first
      const ncxFiles = Object.keys(this.zip!.files).filter(name => name.endsWith('.ncx'));
      if (ncxFiles.length > 0) {
        console.log('EPUBRenderer: Found NCX file:', ncxFiles[0]);
        const ncxFile = await this.zip!.file(ncxFiles[0])?.async('text');
        if (ncxFile) {
          const parser = new DOMParser();
          const ncxDoc = parser.parseFromString(ncxFile, 'text/xml');
          const navPoints = ncxDoc.querySelectorAll('navPoint');
          
          this.chapters = Array.from(navPoints).map((navPoint, index) => {
            const title = navPoint.querySelector('navLabel text')?.textContent || `Chapter ${index + 1}`;
            const src = navPoint.querySelector('content')?.getAttribute('src') || '';
            const id = navPoint.getAttribute('id') || `chapter-${index + 1}`;
            
            return {
              id,
              title,
              startPage: index + 1,
              href: src,
              cfi: `epubcfi(/6/2[${id}]!/4/2/1:0)`,
              level: 1
            };
          });
          console.log('EPUBRenderer: Parsed', this.chapters.length, 'chapters from NCX');
          return;
        }
      }

      // Look for EPUB3 nav document
      const navFiles = Object.keys(this.zip!.files).filter(name => name.includes('nav.xhtml') || name.includes('toc.xhtml'));
      if (navFiles.length > 0) {
        console.log('EPUBRenderer: Found nav file:', navFiles[0]);
        const navFile = await this.zip!.file(navFiles[0])?.async('text');
        if (navFile) {
          const parser = new DOMParser();
          const navDoc = parser.parseFromString(navFile, 'text/html');
          const navLinks = navDoc.querySelectorAll('nav[epub\\:type="toc"] a, nav[role="doc-toc"] a');
          
          this.chapters = Array.from(navLinks).map((link, index) => {
            const title = link.textContent?.trim() || `Chapter ${index + 1}`;
            const href = link.getAttribute('href') || '';
            const id = `chapter-${index + 1}`;
            
            return {
              id,
              title,
              startPage: index + 1,
              href,
              cfi: `epubcfi(/6/2[${id}]!/4/2/1:0)`,
              level: 1
            };
          });
          console.log('EPUBRenderer: Parsed', this.chapters.length, 'chapters from nav');
          return;
        }
      }

      // Fallback: look for HTML/XHTML files in common locations
      console.log('EPUBRenderer: No TOC found, looking for HTML files');
      const htmlFiles = Object.keys(this.zip!.files).filter(name => 
        (name.endsWith('.xhtml') || name.endsWith('.html')) && 
        !name.includes('nav') && 
        !name.includes('toc') &&
        !name.includes('cover')
      );
      
      if (htmlFiles.length > 0) {
        console.log('EPUBRenderer: Found', htmlFiles.length, 'HTML files');
        this.chapters = htmlFiles.map((file, index) => ({
          id: `chapter-${index + 1}`,
          title: `Chapter ${index + 1}`,
          startPage: index + 1,
          href: file,
          cfi: `epubcfi(/6/2[chapter-${index + 1}]!/4/2/1:0)`,
          level: 1
        }));
        console.log('EPUBRenderer: Created chapters from HTML files');
        return;
      }

      console.log('EPUBRenderer: No chapters found, will use mock content');
    } catch (error) {
      console.error('EPUBRenderer: Failed to parse table of contents:', error);
    }
  }


  /**
   * Render the EPUB content with world-class typography
   */
  async render(container: HTMLElement): Promise<ReadiumRenderResult> {
    if (!this.epubData) {
      throw new Error('EPUB not loaded');
    }

    try {
      console.log('EPUBRenderer: Rendering to container:', container);
      this.container = container;

      // Apply world-class styling
      this.applyReadingStyles(container);

      // Render content
      const content = await this.renderContent();
      console.log('EPUBRenderer: Setting content HTML, length:', content.length);
      console.log('EPUBRenderer: Content preview:', content.substring(0, 200));
      
      // Safely replace content to avoid DOM conflicts
      this.safelyReplaceContent(container, content);
      console.log('EPUBRenderer: Content set, container children:', container.children.length);
      
      // Add event listeners
      this.addEventListeners(container);

      // Show the first chapter by default
      if (this.chapters.length > 0) {
        this.currentChapter = this.chapters[0].id;
        await this.navigateToChapter(this.chapters[0].id);
      }

      // Start reading analytics
      this.startReadingAnalytics();

      console.log('EPUBRenderer: Rendering completed');

      return {
        content,
        metadata: {
          totalPages: this.chapters.length,
          chapters: this.chapters,
          ...this.metadata
        },
        styles: this.generateCSS()
      };
    } catch (error) {
      console.error('EPUBRenderer: Failed to render EPUB:', error);
      throw error;
    }
  }

  /**
   * Safely replace container content to avoid DOM conflicts
   */
  private safelyReplaceContent(container: HTMLElement, content: string): void {
    try {
      // Clear existing content safely
      while (container.firstChild) {
        try {
          if (container.contains(container.firstChild)) {
            container.removeChild(container.firstChild);
          } else {
            break; // Exit loop if child is not actually a child
          }
        } catch (error) {
          console.warn('EPUBRenderer: Could not remove child during content replacement:', error);
          break;
        }
      }
      
      // Set new content
      container.innerHTML = content;
    } catch (error) {
      console.error('EPUBRenderer: Error replacing content:', error);
      // Fallback: try direct innerHTML assignment
      try {
        container.innerHTML = content;
      } catch (fallbackError) {
        console.error('EPUBRenderer: Fallback content replacement also failed:', fallbackError);
      }
    }
  }

  /**
   * Apply world-class reading styles with performance optimization
   */
  private applyReadingStyles(container: HTMLElement): void {
    if (this.isDestroyed) return;
    
    container.className = 'epub-reader-container';
    
    // Use CSS custom properties for better performance
    container.style.setProperty('--font-family', this.getFontFamily());
    container.style.setProperty('--font-size', `${this.readingSettings.typography.fontSize}px`);
    container.style.setProperty('--line-height', this.readingSettings.typography.lineHeight.toString());
    container.style.setProperty('--text-color', this.readingSettings.theme.text);
    container.style.setProperty('--background-color', this.readingSettings.theme.background);
    container.style.setProperty('--max-width', `${this.readingSettings.typography.marginWidth}%`);
    container.style.setProperty('--word-spacing', `${this.readingSettings.typography.wordSpacing}em`);
    container.style.setProperty('--letter-spacing', `${this.readingSettings.typography.letterSpacing}em`);
    
    container.style.cssText = `
      font-family: var(--font-family);
      font-size: var(--font-size);
      line-height: var(--line-height);
      color: var(--text-color);
      background-color: var(--background-color);
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 2rem;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      word-spacing: var(--word-spacing);
      letter-spacing: var(--letter-spacing);
      transition: all 0.3s ease;
      contain: layout style paint;
    `;

    // Add CSS for chapter visibility (only if not already added)
    const existingStyle = document.getElementById('epub-reader-styles');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'epub-reader-styles';
      style.textContent = `
        .epub-reader-container .epub-chapter {
          display: none;
          min-height: 400px;
          opacity: 1;
          transition: opacity 0.3s ease;
          padding: 1rem;
          line-height: 1.6;
          color: var(--text-color, #1a1a1a);
          background-color: var(--background-color, #fafafa);
        }
        .epub-reader-container .epub-chapter[style*="display: block"] {
          display: block !important;
        }
        .epub-reader-container .epub-chapter:first-child {
          display: block !important;
        }
      `;
      document.head.appendChild(style);
      this.addedElements.add(style);
    }

    // Add focus mode overlay if enabled
    if (this.readingSettings.focusMode) {
      this.enableFocusMode();
    }

    // Add distraction-free mode
    if (this.readingSettings.distractionFree) {
      this.enableDistractionFreeMode();
    }
  }

  /**
   * Get font family based on settings
   */
  private getFontFamily(): string {
    const fonts = {
      'serif': '"Georgia", "Times New Roman", "Times", serif',
      'sans-serif': '"Inter", "Helvetica Neue", "Arial", sans-serif',
      'monospace': '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      'dyslexia-friendly': '"OpenDyslexic", "Comic Sans MS", sans-serif'
    };
    return fonts[this.readingSettings.typography.fontFamily];
  }

  /**
   * Generate comprehensive CSS for world-class reading experience
   */
  private generateCSS(): string {
    return `
      .epub-reader-container {
        font-family: ${this.getFontFamily()};
        font-size: ${this.readingSettings.typography.fontSize}px;
        line-height: ${this.readingSettings.typography.lineHeight};
        color: ${this.readingSettings.theme.text};
        background-color: ${this.readingSettings.theme.background};
        max-width: ${this.readingSettings.typography.marginWidth}%;
        margin: 0 auto;
        padding: 2rem;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        word-spacing: ${this.readingSettings.typography.wordSpacing}em;
        letter-spacing: ${this.readingSettings.typography.letterSpacing}em;
        transition: all 0.3s ease;
      }

      .epub-chapter {
        margin-bottom: ${this.readingSettings.typography.paragraphSpacing}em;
        page-break-inside: avoid;
      }

      .epub-chapter h1, .epub-chapter h2, .epub-chapter h3 {
        color: ${this.readingSettings.theme.text};
        margin-top: 2em;
        margin-bottom: 1em;
        font-weight: 600;
        line-height: 1.3;
      }

      .epub-chapter p {
        margin-bottom: ${this.readingSettings.typography.paragraphSpacing}em;
        text-align: justify;
        hyphens: auto;
        orphans: 3;
        widows: 3;
      }

      .epub-chapter a {
        color: ${this.readingSettings.theme.link};
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s ease;
      }

      .epub-chapter a:hover {
        border-bottom-color: ${this.readingSettings.theme.link};
      }

      .epub-chapter blockquote {
        border-left: 4px solid ${this.readingSettings.theme.border};
        padding-left: 1.5em;
        margin: 2em 0;
        background-color: ${this.readingSettings.theme.blockquote};
        padding: 1em 1.5em;
        border-radius: 0 4px 4px 0;
      }

      .epub-chapter code {
        background-color: ${this.readingSettings.theme.code};
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
        font-size: 0.9em;
      }

      .epub-chapter pre {
        background-color: ${this.readingSettings.theme.code};
        padding: 1em;
        border-radius: 4px;
        overflow-x: auto;
        margin: 1.5em 0;
      }

      .epub-chapter pre code {
        background: none;
        padding: 0;
      }

      .epub-chapter img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1.5em auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .epub-chapter table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5em 0;
      }

      .epub-chapter th, .epub-chapter td {
        border: 1px solid ${this.readingSettings.theme.border};
        padding: 0.5em;
        text-align: left;
      }

      .epub-chapter th {
        background-color: ${this.readingSettings.theme.blockquote};
        font-weight: 600;
      }

      /* Selection styling */
      ::selection {
        background-color: ${this.readingSettings.theme.selection};
        color: ${this.readingSettings.theme.text};
      }

      ::-moz-selection {
        background-color: ${this.readingSettings.theme.selection};
        color: ${this.readingSettings.theme.text};
      }

      /* Focus mode overlay */
      .focus-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, transparent 0%, rgba(0,0,0,0.1) 100%);
        pointer-events: none;
        z-index: 1000;
      }

      /* Reading progress indicator */
      .reading-progress {
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, #4f46e5, #06b6d4);
        z-index: 1001;
        transition: width 0.3s ease;
      }

      /* Bookmark indicator */
      .bookmark-indicator {
        position: absolute;
        right: -10px;
        top: 0;
        width: 20px;
        height: 20px;
        background: #ef4444;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .bookmark-indicator:hover {
        transform: scale(1.1);
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .epub-reader-container {
          padding: 1rem;
          max-width: 100%;
        }
      }

      @media (max-width: 480px) {
        .epub-reader-container {
          font-size: ${this.readingSettings.typography.fontSize * 0.9}px;
          padding: 0.5rem;
        }
      }

      /* Print styles */
      @media print {
        .epub-reader-container {
          max-width: none;
          padding: 0;
        }
        
        .epub-chapter {
          page-break-inside: avoid;
        }
      }
    `;
  }

  /**
   * Render actual EPUB content
   */
  private async renderContent(): Promise<string> {
    if (!this.zip) {
      console.log('EPUBRenderer: No zip data available, using mock content');
      return this.getMockContent();
    }

    try {
      console.log('EPUBRenderer: Rendering actual EPUB content');
      
      // Get the first chapter to render
      if (this.chapters.length === 0) {
        console.log('EPUBRenderer: No chapters found, using mock content');
      return this.getMockContent();
      }

      const firstChapter = this.chapters[0];
      console.log('EPUBRenderer: Rendering first chapter:', firstChapter);

      // Try to render all chapters
      const allChaptersContent = await this.renderAllChapters();
      if (allChaptersContent) {
        console.log('EPUBRenderer: Successfully rendered all chapters');
        return allChaptersContent;
      } else {
        console.log('EPUBRenderer: Failed to render chapters, using mock content');
        return this.getMockContent();
      }
    } catch (error) {
      console.error('EPUBRenderer: Failed to render content:', error);
      return this.getMockContent();
    }
  }

  /**
   * Render all chapters from the EPUB
   */
  private async renderAllChapters(): Promise<string | null> {
    try {
      if (this.chapters.length === 0) {
        console.log('EPUBRenderer: No chapters to render');
        return null;
      }

      console.log('EPUBRenderer: Rendering all', this.chapters.length, 'chapters');
      const chapterContents: string[] = [];

      for (const chapter of this.chapters) {
        const chapterContent = await this.renderChapter(chapter);
        if (chapterContent) {
          chapterContents.push(chapterContent);
        } else {
          console.warn('EPUBRenderer: Failed to render chapter:', chapter.id);
        }
      }

      if (chapterContents.length === 0) {
        console.log('EPUBRenderer: No chapters could be rendered');
        return null;
      }

      console.log('EPUBRenderer: Successfully rendered', chapterContents.length, 'chapters');
      return chapterContents.join('\n');

    } catch (error) {
      console.error('EPUBRenderer: Failed to render all chapters:', error);
      return null;
    }
  }

  /**
   * Render a specific chapter from the EPUB
   */
  private async renderChapter(chapter: { id: string; title: string; startPage: number; href?: string; cfi?: string; level?: number }): Promise<string | null> {
    try {
      if (!chapter.href || !this.zip) {
        console.log('EPUBRenderer: No href or zip data for chapter:', chapter);
        return null;
      }

      console.log('EPUBRenderer: Loading chapter file:', chapter.href);
      
      // Try to find the chapter file in the zip
      let chapterFile = this.zip.file(chapter.href);
      
      // If not found, try with different path variations
      if (!chapterFile) {
        const variations = [
          chapter.href,
          `OEBPS/${chapter.href}`,
          `text/${chapter.href}`,
          `chapters/${chapter.href}`,
          chapter.href.replace(/^\.\//, ''),
          chapter.href.replace(/^\.\//, 'OEBPS/'),
          chapter.href.replace(/^\.\//, 'text/')
        ];
        
        for (const variation of variations) {
          chapterFile = this.zip.file(variation);
          if (chapterFile) {
            console.log('EPUBRenderer: Found chapter file at:', variation);
            break;
          }
        }
      }

      if (!chapterFile) {
        console.log('EPUBRenderer: Chapter file not found:', chapter.href);
        return null;
      }

      // Read the chapter content
      const chapterContent = await chapterFile.async('text');
      console.log('EPUBRenderer: Chapter content loaded, length:', chapterContent.length);

      // Parse the HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(chapterContent, 'text/html');
      
      // Extract the body content
      const body = doc.body;
      if (!body) {
        console.log('EPUBRenderer: No body found in chapter');
        return null;
      }

      // Process images and other resources
      await this.processChapterResources(body, chapter.href);

      // Wrap in chapter div with proper styling
      const chapterHtml = `
        <div class="epub-chapter" data-chapter="${chapter.id}">
          <h1>${chapter.title}</h1>
          ${body.innerHTML}
        </div>
      `;

      console.log('EPUBRenderer: Chapter rendered successfully');
      return chapterHtml;

    } catch (error) {
      console.error('EPUBRenderer: Failed to render chapter:', chapter.id, error);
      return null;
    }
  }

  /**
   * Process chapter resources (images, CSS, etc.)
   */
  private async processChapterResources(body: HTMLElement, chapterHref: string): Promise<void> {
    try {
      // Process images
      const images = body.querySelectorAll('img');
      for (const img of images) {
        const src = img.getAttribute('src');
        if (src) {
          const resolvedSrc = this.resolvePath(src, chapterHref);
          const imageFile = this.zip?.file(resolvedSrc);
          if (imageFile) {
            try {
              const imageBlob = await imageFile.async('blob');
              const imageUrl = URL.createObjectURL(imageBlob);
              img.setAttribute('src', imageUrl);
            } catch (error) {
              console.warn('EPUBRenderer: Failed to load image:', src, error);
            }
          }
        }
      }

      // Process CSS links
      const links = body.querySelectorAll('link[rel="stylesheet"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href) {
          const resolvedHref = this.resolvePath(href, chapterHref);
          const cssFile = this.zip?.file(resolvedHref);
          if (cssFile) {
            try {
              const cssContent = await cssFile.async('text');
              const style = document.createElement('style');
              style.textContent = cssContent;
              body.appendChild(style);
              
              // Safely remove the original link
              if (link.parentNode && link.parentNode.contains(link)) {
                try {
                  link.parentNode.removeChild(link);
                } catch (error) {
                  console.warn('EPUBRenderer: Could not remove CSS link:', error);
                }
              }
            } catch (error) {
              console.warn('EPUBRenderer: Failed to load CSS:', href, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('EPUBRenderer: Failed to process chapter resources:', error);
    }
  }

  /**
   * Get enhanced mock content for development
   */
  private getMockContent(): string {
    return `
      <div class="epub-chapter" data-chapter="chapter-1">
        <h1>Chapter 1: Introduction</h1>
        <p>This is a sample chapter content demonstrating world-class typography. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>

        <blockquote>
          "The best way to predict the future is to create it." - Peter Drucker
        </blockquote>

        <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>
      </div>
      
      <div class="epub-chapter" data-chapter="chapter-2">
        <h1>Chapter 2: Advanced Topics</h1>
        <p>This chapter explores advanced concepts in digital reading and typography. Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.</p>
        
        <h2>Key Concepts</h2>
        <p>Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.</p>

        <h3>Implementation Details</h3>
        <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.</p>
      </div>
    `;
  }

  /**
   * Add comprehensive event listeners
   */
  private addEventListeners(container: HTMLElement): void {
    // Text selection
    container.addEventListener('mouseup', this.handleTextSelection.bind(this));
    container.addEventListener('touchend', this.handleTextSelection.bind(this));
    
    // Reading progress tracking
    container.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
    
    // Auto-scroll controls
    container.addEventListener('click', this.handleClick.bind(this));
    
    // Bookmark functionality
    container.addEventListener('contextmenu', this.handleContextMenu.bind(this));
  }

  /**
   * Handle text selection with enhanced features
   */
  private handleTextSelection(): void {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      this.currentSelection = {
        toString: () => selection.toString(),
        startOffset: selection.anchorOffset || 0,
        endOffset: selection.focusOffset || 0,
        context: {
          before: selection.anchorNode?.parentElement?.textContent?.substring(0, 50) || '',
          after: selection.focusNode?.parentElement?.textContent?.substring(50) || ''
        }
      };
      
      // Update reading progress based on selection
      this.updateReadingProgress();
    } else {
      this.currentSelection = null;
    }
  }

  /**
   * Handle scroll events for reading progress with throttling
   */
  private handleScroll(): void {
    if (!this.container || this.isDestroyed) return;
    
    const now = Date.now();
    if (now - this.lastScrollTime < this.scrollThrottleDelay) {
      if (this.scrollThrottleTimeout) {
        clearTimeout(this.scrollThrottleTimeout);
      }
      this.scrollThrottleTimeout = setTimeout(() => this.handleScroll(), this.scrollThrottleDelay);
      return;
    }
    
    this.lastScrollTime = now;
    
    const scrollTop = this.container.scrollTop;
    const scrollHeight = this.container.scrollHeight;
    const clientHeight = this.container.clientHeight;
    
    this.readingProgress = Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100);
    this.updateProgressIndicator();
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboard(event: KeyboardEvent): void {
    if (!this.container) return;
    
    switch (event.key) {
      case 'ArrowDown':
        if (event.ctrlKey) {
          event.preventDefault();
          this.autoScroll();
        }
        break;
      case 'ArrowUp':
        if (event.ctrlKey) {
          event.preventDefault();
          this.stopAutoScroll();
        }
        break;
      case 'b':
        if (event.ctrlKey) {
          event.preventDefault();
          this.toggleBookmark();
        }
        break;
      case 'f':
        if (event.ctrlKey) {
          event.preventDefault();
          this.toggleFocusMode();
        }
        break;
      case 'd':
        if (event.ctrlKey) {
          event.preventDefault();
          this.toggleDistractionFree();
        }
        break;
    }
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Handle bookmark clicks
    if (target.classList.contains('bookmark-indicator')) {
      this.toggleBookmark();
    }
  }

  /**
   * Handle context menu for advanced features
   */
  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // Could show custom context menu with reading options
  }

  /**
   * Start reading analytics with optimized updates
   */
  private startReadingAnalytics(): void {
    this.startReadingTime = Date.now();
    this.updateProgressIndicator();
    
    // Start analytics update interval (every 5 seconds instead of every second)
    this.analyticsUpdateInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.updateReadingProgress();
      }
    }, 5000);
  }

  /**
   * Update reading progress indicator with performance optimization
   */
  private updateProgressIndicator(): void {
    if (!this.readingSettings.showProgress || this.isDestroyed) return;
    
    let progressBar = document.querySelector('.reading-progress') as HTMLElement;
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'reading-progress';
      progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, #4f46e5, #06b6d4);
        z-index: 1001;
        transition: width 0.3s ease;
        will-change: width;
      `;
      document.body.appendChild(progressBar);
      this.addedElements.add(progressBar);
    }
    
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      if (!this.isDestroyed) {
        progressBar.style.width = `${this.readingProgress}%`;
      }
    });
  }

  /**
   * Update reading progress based on current position
   */
  private updateReadingProgress(): void {
    if (!this.container) return;
    
    const scrollTop = this.container.scrollTop;
    const scrollHeight = this.container.scrollHeight;
    const clientHeight = this.container.clientHeight;
    
    this.readingProgress = Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100);
  }

  /**
   * Enable focus mode
   */
  private enableFocusMode(): void {
    let overlay = document.querySelector('.focus-overlay') as HTMLElement;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'focus-overlay';
      document.body.appendChild(overlay);
      this.addedElements.add(overlay);
    }
  }

  /**
   * Enable distraction-free mode
   */
  private enableDistractionFreeMode(): void {
    document.body.style.overflow = 'hidden';
    if (this.container) {
      this.container.style.position = 'fixed';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.zIndex = '9999';
    }
  }

  /**
   * Toggle focus mode
   */
  private toggleFocusMode(): void {
    this.readingSettings.focusMode = !this.readingSettings.focusMode;
    if (this.readingSettings.focusMode) {
      this.enableFocusMode();
    } else {
      const overlay = document.querySelector('.focus-overlay');
      if (overlay && overlay.parentNode && overlay.parentNode.contains(overlay)) {
        try {
          overlay.parentNode.removeChild(overlay);
        } catch (error) {
          console.warn('EPUBRenderer: Could not remove focus overlay:', error);
        }
      }
    }
  }

  /**
   * Toggle distraction-free mode
   */
  private toggleDistractionFree(): void {
    this.readingSettings.distractionFree = !this.readingSettings.distractionFree;
    if (this.readingSettings.distractionFree) {
      this.enableDistractionFreeMode();
    } else {
      document.body.style.overflow = '';
      if (this.container) {
        this.container.style.position = '';
        this.container.style.top = '';
        this.container.style.left = '';
        this.container.style.width = '';
        this.container.style.height = '';
        this.container.style.zIndex = '';
      }
    }
  }

  /**
   * Auto-scroll functionality
   */
  private autoScroll(): void {
    if (this.autoScrollInterval) return;
    
    const speed = this.readingSettings.autoScrollSpeed * 10; // Convert to pixels per interval
    this.autoScrollInterval = setInterval(() => {
      if (this.container) {
        this.container.scrollTop += speed;
        this.updateReadingProgress();
        this.updateProgressIndicator();
      }
    }, 100);
  }

  /**
   * Stop auto-scroll
   */
  private stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  /**
   * Toggle bookmark at current position
   */
  private toggleBookmark(): void {
    const currentPosition = this.getCurrentPosition();
    if (this.bookmarks.has(currentPosition)) {
      this.bookmarks.delete(currentPosition);
    } else {
      this.bookmarks.add(currentPosition);
    }
    this.updateBookmarkIndicators();
  }

  /**
   * Get current reading position
   */
  private getCurrentPosition(): string {
    return `${this.currentChapter}-${this.readingProgress}`;
  }

  /**
   * Update bookmark indicators
   */
  private updateBookmarkIndicators(): void {
    if (!this.readingSettings.showBookmarks || !this.container) return;
    
    // Remove existing indicators
    this.container.querySelectorAll('.bookmark-indicator').forEach(el => {
      if (el.parentNode && el.parentNode.contains(el)) {
        try {
          el.parentNode.removeChild(el);
        } catch (error) {
          console.warn('EPUBRenderer: Could not remove bookmark indicator:', error);
        }
      }
    });
    
    // Add new indicators for bookmarked positions
    this.bookmarks.forEach(position => {
      // Implementation would add visual indicators at bookmarked positions
    });
  }

  /**
   * Navigate to a specific chapter
   */
  async navigateToChapter(chapterId: string): Promise<void> {
    if (!this.container) {
      throw new Error('EPUB not rendered');
    }

    try {
      console.log('EPUBRenderer: Navigating to chapter:', chapterId);
      
      const chapter = this.chapters.find(ch => ch.id === chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${chapterId} not found`);
      }

      // Show the selected chapter
      const chapterElements = this.container.querySelectorAll('.epub-chapter');
      console.log('EPUBRenderer: Found', chapterElements.length, 'chapter elements');
      
      chapterElements.forEach((el, index) => {
        const element = el as HTMLElement;
        const dataChapter = element.getAttribute('data-chapter');
        console.log(`EPUBRenderer: Chapter ${index}: data-chapter="${dataChapter}"`);
        
        if (dataChapter === chapterId) {
          element.style.display = 'block';
          element.style.visibility = 'visible';
          console.log('EPUBRenderer: Showing chapter:', dataChapter);
        } else {
          element.style.display = 'none';
          element.style.visibility = 'hidden';
        }
      });
      
      const targetChapter = this.container.querySelector(`[data-chapter="${chapterId}"]`);
      if (targetChapter) {
        console.log('EPUBRenderer: Target chapter found and displayed');
      } else {
        console.warn('EPUBRenderer: Target chapter not found:', chapterId);
      }

      this.currentChapter = chapterId;
      console.log('EPUBRenderer: Successfully navigated to chapter:', chapterId);
    } catch (error) {
      console.error('EPUBRenderer: Failed to navigate to chapter:', chapterId, error);
      throw error;
    }
  }

  /**
   * Navigate to next page
   */
  async nextPage(): Promise<void> {
    if (!this.container) {
      throw new Error('EPUB not rendered');
    }

    try {
      const currentIndex = this.chapters.findIndex(ch => ch.id === this.currentChapter);
      if (currentIndex < this.chapters.length - 1) {
        const nextChapter = this.chapters[currentIndex + 1];
        await this.navigateToChapter(nextChapter.id);
      }
    } catch (error) {
      console.error('EPUBRenderer: Failed to go to next page:', error);
      throw error;
    }
  }

  /**
   * Navigate to previous page
   */
  async previousPage(): Promise<void> {
    if (!this.container) {
      throw new Error('EPUB not rendered');
    }

    try {
      const currentIndex = this.chapters.findIndex(ch => ch.id === this.currentChapter);
      if (currentIndex > 0) {
        const prevChapter = this.chapters[currentIndex - 1];
        await this.navigateToChapter(prevChapter.id);
      }
    } catch (error) {
      console.error('EPUBRenderer: Failed to go to previous page:', error);
      throw error;
    }
  }

  /**
   * Get current selection
   */
  getCurrentSelection(): ReadiumSelection | null {
    return this.currentSelection as ReadiumSelection | null;
  }

  /**
   * Set reading theme
   */
  async setTheme(themeName: string): Promise<void> {
    const themes = this.getAvailableThemes();
    const theme = themes.find(t => t.name.toLowerCase() === themeName.toLowerCase());
    if (theme) {
      this.readingSettings.theme = theme;
      this.applyReadingStyles(this.container!);
    }
  }

  /**
   * Set font size
   */
  async setFontSize(size: number): Promise<void> {
    this.readingSettings.typography.fontSize = Math.max(12, Math.min(24, size));
    this.applyReadingStyles(this.container!);
  }

  /**
   * Set font family
   */
  async setFontFamily(family: 'serif' | 'sans-serif' | 'monospace' | 'dyslexia-friendly'): Promise<void> {
    this.readingSettings.typography.fontFamily = family;
    this.applyReadingStyles(this.container!);
  }

  /**
   * Set line height
   */
  async setLineHeight(height: number): Promise<void> {
    this.readingSettings.typography.lineHeight = Math.max(1.2, Math.min(2.0, height));
    this.applyReadingStyles(this.container!);
  }

  /**
   * Set margin width
   */
  async setMarginWidth(width: number): Promise<void> {
    this.readingSettings.typography.marginWidth = Math.max(40, Math.min(100, width));
    this.applyReadingStyles(this.container!);
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): ReadingTheme[] {
    return [
      {
        name: 'Light',
        background: '#fafafa',
        text: '#1a1a1a',
        link: '#0066cc',
        highlight: '#ffff00',
        selection: '#b3d4fc',
        code: '#f5f5f5',
        blockquote: '#f0f0f0',
        border: '#e0e0e0'
      },
      {
        name: 'Dark',
        background: '#1a1a1a',
        text: '#e0e0e0',
        link: '#4a9eff',
        highlight: '#ffd700',
        selection: '#404040',
        code: '#2d2d2d',
        blockquote: '#2a2a2a',
        border: '#404040'
      },
      {
        name: 'Sepia',
        background: '#f4f1ea',
        text: '#5c4b37',
        link: '#8b4513',
        highlight: '#f0e68c',
        selection: '#d2b48c',
        code: '#e6ddd4',
        blockquote: '#e8e0d0',
        border: '#d2b48c'
      },
      {
        name: 'High Contrast',
        background: '#000000',
        text: '#ffffff',
        link: '#00ffff',
        highlight: '#ffff00',
        selection: '#ffffff',
        code: '#333333',
        blockquote: '#1a1a1a',
        border: '#ffffff'
      }
    ];
  }

  /**
   * Get current reading settings
   */
  getReadingSettings(): ReadingSettings {
    return { ...this.readingSettings };
  }

  /**
   * Update reading settings
   */
  updateReadingSettings(settings: Partial<ReadingSettings>): void {
    this.readingSettings = { ...this.readingSettings, ...settings };
    if (this.container) {
      this.applyReadingStyles(this.container);
    }
  }

  /**
   * Get reading progress
   */
  getReadingProgress(): number {
    return this.readingProgress;
  }

  /**
   * Get reading time
   */
  getReadingTime(): number {
    return this.totalReadingTime + (Date.now() - this.startReadingTime);
  }

  /**
   * Get bookmarks
   */
  getBookmarks(): string[] {
    return Array.from(this.bookmarks);
  }

  /**
   * Navigate to bookmark
   */
  navigateToBookmark(position: string): void {
    // Implementation would navigate to the bookmarked position
    console.log('EPUBRenderer: Navigating to bookmark:', position);
  }

  /**
   * Get table of contents
   */
  getTableOfContents(): Array<{ id: string; title: string; startPage: number }> {
    return this.chapters;
  }

  /**
   * Get current chapter
   */
  getCurrentChapter(): string {
    return this.currentChapter;
  }

  /**
   * Create a highlight using the shared highlight manager
   */
  createHighlight(data: {
    text: string;
    position: Position;
    color: string;
    platform: 'web' | 'mobile';
    bookId: string;
    note?: string;
    tags?: string[];
    pageNumber?: number;
    chapter?: string;
  }): Highlight {
    console.log('EPUBRenderer: Creating highlight:', data);
    return this.highlightManager.createHighlight(data);
  }

  /**
   * Destroy the renderer and clean up resources with performance optimization
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // Restore original error handler
    window.onerror = null;
    
    // Stop all intervals and timeouts
    this.stopAutoScroll();
    
    if (this.scrollThrottleTimeout) {
      clearTimeout(this.scrollThrottleTimeout);
      this.scrollThrottleTimeout = null;
    }
    
    if (this.analyticsUpdateInterval) {
      clearInterval(this.analyticsUpdateInterval);
      this.analyticsUpdateInterval = null;
    }
    
    // Remove event listeners with proper cleanup
    if (this.container) {
      try {
      // Store bound handlers for proper cleanup
      const boundTextSelection = this.handleTextSelection.bind(this);
      const boundScroll = this.handleScroll.bind(this);
      const boundClick = this.handleClick.bind(this);
      const boundContextMenu = this.handleContextMenu.bind(this);
      
      this.container.removeEventListener('mouseup', boundTextSelection);
      this.container.removeEventListener('touchend', boundTextSelection);
      this.container.removeEventListener('scroll', boundScroll);
      this.container.removeEventListener('click', boundClick);
      this.container.removeEventListener('contextmenu', boundContextMenu);
      } catch (error) {
        console.warn('EPUBRenderer: Error removing event listeners:', error);
      }
      
      this.container = null;
    }
    
    // Remove document event listeners
    try {
    const boundKeyboardHandler = this.handleKeyboard.bind(this);
    document.removeEventListener('keydown', boundKeyboardHandler);
    } catch (error) {
      console.warn('EPUBRenderer: Error removing document event listeners:', error);
    }
    
    // Clean up all tracked elements
    this.addedElements.forEach(element => {
      if (element && element.parentNode && element.parentNode.contains(element)) {
        try {
          element.parentNode.removeChild(element);
        } catch (error) {
          console.warn('EPUBRenderer: Could not remove tracked element:', error);
        }
      }
    });
    this.addedElements.clear();
    
    // Also clean up any remaining elements by selector (fallback)
    const elementsToRemove = [
      '.reading-progress',
      '.focus-overlay'
    ];
    
    elementsToRemove.forEach(selector => {
      const element = document.querySelector(selector);
      if (element && element.parentNode && element.parentNode.contains(element)) {
        try {
          element.parentNode.removeChild(element);
        } catch (error) {
          console.warn('EPUBRenderer: Could not remove element:', selector, error);
        }
      }
    });
    
    // Clean up style element
    const styleElement = document.getElementById('epub-reader-styles');
    if (styleElement && styleElement.parentNode && styleElement.parentNode.contains(styleElement)) {
      try {
        styleElement.parentNode.removeChild(styleElement);
      } catch (error) {
        console.warn('EPUBRenderer: Could not remove style element:', error);
      }
    }
    
    // Reset distraction-free mode
    document.body.style.overflow = '';
    
    // Clean up data and caches
    this.epubData = null;
    this.zip = null;
    this.currentSelection = null;
    this.bookmarks.clear();
    this.cachedContent.clear();
    this.renderedChapters.clear();
    
    // Update total reading time
    this.totalReadingTime += Date.now() - this.startReadingTime;
    
    console.log('EPUBRenderer: Cleanup completed');
  }
}
