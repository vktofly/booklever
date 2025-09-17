'use client';

// Reading Controls Component
// Provides world-class reading experience controls

import React, { useState, useEffect } from 'react';
import { ReadingSettings, ReadingTheme, TypographySettings } from '@/lib/readers/web/EPUBRenderer';

interface ReadingControlsProps {
  readingSettings: ReadingSettings;
  onSettingsChange: (settings: Partial<ReadingSettings>) => void;
  onThemeChange: (theme: ReadingTheme) => void;
  onTypographyChange: (typography: Partial<TypographySettings>) => void;
  readingProgress: number;
  readingTime: number;
  bookmarks: string[];
  onBookmarkToggle: () => void;
  onNavigateToBookmark: (position: string) => void;
  onAutoScrollToggle: () => void;
  onFocusModeToggle: () => void;
  onDistractionFreeToggle: () => void;
}

export function ReadingControls({
  readingSettings,
  onSettingsChange,
  onThemeChange,
  onTypographyChange,
  readingProgress,
  readingTime,
  bookmarks,
  onBookmarkToggle,
  onNavigateToBookmark,
  onAutoScrollToggle,
  onFocusModeToggle,
  onDistractionFreeToggle
}: ReadingControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'typography' | 'reading' | 'bookmarks'>('theme');

  const formatReadingTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const availableThemes: ReadingTheme[] = [
    {
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Controls Button */}
      <div className="flex flex-col items-end gap-2">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={onBookmarkToggle}
            className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
            title="Toggle Bookmark (Ctrl+B)"
          >
            📖
          </button>
          
          <button
            onClick={onAutoScrollToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
              readingSettings.autoScroll 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title="Auto Scroll (Ctrl+↓)"
          >
            ⬇️
          </button>
          
          <button
            onClick={onFocusModeToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
              readingSettings.focusMode 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title="Focus Mode (Ctrl+F)"
          >
            🎯
          </button>
          
          <button
            onClick={onDistractionFreeToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
              readingSettings.distractionFree 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title="Distraction Free (Ctrl+D)"
          >
            🔒
          </button>
        </div>

        {/* Main Settings Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          title="Reading Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Expanded Controls Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Reading Settings</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Reading Stats */}
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>Progress: {Math.round(readingProgress)}%</span>
              <span>Time: {formatReadingTime(readingTime)}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'theme', label: 'Theme', icon: '🎨' },
              { id: 'typography', label: 'Text', icon: '📝' },
              { id: 'reading', label: 'Reading', icon: '👁️' },
              { id: 'bookmarks', label: 'Bookmarks', icon: '📖' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Reading Theme</h4>
                <div className="grid grid-cols-2 gap-3">
                  {availableThemes.map(theme => (
                    <button
                      key={theme.name}
                      onClick={() => onThemeChange(theme)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        readingSettings.theme.name === theme.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded mb-2"
                        style={{ backgroundColor: theme.background }}
                      />
                      <div className="text-sm font-medium text-gray-900">{theme.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typography Tab */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Typography</h4>
                
                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    value={readingSettings.typography.fontFamily}
                    onChange={(e) => onTypographyChange({ fontFamily: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="serif">Serif (Georgia)</option>
                    <option value="sans-serif">Sans Serif (Inter)</option>
                    <option value="monospace">Monospace (JetBrains Mono)</option>
                    <option value="dyslexia-friendly">Dyslexia Friendly</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size: {readingSettings.typography.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={readingSettings.typography.fontSize}
                    onChange={(e) => onTypographyChange({ fontSize: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Line Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Line Height: {readingSettings.typography.lineHeight}
                  </label>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={readingSettings.typography.lineHeight}
                    onChange={(e) => onTypographyChange({ lineHeight: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Margin Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margin Width: {readingSettings.typography.marginWidth}%
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={readingSettings.typography.marginWidth}
                    onChange={(e) => onTypographyChange({ marginWidth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Reading Tab */}
            {activeTab === 'reading' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Reading Options</h4>
                
                {/* Auto Scroll Speed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto Scroll Speed: {readingSettings.autoScrollSpeed}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={readingSettings.autoScrollSpeed}
                    onChange={(e) => onSettingsChange({ autoScrollSpeed: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Display Options */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={readingSettings.showProgress}
                      onChange={(e) => onSettingsChange({ showProgress: e.target.checked })}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Show Reading Progress</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={readingSettings.showBookmarks}
                      onChange={(e) => onSettingsChange({ showBookmarks: e.target.checked })}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Show Bookmarks</span>
                  </label>
                </div>
              </div>
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Bookmarks</h4>
                  <span className="text-sm text-gray-500">{bookmarks.length} saved</span>
                </div>
                
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📖</div>
                    <p>No bookmarks yet</p>
                    <p className="text-sm">Use Ctrl+B to add bookmarks</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bookmarks.map((bookmark, index) => (
                      <button
                        key={index}
                        onClick={() => onNavigateToBookmark(bookmark)}
                        className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900">Bookmark {index + 1}</div>
                        <div className="text-xs text-gray-500">{bookmark}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
