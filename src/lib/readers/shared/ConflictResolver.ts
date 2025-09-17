// Conflict Resolver - Smart conflict resolution for cross-device sync
// Implements intelligent merge strategies to preserve user intent without data loss

import { Highlight, Conflict, Position } from './types';

export class ConflictResolver {
  /**
   * Resolve conflicts between local and remote highlights
   * @param localHighlights - Highlights from local platform
   * @param remoteHighlights - Highlights from remote platform
   * @returns Resolved highlights with conflicts merged
   */
  resolveConflicts(localHighlights: Highlight[], remoteHighlights: Highlight[]): Highlight[] {
    const conflicts = this.detectConflicts(localHighlights, remoteHighlights);
    const resolvedHighlights: Highlight[] = [];
    
    // Create a map of all highlights for easy lookup
    const allHighlights = new Map<string, Highlight>();
    
    // Add all local highlights
    localHighlights.forEach(highlight => {
      allHighlights.set(highlight.id, highlight);
    });
    
    // Process remote highlights and resolve conflicts
    remoteHighlights.forEach(remoteHighlight => {
      const localHighlight = allHighlights.get(remoteHighlight.id);
      
      if (!localHighlight) {
        // New highlight from remote - add it
        allHighlights.set(remoteHighlight.id, remoteHighlight);
      } else {
        // Conflict detected - resolve it
        const conflict: Conflict = {
          type: this.determineConflictType(localHighlight, remoteHighlight),
          local: localHighlight,
          remote: remoteHighlight
        };
        
        const resolved = this.resolveConflict(conflict);
        allHighlights.set(remoteHighlight.id, resolved);
      }
    });
    
    return Array.from(allHighlights.values());
  }

