'use client';

// Sync Status Component
// Shows the current sync status and allows manual sync

import React, { useState, useEffect } from 'react';
import { SyncStatus as SyncStatusType } from '@/lib/services/highlightSyncService';

interface SyncStatusProps {
  syncStatus: SyncStatusType;
  onSync: () => Promise<void>;
  onForceSync: () => Promise<void>;
  bookId: string;
}

export function SyncStatus({ syncStatus, onSync, onForceSync, bookId }: SyncStatusProps) {
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSync = async () => {
    setIsManualSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleForceSync = async () => {
    setIsManualSyncing(true);
    try {
      await onForceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (syncStatus.syncError) return 'text-red-500';
    if (syncStatus.isSyncing || isManualSyncing) return 'text-blue-500';
    if (syncStatus.pendingChanges > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (syncStatus.syncError) return '❌';
    if (syncStatus.isSyncing || isManualSyncing) return '🔄';
    if (syncStatus.pendingChanges > 0) return '⏳';
    return '✅';
  };

  const getStatusText = () => {
    if (syncStatus.syncError) return 'Sync Error';
    if (syncStatus.isSyncing || isManualSyncing) return 'Syncing...';
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} pending changes`;
    return 'Synced';
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - syncStatus.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Sync Status</h3>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusIcon()} {getStatusText()}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Last sync:</span>
          <span>{formatLastSync()}</span>
        </div>
        
        {syncStatus.pendingChanges > 0 && (
          <div className="flex justify-between">
            <span>Pending changes:</span>
            <span className="text-yellow-600">{syncStatus.pendingChanges}</span>
          </div>
        )}

        {syncStatus.syncError && (
          <div className="text-red-600 text-xs">
            Error: {syncStatus.syncError}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSync}
          disabled={syncStatus.isSyncing || isManualSyncing}
          className="flex-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isManualSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
        
        <button
          onClick={handleForceSync}
          disabled={syncStatus.isSyncing || isManualSyncing}
          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Force sync from Google Drive"
        >
          ↻
        </button>
      </div>

      {/* Sync progress indicator */}
      {(syncStatus.isSyncing || isManualSyncing) && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
