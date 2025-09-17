import { Navigator } from '@readium/navigator';
import { Publication } from '@readium/navigator/dist/types/publication';

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
    }>;
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

export class EPUBRenderer {
  private navigator: Navigator | null = null;
  private publication: Publication | null = null;
  private currentChapter: string = '';
  private chapters: Array<{ id: string; title: string; startPage: number; href?: string; cfi?: string }> = [];
  private container: HTMLElement | null = null;

  constructor() {
    console.log('EPUBRenderer: Constructor called');
  }

  /**
   * Load EPUB from data
   */
  async loadEPUB(data: Uint8Array): Promise<void> {
    try {
      console.log('EPUBRenderer: Loading EPUB data, size:', data.length);

      // Create a blob URL for the EPUB data
      const blob = new Blob([data], { type: 'application/epub+zip' });
      const url = URL.createObjectURL(blob);
      
      console.log('EPUBRenderer: Created blob URL:', url);

      // Initialize the Readium Navigator
      this.navigator = new Navigator({
        publication: {
          manifest: {
            metadata: {
              title: 'Loading...',
              language: 'en'
            },
            links: [],
            readingOrder: [],
            resources: []
          }
        },
        injectables: [],
        services: {
          highlight: {
            createHighlight: this.createHighlight.bind(this),
            updateHighlight: this.updateHighlight.bind(this),
            deleteHighlight: this.deleteHighlight.bind(this)
          }
        }
      });

      // Load the publication
      this.publication = await this.navigator.loadPublication(url);
      console.log('EPUBRenderer: Publication loaded:', this.publication);

      // Extract chapters from the publication
      this.extractChapters();

      console.log('EPUBRenderer: EPUB loaded successfully, chapters:', this.chapters);

    } catch (error) {
      console.error('EPUBRenderer: Failed to load EPUB:', error);
      throw error;
    }
  }

  /**
   * Extract chapters from the publication
   */
  private extractChapters(): void {
    if (!this.publication) return;

    try {
      const readingOrder = this.publication.manifest.readingOrder || [];
      const toc = this.publication.manifest.toc || [];

      if (toc.length > 0) {
        // Use table of contents if available
        this.chapters = toc.map((item, index) => ({
          id: item.href || `chapter-${index}`,
          title: item.title || `Chapter ${index + 1}`,
          startPage: index + 1,
          href: item.href,
          cfi: item.cfi
        }));
      } else if (readingOrder.length > 0) {
        // Fallback to reading order
        this.chapters = readingOrder.map((item, index) => ({
          id: item.href || `chapter-${index}`,
          title: item.title || `Chapter ${index + 1}`,
          startPage: index + 1,
          href: item.href,
          cfi: item.cfi
        }));
      } else {
        // Create default chapter
        this.chapters = [{
          id: 'chapter-1',
          title: 'Chapter 1',
          startPage: 1,
          href: undefined,
          cfi: undefined
        }];
      }

      console.log('EPUBRenderer: Extracted chapters:', this.chapters);
    } catch (error) {
      console.warn('EPUBRenderer: Error extracting chapters:', error);
      this.chapters = [{
        id: 'chapter-1',
        title: 'Chapter 1',
        startPage: 1,
        href: undefined,
        cfi: undefined
      }];
    }
  }

  /**
   * Render the EPUB content
   */
  async render(container: HTMLElement): Promise<ReadiumRenderResult> {
    if (!this.navigator || !this.publication) {
      throw new Error('EPUB not loaded');
    }

    try {
      console.log('EPUBRenderer: Rendering to container:', container);
      this.container = container;

      // Render the publication
      await this.navigator.render(container, {
        theme: {
          name: 'default',
          colors: {
            background: '#ffffff',
            text: '#000000',
            link: '#0066cc'
          },
          fonts: {
            size: '16px',
            family: 'Georgia, serif'
          }
        },
        pagination: {
          mode: 'paginated',
          spread: 'none'
        }
      });

      console.log('EPUBRenderer: Rendering completed');

      // Wait for content to be rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      const content = container.innerHTML;
      console.log('EPUBRenderer: Content length:', content.length);

      return {
        content,
        metadata: {
          totalPages: this.chapters.length,
          chapters: this.chapters
        }
      };
    } catch (error) {
      console.error('EPUBRenderer: Failed to render EPUB:', error);
      throw error;
    }
  }

