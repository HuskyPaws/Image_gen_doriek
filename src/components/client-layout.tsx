'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SettingsModal } from './settings-modal';
import { Settings, Scissors, Globe, Eraser, Image as ImageIcon, HelpCircle } from 'lucide-react';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Image Generator
              </h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/tools/script-cleaner">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Script Cleaner
                </Button>
              </Link>
              <Link href="/tools/script-chunker">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Script Chunker
                </Button>
              </Link>
              <Link href="/tools/stock-image-finder">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Stock Images
                </Button>
              </Link>
              <Link href="/tools/thumbnail-tester">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Thumbnail Tester
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Link href="/docs">
                <Button
                  variant="outline"
                  size="sm"
                  title="Help & Documentation"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </Link>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Powered by fal.ai
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
} 