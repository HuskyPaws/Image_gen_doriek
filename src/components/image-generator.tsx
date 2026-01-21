'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenerationSettings, GeneratedImage } from '@/lib/types';
import { generateMultipleImages, parsePromptsFromText } from '@/lib/api';
import { addImage, getGenerationLogsBySession } from '@/lib/storage';
import { GenerationLogSheet } from '@/components/generation-log-sheet';
import { Upload, Wand2, X, FileText, AlertCircle, List } from 'lucide-react';

interface ImageGeneratorProps {
  projectId: string;
  onImageGenerated: (image: GeneratedImage) => void;
  isOpen?: boolean;
  onClose?: () => void;
  initialPrompts?: string;
}

export function ImageGenerator({ projectId, onImageGenerated, isOpen, onClose, initialPrompts }: ImageGeneratorProps) {
  const [prompts, setPrompts] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [fallbackCount, setFallbackCount] = useState(0);
  const [fallbackInfo, setFallbackInfo] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLogSheetOpen, setIsLogSheetOpen] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'minimax',
    aspectRatio: '1:1',
    numImages: 1,
    promptOptimizer: true,
    enableFallback: true,
    openaiBackground: 'auto',
    openaiQuality: 'auto',
    openaiOutputFormat: 'png',
    guidanceScale: 2.5,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptList = parsePromptsFromText(prompts);
  const estimatedImages = promptList.length * settings.numImages;

  useEffect(() => {
    if (initialPrompts && !isGenerating) {
      setPrompts(initialPrompts);
    }
  }, [initialPrompts, isGenerating]);

  async function handleGenerate() {
    if (!prompts.trim() || isGenerating) return;

    setIsGenerating(true);
    setProgress(0);
    setGeneratedCount(0);
    setErrors([]);
    setCurrentPrompt('');
    setFallbackCount(0);
    setFallbackInfo('');

    try {
      const { completed, errors: generationErrors, fallbackCount: totalFallbacks, sessionId } = await generateMultipleImages(
        promptList,
        settings,
        projectId,
        (completed, total, prompt, fallbackInfoText) => {
          setProgress((completed / total) * 100);
          setCurrentPrompt(prompt || '');
          if (fallbackInfoText) {
            setFallbackInfo(fallbackInfoText);
          }
        },
        async (image) => {
          try {
            await addImage(image);
            onImageGenerated(image);
            setGeneratedCount(prev => prev + 1);
          } catch (error) {
            console.error('Failed to save image:', error);
            setErrors(prev => [...prev, `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`]);
          }
        }
      );
      
      setCurrentSessionId(sessionId);

      setFallbackCount(totalFallbacks);

      if (generationErrors.length > 0) {
        setErrors(generationErrors);
      }

      // Clear prompts if all successful
      if (generationErrors.length === 0) {
        setPrompts('');
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Generation failed']);
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentPrompt('');
      setFallbackInfo('');
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPrompts(content);
    };
    reader.readAsText(file);
  }

  function clearPrompts() {
    setPrompts('');
    setErrors([]);
  }

  const content = (
    <div className="space-y-6">
      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <Select 
            value={settings.model} 
            onValueChange={(value) => setSettings(prev => ({ ...prev, model: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimax">Minimax</SelectItem>
              <SelectItem value="imagen4">Imagen 4 Preview (Google)</SelectItem>
              <SelectItem value="imagen4-fast">Imagen 4 Fast (Google)</SelectItem>
              <SelectItem value="seedream">Seedream (ByteDance)</SelectItem>
              <SelectItem value="seedream-v4">Seedream v4 (ByteDance)</SelectItem>
              <SelectItem value="nano-banana">Nano Banana (Gemini 2.5)</SelectItem>
              <SelectItem value="gpt-image-1">GPT Image 1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Aspect Ratio</label>
          <Select 
            value={settings.aspectRatio} 
            onValueChange={(value) => setSettings(prev => ({ ...prev, aspectRatio: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">Square (1:1)</SelectItem>
              <SelectItem value="16:9">Landscape (16:9)</SelectItem>
              <SelectItem value="4:3">Landscape (4:3)</SelectItem>
              <SelectItem value="5:4">Landscape (5:4)</SelectItem>
              <SelectItem value="3:2">Landscape (3:2)</SelectItem>
              <SelectItem value="4:5">Portrait (4:5)</SelectItem>
              <SelectItem value="2:3">Portrait (2:3)</SelectItem>
              <SelectItem value="3:4">Portrait (3:4)</SelectItem>
              <SelectItem value="9:16">Portrait (9:16)</SelectItem>
              <SelectItem value="21:9">Ultra-wide (21:9)</SelectItem>
              <SelectItem value="4:3-custom">4:3 Custom Size (2048x1536)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Images per Prompt</label>
          <Select 
            value={settings.numImages.toString()} 
            onValueChange={(value) => setSettings(prev => ({ ...prev, numImages: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settings.model === 'gpt-image-1' 
                ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))
                : [1, 2, 3, 4].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
        </div>

        {/* Conditional settings based on model */}
        {settings.model === 'gpt-image-1' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <Select 
              value={settings.openaiQuality || 'auto'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, openaiQuality: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (settings.model === 'imagen4' || settings.model === 'imagen4-fast') ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <Select 
              value={settings.imagen4Resolution || '1K'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, imagen4Resolution: value as '1K' | '2K' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1K">1K (Standard)</SelectItem>
                <SelectItem value="2K">2K (High Resolution)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : settings.model !== 'seedream' && settings.model !== 'seedream-v4' && settings.model !== 'nano-banana' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt Optimizer</label>
            <Select 
              value={settings.promptOptimizer.toString()} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, promptOptimizer: value === 'true' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : settings.model === 'nano-banana' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Auto Fallback</label>
            <Select 
              value={settings.enableFallback?.toString() ?? 'true'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, enableFallback: value === 'true' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Retry with Minimax if blocked</p>
          </div>
        ) : settings.model === 'seedream' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Guidance Scale</label>
            <Select 
              value={settings.guidanceScale?.toString() ?? '2.5'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, guidanceScale: parseFloat(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.0">1.0 (Low)</SelectItem>
                <SelectItem value="1.5">1.5</SelectItem>
                <SelectItem value="2.0">2.0</SelectItem>
                <SelectItem value="2.5">2.5 (Default)</SelectItem>
                <SelectItem value="3.0">3.0</SelectItem>
                <SelectItem value="3.5">3.5</SelectItem>
                <SelectItem value="4.0">4.0 (High)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Higher values follow the prompt more closely</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Auto Fallback</label>
            <Select 
              value={settings.enableFallback?.toString() ?? 'true'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, enableFallback: value === 'true' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Retry with Minimax if blocked</p>
          </div>
        )}
      </div>

      {/* Additional OpenAI Settings */}
      {settings.model === 'gpt-image-1' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Background</label>
            <Select 
              value={settings.openaiBackground || 'auto'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, openaiBackground: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="transparent">Transparent</SelectItem>
                <SelectItem value="opaque">Opaque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <Select 
              value={settings.openaiOutputFormat || 'png'} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, openaiOutputFormat: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Model Info */}
      {settings.model === 'imagen4' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800">Imagen 4 Preview (Google)</p>
              <p className="text-sm text-amber-700">
                Google's highest quality image generation model. Excels at fine details, textures, and diverse art styles.
                {settings.imagen4Resolution === '2K' && ' Using 2K resolution for enhanced detail.'}
                {settings.enableFallback 
                  ? ' Auto fallback to Minimax is enabled if content moderation triggers.'
                  : ' Auto fallback is disabled.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {settings.model === 'imagen4-fast' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-800">Imagen 4 Fast (Google)</p>
              <p className="text-sm text-green-700">
                Faster version of Imagen 4 Preview with similar quality. Great for batch generation.
                {settings.imagen4Resolution === '2K' && ' Using 2K resolution for enhanced detail.'}
                {settings.enableFallback 
                  ? ' Auto fallback to Minimax is enabled if content moderation triggers.'
                  : ' Auto fallback is disabled.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {settings.model === 'seedream' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-purple-800">Seedream (ByteDance) + Auto Fallback</p>
              <p className="text-sm text-purple-700">
                Seedream is ByteDance's high-quality text-to-image model. It may have content moderation and reject some prompts. 
                {settings.enableFallback 
                  ? ' Auto fallback to Minimax is enabled - if Seedream fails, we\'ll automatically retry with Minimax.'
                  : ' Auto fallback is disabled - generation will fail if Seedream rejects the prompt.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {settings.model === 'nano-banana' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800">Nano Banana (Gemini 2.5 Flash Image)</p>
              <p className="text-sm text-yellow-700">
                Google's Gemini 2.5 Flash Image text-to-image model. Supports a wide range of aspect ratios including 5:4 and 4:5.
                {settings.enableFallback 
                  ? ' Auto fallback to Minimax is enabled if generation fails.'
                  : ' Auto fallback is disabled.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {settings.model === 'gpt-image-1' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">GPT Image 1 (OpenAI)</p>
              <p className="text-sm text-blue-700">
                Requires OpenAI API key. Supports up to 10 images per prompt, transparent backgrounds, 
                and multiple output formats. Go to Settings to configure your OpenAI API key.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Prompts (one per line)</label>
          <div className="flex space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload .txt
            </Button>
            {prompts && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearPrompts}
                disabled={isGenerating}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <Textarea
          placeholder="Enter your prompts here, one per line...&#10;&#10;Example:&#10;A serene mountain landscape at sunset&#10;A futuristic city with flying cars&#10;A cute robot playing with a cat"
          value={prompts}
          onChange={(e) => setPrompts(e.target.value)}
          disabled={isGenerating}
          className="min-h-[120px] resize-y"
        />

        {promptList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <FileText className="h-3 w-3 mr-1" />
              {promptList.length} prompts
            </Badge>
            <Badge variant="secondary">
              ≈ {estimatedImages} images
            </Badge>
            {estimatedImages > 20 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Large batch
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Generating images...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {currentPrompt && (
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              Current: {currentPrompt}
            </p>
          )}
          {fallbackInfo && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              🔄 {fallbackInfo}
            </p>
          )}
          <div className="flex space-x-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Generated: {generatedCount}</span>
            <span>Target: {estimatedImages}</span>
            {fallbackCount > 0 && (
              <span className="text-amber-600">Fallbacks: {fallbackCount}</span>
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
            Generation Errors:
          </h4>
          <div className="space-y-1">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={!prompts.trim() || isGenerating || promptList.length === 0}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          size="lg"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isGenerating ? 'Generating...' : `Generate ${estimatedImages} ${estimatedImages === 1 ? 'Image' : 'Images'}`}
        </Button>
        
        {currentSessionId && (
          <Button
            onClick={() => setIsLogSheetOpen(true)}
            variant="outline"
            size="lg"
            className="flex-shrink-0"
          >
            <List className="h-4 w-4 mr-2" />
            Log
          </Button>
        )}
      </div>
    </div>
  );

  // Render as modal if isOpen and onClose are provided
  if (isOpen !== undefined && onClose) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Wand2 className="h-5 w-5" />
                <span>Generate Images</span>
              </DialogTitle>
              <DialogDescription>
                Create AI-generated images using custom prompts
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
        
        {/* Generation Log Sheet */}
        <GenerationLogSheet
          logs={[]}
          isOpen={isLogSheetOpen}
          onClose={() => setIsLogSheetOpen(false)}
          sessionId={currentSessionId || undefined}
        />
      </>
    );
  }

  // Render as card for inline use
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5" />
            <span>Generate Images</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
      
      {/* Generation Log Sheet */}
      <GenerationLogSheet
        logs={[]}
        isOpen={isLogSheetOpen}
        onClose={() => setIsLogSheetOpen(false)}
        sessionId={currentSessionId || undefined}
      />
    </>
  );
} 