  /**
   * Navigate to a specific chapter
   */
  async navigateToChapter(chapterId: string): Promise<void> {
    if (!this.navigator) {
      throw new Error('EPUB not rendered');
    }

    try {
      console.log('EPUBRenderer: Navigating to chapter:', chapterId);
      
      const chapter = this.chapters.find(ch => ch.id === chapterId);
      if (!chapter) {
        throw new Error(`Chapter ${chapterId} not found`);
      }

      // Navigate using Readium's navigation system
      if (chapter.href) {
        await this.navigator.goToHref(chapter.href);
      } else if (chapter.cfi) {
        await this.navigator.goToCfi(chapter.cfi);
      } else {
        // Fallback to index-based navigation
        const chapterIndex = this.chapters.findIndex(ch => ch.id === chapterId);
        if (chapterIndex >= 0) {
          await this.navigator.goToIndex(chapterIndex);
        }
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
    if (!this.navigator) {
      throw new Error('EPUB not rendered');
    }

    try {
      await this.navigator.nextPage();
    } catch (error) {
      console.error('EPUBRenderer: Failed to go to next page:', error);
      throw error;
    }
  }

  /**
   * Navigate to previous page
   */
  async previousPage(): Promise<void> {
    if (!this.navigator) {
      throw new Error('EPUB not rendered');
    }

    try {
      await this.navigator.previousPage();
    } catch (error) {
      console.error('EPUBRenderer: Failed to go to previous page:', error);
      throw error;
    }
  }

  /**
   * Get current selection
   */
  getCurrentSelection(): ReadiumSelection | null {
    if (!this.navigator) {
      return null;
    }

    try {
      const selection = this.navigator.getSelection();
      if (!selection) {
        return null;
      }

      return {
        toString: () => selection.toString(),
        startOffset: selection.startOffset || 0,
        endOffset: selection.endOffset || 0,
        context: {
          before: selection.contextBefore || '',
          after: selection.contextAfter || ''
        }
      };
    } catch (error) {
      console.error('EPUBRenderer: Failed to get selection:', error);
      return null;
    }
  }

  /**
   * Set theme
   */
  async setTheme(theme: string): Promise<void> {
    if (!this.navigator) {
      throw new Error('EPUB not rendered');
    }

    try {
      await this.navigator.setTheme(theme);
    } catch (error) {
      console.error('EPUBRenderer: Failed to set theme:', error);
      throw error;
    }
  }

  /**
   * Set font size
   */
  async setFontSize(size: string): Promise<void> {
    if (!this.navigator) {
      throw new Error('EPUB not rendered');
    }

    try {
      await this.navigator.setFontSize(size);
    } catch (error) {
      console.error('EPUBRenderer: Failed to set font size:', error);
      throw error;
    }
  }

  /**
   * Set font family
   */
  async setFontFamily(family: string): Promise<void> {
    if (!this.navigator) {
      throw new Error('EPUB not rendered');
    }

    try {
      await this.navigator.setFontFamily(family);
    } catch (error) {
      console.error('EPUBRenderer: Failed to set font family:', error);
      throw error;
    }
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
   * Highlight management methods
   */
  private createHighlight(selection: any): Promise<any> {
    console.log('EPUBRenderer: Creating highlight:', selection);
    // Implement highlight creation logic
    return Promise.resolve({ id: 'highlight-' + Date.now() });
  }

  private updateHighlight(highlightId: string, updates: any): Promise<any> {
    console.log('EPUBRenderer: Updating highlight:', highlightId, updates);
    // Implement highlight update logic
    return Promise.resolve({ id: highlightId, ...updates });
  }

  private deleteHighlight(highlightId: string): Promise<void> {
    console.log('EPUBRenderer: Deleting highlight:', highlightId);
    // Implement highlight deletion logic
    return Promise.resolve();
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    if (this.navigator) {
      this.navigator.destroy();
      this.navigator = null;
    }
    if (this.publication) {
      this.publication = null;
    }
    if (this.container) {
      this.container = null;
    }
  }
}
