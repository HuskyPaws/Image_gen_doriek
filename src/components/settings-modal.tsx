'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Settings, Key, Save, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [currentOpenaiKey, setCurrentOpenaiKey] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearTarget, setClearTarget] = useState<'fal' | 'openai' | 'openrouter' | 'pexels' | 'pixabay'>('fal');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [currentOpenrouterKey, setCurrentOpenrouterKey] = useState('');
  const [openrouterModelId, setOpenrouterModelId] = useState('');
  const [currentOpenrouterModelId, setCurrentOpenrouterModelId] = useState('');
  // Stock Image API keys (optional fallbacks)
  const [pexelsApiKey, setPexelsApiKey] = useState('');
  const [currentPexelsKey, setCurrentPexelsKey] = useState('');
  const [pixabayApiKey, setPixabayApiKey] = useState('');
  const [currentPixabayKey, setCurrentPixabayKey] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFal = localStorage.getItem('fal_api_key') || '';
      const savedOpenai = localStorage.getItem('openai_api_key') || '';
      let savedOpenrouter = '';
      try { savedOpenrouter = localStorage.getItem('openrouter_api_key') || ''; } catch {}
      if (!savedOpenrouter) {
        try { savedOpenrouter = sessionStorage.getItem('openrouter_api_key') || ''; } catch {}
      }
      if (!savedOpenrouter) {
        const mem = (window as any).__openrouter_api_key;
        if (typeof mem === 'string') savedOpenrouter = mem;
      }
      const savedOpenrouterModel = localStorage.getItem('openrouter_model_id') || '';
      const savedPexels = localStorage.getItem('pexels_api_key') || '';
      const savedPixabay = localStorage.getItem('pixabay_api_key') || '';
      setCurrentKey(savedFal);
      setApiKey(savedFal);
      setCurrentOpenaiKey(savedOpenai);
      setOpenaiApiKey(savedOpenai);
      setCurrentOpenrouterKey(savedOpenrouter);
      setOpenrouterApiKey(savedOpenrouter);
      setCurrentOpenrouterModelId(savedOpenrouterModel);
      setOpenrouterModelId(savedOpenrouterModel || 'anthropic/claude-sonnet-4.5');
      setCurrentPexelsKey(savedPexels);
      setPexelsApiKey(savedPexels);
      setCurrentPixabayKey(savedPixabay);
      setPixabayApiKey(savedPixabay);
    }
  }, [isOpen]);

  function handleSave() {
    if (typeof window !== 'undefined') {
      // Save fal.ai key
      localStorage.setItem('fal_api_key', apiKey);
      setCurrentKey(apiKey);
      
      // Save OpenAI key
      localStorage.setItem('openai_api_key', openaiApiKey);
      setCurrentOpenaiKey(openaiApiKey);

      // Save OpenRouter key and model id
      if (openrouterApiKey?.trim()) {
        try {
          localStorage.setItem('openrouter_api_key', openrouterApiKey.trim());
        } catch {
          try {
            sessionStorage.setItem('openrouter_api_key', openrouterApiKey.trim());
          } catch {}
          (window as any).__openrouter_api_key = openrouterApiKey.trim();
        }
      } else {
        try { localStorage.removeItem('openrouter_api_key'); } catch {}
        try { sessionStorage.removeItem('openrouter_api_key'); } catch {}
        (window as any).__openrouter_api_key = '';
      }
      if (openrouterModelId?.trim()) localStorage.setItem('openrouter_model_id', openrouterModelId.trim()); else localStorage.removeItem('openrouter_model_id');
      setCurrentOpenrouterKey(openrouterApiKey.trim());
      setCurrentOpenrouterModelId(openrouterModelId.trim());

      // Save stock image API keys (optional)
      if (pexelsApiKey?.trim()) {
        localStorage.setItem('pexels_api_key', pexelsApiKey.trim());
      } else {
        localStorage.removeItem('pexels_api_key');
      }
      setCurrentPexelsKey(pexelsApiKey.trim());

      if (pixabayApiKey?.trim()) {
        localStorage.setItem('pixabay_api_key', pixabayApiKey.trim());
      } else {
        localStorage.removeItem('pixabay_api_key');
      }
      setCurrentPixabayKey(pixabayApiKey.trim());
      
      // Configure fal.ai client immediately
      if (apiKey) {
        const { fal } = require('@fal-ai/client');
        fal.config({
          credentials: apiKey,
        });
      }
      
      onClose();
    }
  }

  function handleClear() {
    if (typeof window !== 'undefined') {
      if (clearTarget === 'fal') {
        localStorage.removeItem('fal_api_key');
        setApiKey('');
        setCurrentKey('');
      } else if (clearTarget === 'openai') {
        localStorage.removeItem('openai_api_key');
        setOpenaiApiKey('');
        setCurrentOpenaiKey('');
      } else if (clearTarget === 'openrouter') {
        localStorage.removeItem('openrouter_api_key');
        localStorage.removeItem('openrouter_model_id');
        setOpenrouterApiKey('');
        setOpenrouterModelId('');
        setCurrentOpenrouterKey('');
        setCurrentOpenrouterModelId('');
      } else if (clearTarget === 'pexels') {
        localStorage.removeItem('pexels_api_key');
        setPexelsApiKey('');
        setCurrentPexelsKey('');
      } else if (clearTarget === 'pixabay') {
        localStorage.removeItem('pixabay_api_key');
        setPixabayApiKey('');
        setCurrentPixabayKey('');
      }
      setShowClearDialog(false);
    }
  }

  function openClearDialog(target: 'fal' | 'openai' | 'openrouter' | 'pexels' | 'pixabay') {
    setClearTarget(target);
    setShowClearDialog(true);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>API Settings</span>
            </DialogTitle>
            <DialogDescription>
              Configure your API keys to generate images with different models
            </DialogDescription>
          </DialogHeader>
          
          {/* Grid layout for API keys */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                Image Generation APIs
              </h3>
              
              {/* fal.ai API Key */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  fal.ai API Key
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Minimax, Imagen 4, Seedream, Nano Banana
                </p>
                <Input
                  type="password"
                  placeholder="Enter your fal.ai API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Get key at{' '}
                  <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    fal.ai/dashboard/keys
                  </a>
                </p>
                {currentKey && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-800 dark:text-green-200">{currentKey.substring(0, 10)}...</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openClearDialog('fal')} className="h-5 w-5 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* OpenAI API Key */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  OpenAI API Key
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">GPT Image 1</p>
                <Input
                  type="password"
                  placeholder="Enter your OpenAI API key..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Get key at{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    platform.openai.com/api-keys
                  </a>
                </p>
                {currentOpenaiKey && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-blue-800 dark:text-blue-200">{currentOpenaiKey.substring(0, 10)}...</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openClearDialog('openai')} className="h-5 w-5 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* OpenRouter API Key + Model */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  OpenRouter API Key
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Prompt Generation (Claude Sonnet)</p>
                <Input
                  type="password"
                  placeholder="Enter your OpenRouter API key..."
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Get key at{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    openrouter.ai/keys
                  </a>
                </p>
                <div className="mt-2">
                  <label className="text-xs font-medium mb-1 block">Model ID</label>
                  <Input
                    placeholder="anthropic/claude-sonnet-4.5"
                    value={openrouterModelId}
                    onChange={(e) => setOpenrouterModelId(e.target.value)}
                    className="text-sm"
                  />
                </div>
                {(currentOpenrouterKey || currentOpenrouterModelId) && (
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Key className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                        <span className="text-xs">Configured</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openClearDialog('openrouter')} className="h-5 w-5 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {currentOpenrouterModelId && (
                      <p className="text-xs text-slate-500 mt-1">Model: {currentOpenrouterModelId}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                Stock Image APIs (Optional)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wikimedia Commons (primary) requires no API key. These are optional fallbacks.
              </p>

              {/* Pexels API Key */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pexels API Key
                </label>
                <Input
                  type="password"
                  placeholder="Enter your Pexels API key..."
                  value={pexelsApiKey}
                  onChange={(e) => setPexelsApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Get free key at{' '}
                  <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    pexels.com/api
                  </a>
                </p>
                {currentPexelsKey && (
                  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs text-purple-800 dark:text-purple-200">{currentPexelsKey.substring(0, 10)}...</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openClearDialog('pexels')} className="h-5 w-5 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Pixabay API Key */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pixabay API Key
                </label>
                <Input
                  type="password"
                  placeholder="Enter your Pixabay API key..."
                  value={pixabayApiKey}
                  onChange={(e) => setPixabayApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Get free key at{' '}
                  <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    pixabay.com/api/docs
                  </a>
                </p>
                {currentPixabayKey && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs text-orange-800 dark:text-orange-200">{currentPixabayKey.substring(0, 10)}...</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openClearDialog('pixabay')} className="h-5 w-5 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your saved {
                clearTarget === 'fal' ? 'fal.ai' : 
                clearTarget === 'openai' ? 'OpenAI' : 
                clearTarget === 'openrouter' ? 'OpenRouter' :
                clearTarget === 'pexels' ? 'Pexels' : 'Pixabay'
              } API key? 
              {clearTarget === 'fal' ? "You'll need it for Minimax/Imagen 4/Seedream/Nano Banana." : 
               clearTarget === 'openai' ? "You'll need it for GPT Image 1." : 
               clearTarget === 'openrouter' ? "You'll need it for Claude Sonnet prompt generation." :
               "This is optional - Wikimedia Commons (primary) doesn't require a key."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>
              Clear Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 