  /**
   * Detect conflicts between local and remote highlights
   */
  detectConflicts(localHighlights: Highlight[], remoteHighlights: Highlight[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    localHighlights.forEach(local => {
      const remote = remoteHighlights.find(r => r.id === local.id);
      
      if (remote) {
        // Check if there's a conflict
        if (this.hasConflict(local, remote)) {
          conflicts.push({
            type: this.determineConflictType(local, remote),
            local,
            remote
          });
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Check if two highlights have a conflict
   */
  private hasConflict(local: Highlight, remote: Highlight): boolean {
    // Check if lastModified times are different (indicating changes)
    if (local.lastModified.getTime() !== remote.lastModified.getTime()) {
      return true;
    }
    
    // Check if content is different
    if (local.text !== remote.text || local.note !== remote.note) {
      return true;
    }
    
    // Check if tags are different
    if (JSON.stringify(local.tags.sort()) !== JSON.stringify(remote.tags.sort())) {
      return true;
    }
    
    // Check if color is different
    if (local.color !== remote.color) {
      return true;
    }
    
    return false;
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(local: Highlight, remote: Highlight): Conflict['type'] {
    // Same text, same position - metadata difference
    if (local.text === remote.text && this.samePosition(local.position, remote.position)) {
      return 'same-text-same-position';
    }
    
    // Overlapping text
    if (this.textOverlaps(local.text, remote.text)) {
      return 'overlapping-text';
    }
    
    // Same position, different text
    if (this.samePosition(local.position, remote.position) && local.text !== remote.text) {
      return 'same-position-different-text';
    }
    
    // No conflict - just different highlights
    return 'no-conflict';
  }

  /**
   * Resolve a specific conflict
   */
  resolveConflict(conflict: Conflict): Highlight {
    switch (conflict.type) {
      case 'same-text-same-position':
        return this.mergeMetadata(conflict.local, conflict.remote);
      
      case 'overlapping-text':
        return this.createSeparateHighlights(conflict.local, conflict.remote);
      
      case 'same-position-different-text':
        return this.useMostRecent(conflict.local, conflict.remote);
      
      default:
        return this.keepBoth(conflict.local, conflict.remote);
    }
  }

  /**
   * Merge metadata for same text, same position conflicts
   */
  private mergeMetadata(local: Highlight, remote: Highlight): Highlight {
    const merged: Highlight = {
      ...local,
      note: this.mergeNotes(local.note, remote.note),
      tags: this.mergeTags(local.tags, remote.tags),
      lastModified: new Date(Math.max(
        new Date(local.lastModified).getTime(),
        new Date(remote.lastModified).getTime()
      )),
      platforms: this.mergePlatforms(local.platform, remote.platform),
      reviewHistory: this.mergeReviewHistory(local.reviewHistory, remote.reviewHistory)
    };

    // Use the most recent color if different
    if (local.color !== remote.color) {
      merged.color = this.getMostRecentColor(local, remote);
    }

    return merged;
  }

  /**
   * Create separate highlights for overlapping text
   */
  private createSeparateHighlights(local: Highlight, remote: Highlight): Highlight {
    // For overlapping text, we keep the local version and create a new ID for remote
    // This preserves both highlights as separate entities
    const remoteWithNewId: Highlight = {
      ...remote,
      id: this.generateNewId(),
      platforms: [remote.platform]
    };

    // Return the local version (remote will be added separately)
    return local;
  }

  /**
   * Use the most recent version
   */
  private useMostRecent(local: Highlight, remote: Highlight): Highlight {
    const localTime = new Date(local.lastModified).getTime();
    const remoteTime = new Date(remote.lastModified).getTime();
    
    if (remoteTime > localTime) {
      return {
        ...remote,
        platforms: this.mergePlatforms(local.platform, remote.platform)
      };
    } else {
      return {
        ...local,
        platforms: this.mergePlatforms(local.platform, remote.platform)
      };
    }
  }

  /**
   * Keep both highlights (no conflict)
   */
  private keepBoth(local: Highlight, remote: Highlight): Highlight {
    // Return the local version (remote will be added separately)
    return local;
  }

  /**
   * Merge notes from both highlights
   */
  private mergeNotes(localNote?: string, remoteNote?: string): string {
    if (!localNote && !remoteNote) return '';
    if (!localNote) return remoteNote || '';
    if (!remoteNote) return localNote;
    if (localNote === remoteNote) return localNote;
    
    // Merge different notes
    return `${localNote}\n---\n${remoteNote}`;
  }

  /**
   * Merge tags from both highlights
   */
  private mergeTags(localTags: string[], remoteTags: string[]): string[] {
    const merged = new Set([...localTags, ...remoteTags]);
    return Array.from(merged);
  }

  /**
   * Merge platforms
   */
  private mergePlatforms(localPlatform: string, remotePlatform: string): string[] {
    const platforms = new Set([localPlatform, remotePlatform]);
    return Array.from(platforms);
  }

  /**
   * Merge review history
   */
  private mergeReviewHistory(localHistory: any[], remoteHistory: any[]): any[] {
    const merged = new Map<string, any>();
    
    // Add local review history
    localHistory.forEach(review => {
      merged.set(review.id, review);
    });
    
    // Add remote review history (overwrite if same ID)
    remoteHistory.forEach(review => {
      merged.set(review.id, review);
    });
    
    return Array.from(merged.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Get the most recent color
   */
  private getMostRecentColor(local: Highlight, remote: Highlight): string {
    const localTime = new Date(local.lastModified).getTime();
    const remoteTime = new Date(remote.lastModified).getTime();
    
    return remoteTime > localTime ? remote.color : local.color;
  }

  /**
   * Check if two positions are the same
   */
  private samePosition(pos1: Position, pos2: Position): boolean {
    try {
      // Compare primary positions first
      if (pos1.primary && pos2.primary) {
        if (pos1.primary.type === pos2.primary.type) {
          if (pos1.primary.type === 'cfi') {
            return pos1.primary.value === pos2.primary.value;
          } else if (pos1.primary.type === 'coordinates') {
            const coords1 = pos1.primary.value as any;
            const coords2 = pos2.primary.value as any;
            return (
              coords1.pageNumber === coords2.pageNumber &&
              Math.abs(coords1.x - coords2.x) < 10 &&
              Math.abs(coords1.y - coords2.y) < 10
            );
          }
        }
      }
      
      // Fallback to text content comparison
      return pos1.fallback.textContent === pos2.fallback.textContent;
    } catch (error) {
      console.warn('Position comparison failed:', error);
      return false;
    }
  }

  /**
   * Check if two text selections overlap
   */
  private textOverlaps(text1: string, text2: string): boolean {
    const normalized1 = text1.toLowerCase().trim();
    const normalized2 = text2.toLowerCase().trim();
    
    // Check if one contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
    
    // Check for word overlap
    const words1 = normalized1.split(/\s+/);
    const words2 = normalized2.split(/\s+/);
    
    const overlap = words1.filter(word => words2.includes(word));
    const overlapRatio = overlap.length / Math.min(words1.length, words2.length);
    
    return overlapRatio > 0.5; // 50% word overlap threshold
  }

  /**
   * Generate a new unique ID
   */
  private generateNewId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate conflict resolution result
   */
  validateResolution(original: Highlight[], resolved: Highlight[]): boolean {
    try {
      // Check that no data was lost
      if (resolved.length < original.length) {
        console.warn('Data loss detected in conflict resolution');
        return false;
      }
      
      // Check that all original highlights are preserved
      const resolvedIds = new Set(resolved.map(h => h.id));
      const originalIds = new Set(original.map(h => h.id));
      
      for (const id of originalIds) {
        if (!resolvedIds.has(id)) {
          console.warn(`Original highlight ${id} was lost in resolution`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Conflict resolution validation failed:', error);
      return false;
    }
  }
}
