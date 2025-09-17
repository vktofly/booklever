import { IndexedDBService } from '@/lib/storage/indexedDB';

export interface ReadingSession {
  id: string;
  bookId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  pagesRead: number;
  chaptersRead: string[];
  highlightsCreated: number;
  bookmarksCreated: number;
  notesCreated: number;
}

export interface ReadingStats {
  totalReadingTime: number; // in minutes
  totalPagesRead: number;
  totalBooksRead: number;
  averageSessionLength: number; // in minutes
  readingStreak: number; // days
  favoriteGenres: string[];
  readingVelocity: number; // pages per hour
  completionRate: number; // percentage
}

export interface DailyReadingData {
  date: string;
  readingTime: number;
  pagesRead: number;
  booksRead: number;
  highlightsCreated: number;
  bookmarksCreated: number;
}

export class ReadingAnalyticsService {
  private indexedDB: IndexedDBService;
  private currentSession: ReadingSession | null = null;
  private sessionStartTime: Date | null = null;
  private lastPageCount: number = 0;
  private lastChapter: string = '';

  constructor(indexedDB: IndexedDBService) {
    this.indexedDB = indexedDB;
  }

  /**
   * Start a new reading session
   */
  async startReadingSession(bookId: string, userId: string): Promise<void> {
    // End current session if exists
    if (this.currentSession) {
      await this.endReadingSession();
    }

    this.currentSession = {
      id: `${userId}_${bookId}_${Date.now()}`,
      bookId,
      userId,
      startTime: new Date(),
      duration: 0,
      pagesRead: 0,
      chaptersRead: [],
      highlightsCreated: 0,
      bookmarksCreated: 0,
      notesCreated: 0
    };

    this.sessionStartTime = new Date();
    this.lastPageCount = 0;
    this.lastChapter = '';

    console.log('ReadingAnalytics: Started reading session for book:', bookId);
  }

