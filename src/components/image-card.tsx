'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { GeneratedImage } from '@/lib/types';
import { MoreHorizontal, Download, Eye, Copy, Trash2 } from 'lucide-react';
import { downloadSingleImage, formatFileSize } from '@/lib/download';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (imageId: string) => void;
}

export function ImageCard({ image, onDelete }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  async function handleDownload() {
    try {
      setIsLoading(true);
      await downloadSingleImage(image);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadAs(format: 'original' | 'png' | 'jpeg' | 'webp') {
    try {
      setIsLoading(true);
      await downloadSingleImage(image, { format });
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(image.prompt);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-0">
        {/* Image Display */}
        <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {!imageError ? (
            <img
              src={image.url}
              alt={image.prompt}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-slate-500">
                <Eye className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Failed to load image</p>
              </div>
            </div>
          )}
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <div className="space-y-4">
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Prompt:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {image.prompt}
                      </p>
                      <div className="flex space-x-4 pt-2">
                        <div>
                          <p className="text-sm font-medium">Model:</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {image.modelUsed === 'imagen4' ? 'Imagen 4' : image.modelUsed === 'imagen4-fast' ? 'Imagen 4 Fast' : image.modelUsed === 'seedream' ? 'Seedream' : image.modelUsed === 'seedream-v4' ? 'Seedream v4' : image.modelUsed === 'nano-banana' ? 'Nano Banana' : image.modelUsed === 'gpt-image-1' ? 'GPT Image 1' : 'Minimax'}
                            {image.wasFallback && ' (Fallback)'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Aspect Ratio:</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {image.aspectRatio}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Created:</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(image.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload} disabled={isLoading}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span className="flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        Download as
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleDownloadAs('original')} disabled={isLoading}>Original</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadAs('jpeg')} disabled={isLoading}>JPEG (.jpg)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadAs('png')} disabled={isLoading}>PNG (.png)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadAs('webp')} disabled={isLoading}>WebP (.webp)</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={handleCopyPrompt}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy prompt
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(image.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Aspect ratio badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {image.aspectRatio}
              </Badge>
            </div>

            {/* Model and fallback badges */}
            <div className="absolute bottom-2 left-2 flex space-x-1">
              <Badge 
                variant={image.modelUsed === 'imagen4' || image.modelUsed === 'imagen4-fast' ? 'default' : image.modelUsed === 'seedream' ? 'destructive' : image.modelUsed === 'nano-banana' ? 'default' : image.modelUsed === 'gpt-image-1' ? 'secondary' : 'outline'} 
                className="text-xs"
              >
                {image.modelUsed === 'imagen4' ? 'Imagen 4' : image.modelUsed === 'imagen4-fast' ? 'Imagen 4 Fast' : image.modelUsed === 'seedream' ? 'Seedream' : image.modelUsed === 'seedream-v4' ? 'Seedream v4' : image.modelUsed === 'nano-banana' ? 'Nano Banana' : image.modelUsed === 'gpt-image-1' ? 'GPT Image 1' : 'Minimax'}
              </Badge>
              {image.wasFallback && (
                <Badge variant="destructive" className="text-xs">
                  Fallback
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Image info */}
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-3 leading-relaxed">
              {image.prompt}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatDate(image.createdAt)}</span>
            <span>{formatFileSize(image.fileSize)}</span>
          </div>

          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownload}
              disabled={isLoading}
              className="flex-1"
            >
              <Download className="h-3 w-3 mr-1" />
              {isLoading ? 'Downloading...' : 'Download'}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCopyPrompt}
              className="px-3"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 