'use client';

// Sync Indicator Component
// Shows a simple sync status indicator for the library page

import React from 'react';

interface SyncIndicatorProps {
  isSyncing: boolean;
  hasError: boolean;
  lastSyncTime: Date | null;
}

export function SyncIndicator({ isSyncing, hasError, lastSyncTime }: SyncIndicatorProps) {
  const getStatusColor = () => {
    if (hasError) return 'text-red-500';
    if (isSyncing) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (hasError) return '❌';
    if (isSyncing) return '🔄';
    return '✅';
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never synced';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just synced';
    if (minutes < 60) return `Synced ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Synced ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Synced ${days}d ago`;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`${getStatusColor()}`}>
        {getStatusIcon()}
      </span>
      <span className="text-gray-600">
        {formatLastSync()}
      </span>
      {isSyncing && (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  );
}