  /**
   * End the current reading session
   */
  async endReadingSession(): Promise<void> {
    if (!this.currentSession || !this.sessionStartTime) return;

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - this.sessionStartTime.getTime()) / (1000 * 60)); // minutes

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;

    // Record analytics
    await this.recordReadingAnalytics(
      this.currentSession.bookId,
      duration,
      this.currentSession.pagesRead
    );

    console.log('ReadingAnalytics: Ended reading session:', {
      bookId: this.currentSession.bookId,
      duration,
      pagesRead: this.currentSession.pagesRead
    });

    this.currentSession = null;
    this.sessionStartTime = null;
  }

  /**
   * Update reading progress
   */
  async updateReadingProgress(
    bookId: string,
    progress: number,
    chapter?: string,
    position?: number
  ): Promise<void> {
    // Save reading progress
    await this.indexedDB.saveReadingProgress(bookId, progress, chapter, position);

    // Update current session
    if (this.currentSession && this.currentSession.bookId === bookId) {
      // Estimate pages read based on progress
      const estimatedPages = Math.floor(progress * 10); // Assuming 10 pages per 10% progress
      const pagesReadThisSession = Math.max(0, estimatedPages - this.lastPageCount);
      
      this.currentSession.pagesRead += pagesReadThisSession;
      this.lastPageCount = estimatedPages;

      // Track chapters
      if (chapter && chapter !== this.lastChapter) {
        this.currentSession.chaptersRead.push(chapter);
        this.lastChapter = chapter;
      }
    }

    // Record analytics
    await this.recordReadingAnalytics(bookId, 1, 1); // 1 minute, 1 page
  }

  /**
   * Record reading analytics
   */
  private async recordReadingAnalytics(
    bookId: string,
    readingTime: number,
    pagesRead: number
  ): Promise<void> {
    try {
      await this.indexedDB.recordReadingAnalytics(bookId, readingTime, pagesRead);
    } catch (error) {
      console.error('ReadingAnalytics: Failed to record analytics:', error);
    }
  }

  /**
   * Track highlight creation
   */
  async trackHighlightCreated(bookId: string): Promise<void> {
    if (this.currentSession && this.currentSession.bookId === bookId) {
      this.currentSession.highlightsCreated++;
    }
  }

  /**
   * Track bookmark creation
   */
  async trackBookmarkCreated(bookId: string): Promise<void> {
    if (this.currentSession && this.currentSession.bookId === bookId) {
      this.currentSession.bookmarksCreated++;
    }
  }

  /**
   * Track note creation
   */
  async trackNoteCreated(bookId: string): Promise<void> {
    if (this.currentSession && this.currentSession.bookId === bookId) {
      this.currentSession.notesCreated++;
    }
  }

  /**
   * Get reading statistics for a user
   */
  async getReadingStats(userId: string, days: number = 30): Promise<ReadingStats> {
    try {
      // Get all analytics data for the user
      const analytics = await this.indexedDB.getReadingAnalytics('', days);
      const userAnalytics = analytics.filter(a => a.userId === userId);

      const stats: ReadingStats = {
        totalReadingTime: 0,
        totalPagesRead: 0,
        totalBooksRead: 0,
        averageSessionLength: 0,
        readingStreak: 0,
        favoriteGenres: [],
        readingVelocity: 0,
        completionRate: 0
      };

      if (userAnalytics.length === 0) return stats;

      // Calculate basic stats
      stats.totalReadingTime = userAnalytics.reduce((sum, a) => sum + a.readingTime, 0);
      stats.totalPagesRead = userAnalytics.reduce((sum, a) => sum + a.pagesRead, 0);
      stats.totalBooksRead = new Set(userAnalytics.map(a => a.bookId)).size;

      // Calculate average session length
      const sessions = userAnalytics.length;
      stats.averageSessionLength = sessions > 0 ? stats.totalReadingTime / sessions : 0;

      // Calculate reading velocity (pages per hour)
      if (stats.totalReadingTime > 0) {
        stats.readingVelocity = (stats.totalPagesRead / stats.totalReadingTime) * 60;
      }

      // Calculate reading streak
      stats.readingStreak = this.calculateReadingStreak(userAnalytics);

      // Calculate completion rate (simplified)
      stats.completionRate = Math.min(100, (stats.totalPagesRead / 1000) * 100); // Assuming 1000 pages = 100% completion

      return stats;
    } catch (error) {
      console.error('ReadingAnalytics: Failed to get reading stats:', error);
      return {
        totalReadingTime: 0,
        totalPagesRead: 0,
        totalBooksRead: 0,
        averageSessionLength: 0,
        readingStreak: 0,
        favoriteGenres: [],
        readingVelocity: 0,
        completionRate: 0
      };
    }
  }

  /**
   * Get daily reading data for charts
   */
  async getDailyReadingData(userId: string, days: number = 30): Promise<DailyReadingData[]> {
    try {
      const analytics = await this.indexedDB.getReadingAnalytics('', days);
      const userAnalytics = analytics.filter(a => a.userId === userId);

      // Group by date
      const dailyData = new Map<string, DailyReadingData>();

      for (const record of userAnalytics) {
        const date = record.date;
        if (!dailyData.has(date)) {
          dailyData.set(date, {
            date,
            readingTime: 0,
            pagesRead: 0,
            booksRead: 0,
            highlightsCreated: 0,
            bookmarksCreated: 0
          });
        }

        const dayData = dailyData.get(date)!;
        dayData.readingTime += record.readingTime;
        dayData.pagesRead += record.pagesRead;
        dayData.booksRead = 1; // Simplified - count unique books per day
      }

      return Array.from(dailyData.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('ReadingAnalytics: Failed to get daily reading data:', error);
      return [];
    }
  }

  /**
   * Calculate reading streak
   */
  private calculateReadingStreak(analytics: any[]): number {
    if (analytics.length === 0) return 0;

    // Sort by date
    const sortedAnalytics = analytics.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday

    // Check backwards for consecutive days
    for (let i = sortedAnalytics.length - 1; i >= 0; i--) {
      const recordDate = new Date(sortedAnalytics[i].date);
      const daysDiff = Math.floor((currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff === 1) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get reading insights and recommendations
   */
  async getReadingInsights(userId: string): Promise<{
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const stats = await this.getReadingStats(userId, 30);
      const insights: string[] = [];
      const recommendations: string[] = [];

      // Generate insights based on stats
      if (stats.readingStreak > 7) {
        insights.push(`Amazing! You've maintained a ${stats.readingStreak}-day reading streak!`);
      } else if (stats.readingStreak > 3) {
        insights.push(`Great job! You're on a ${stats.readingStreak}-day reading streak.`);
      }

      if (stats.readingVelocity > 20) {
        insights.push(`You're reading at ${stats.readingVelocity.toFixed(1)} pages per hour - that's impressive!`);
      }

      if (stats.totalReadingTime > 300) {
        insights.push(`You've spent ${Math.round(stats.totalReadingTime / 60)} hours reading this month!`);
      }

      // Generate recommendations
      if (stats.readingStreak === 0) {
        recommendations.push('Start a reading habit by reading just 10 minutes a day!');
      } else if (stats.readingStreak < 7) {
        recommendations.push('Try to maintain your reading streak by reading a little each day.');
      }

      if (stats.readingVelocity < 10) {
        recommendations.push('Consider finding a quieter reading environment to improve focus.');
      }

      if (stats.totalBooksRead < 2) {
        recommendations.push('Try exploring different genres to diversify your reading experience.');
      }

      return { insights, recommendations };
    } catch (error) {
      console.error('ReadingAnalytics: Failed to get reading insights:', error);
      return { insights: [], recommendations: [] };
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    try {
      await this.indexedDB.cleanupOldAnalytics(daysToKeep);
      console.log('ReadingAnalytics: Cleaned up old analytics data');
    } catch (error) {
      console.error('ReadingAnalytics: Failed to cleanup old data:', error);
    }
  }
}
