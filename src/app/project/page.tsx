'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ImageCard } from '@/components/image-card';
import { ImageGenerator } from '@/components/image-generator';
import { ProjectLogViewer } from '@/components/project-log-viewer';
import { Project, GeneratedImage, SortOption, ChunkPrompt } from '@/lib/types';
import { getProjects, getImagesByProject, deleteImage } from '@/lib/storage';
import { downloadImagesAsZip, estimateZipSize, ExportImageFormat } from '@/lib/download';
import { 
  ArrowLeft, 
  Download, 
  SortAsc, 
  Calendar, 
  ArrowUpDown,
  Images,
  Trash2,
  MoreHorizontal,
  FileText,
  Loader2
} from 'lucide-react';

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id') || '';
  
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [bulkFormat, setBulkFormat] = useState<ExportImageFormat>('original');
  const [chunkPromptsData, setChunkPromptsData] = useState<ChunkPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      const projects = await getProjects();
      const currentProject = projects.find(p => p.id === projectId);
      setProject(currentProject || null);
      if (currentProject) {
        const projectImages = await getImagesByProject(projectId);
        setImages(projectImages);
        
        // Load chunk prompts data from project (persisted in IndexedDB)
        if (currentProject.chunkPromptsData && currentProject.chunkPromptsData.length > 0) {
          setChunkPromptsData(currentProject.chunkPromptsData);
        }
        
        // Diagnostic: Check for missing images
        const { getGenerationLogsByProject } = await import('@/lib/storage');
        const logs = await getGenerationLogsByProject(projectId);
        const successfulLogs = logs.filter(log => log.status === 'success');
        
        if (successfulLogs.length !== projectImages.length) {
          console.warn(`⚠️ IMAGE COUNT MISMATCH DETECTED!`);
          console.warn(`📊 Successful generation logs: ${successfulLogs.length}`);
          console.warn(`🖼️  Actual stored images: ${projectImages.length}`);
          console.warn(`❌ Missing images: ${successfulLogs.length - projectImages.length}`);
          
          // Find which images are in logs but not in storage
          const imageIds = new Set(projectImages.map(img => img.id));
          const missingImages = successfulLogs.filter(log => {
            const logImageId = log.generatedImage?.id;
            return logImageId && !imageIds.has(logImageId);
          });
          
          if (missingImages.length > 0) {
            console.warn(`🔍 Missing image details:`, missingImages.map(log => ({
              id: log.generatedImage?.id,
              prompt: log.prompt,
              url: log.generatedImage?.url,
              createdAt: log.createdAt
            })));
            console.log('💡 TIP: Open browser DevTools (F12) to see these details');
            
            // Auto-recover missing images
            console.log('🔧 Attempting to recover missing images...');
            let recoveredCount = 0;
            for (const log of missingImages) {
              if (log.generatedImage) {
                try {
                  const { addImage } = await import('@/lib/storage');
                  // Skip count increment since these were already counted
                  await addImage(log.generatedImage, true);
                  recoveredCount++;
                  console.log(`✅ Recovered image: ${log.generatedImage.id}`);
                } catch (error) {
                  console.error(`❌ Failed to recover image ${log.generatedImage.id}:`, error);
                }
              }
            }
            
            if (recoveredCount > 0) {
              console.log(`🎉 Successfully recovered ${recoveredCount} missing images! Reloading...`);
              // Reload images to show recovered ones
              const updatedImages = await getImagesByProject(projectId);
              setImages(updatedImages);
            }
          }
        } else {
          console.log(`✅ Image count matches: ${projectImages.length} images`);
        }
      }
      setIsLoading(false);
      
      // Check for auto-generate flag from script chunker
      if (typeof window !== 'undefined') {
        const autoGenerate = sessionStorage.getItem('autoGenerateOnLoad');
        if (autoGenerate === 'true') {
          sessionStorage.removeItem('autoGenerateOnLoad');
          setIsGeneratorOpen(true);
          
          // Clear pendingPrompts after a short delay to let ImageGenerator read them
          setTimeout(() => {
            sessionStorage.removeItem('pendingPrompts');
            sessionStorage.removeItem('chunkPromptsData');
          }, 1000);
        }
      }
    })();
  }, [projectId]);

  function sortImages(images: GeneratedImage[], sortBy: SortOption): GeneratedImage[] {
    const sorted = [...images];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'prompt-az':
        return sorted.sort((a, b) => a.prompt.localeCompare(b.prompt));
      case 'prompt-za':
        return sorted.sort((a, b) => b.prompt.localeCompare(a.prompt));
      default:
        return sorted;
    }
  }

  function handleImageGenerated() {
    // Refresh images when new ones are generated
    if (projectId) {
      (async () => {
        const projectImages = await getImagesByProject(projectId);
        setImages(projectImages);
        const projects = await getProjects();
        const currentProject = projects.find(p => p.id === projectId);
        setProject(currentProject || null);
      })();
    }
  }

  function handleImageDelete(imageId: string) {
    setDeleteImageId(imageId);
  }

  function confirmDeleteImage() {
    if (!deleteImageId || !projectId) return;
    (async () => {
      const ok = await deleteImage(deleteImageId);
      if (ok) {
        const projectImages = await getImagesByProject(projectId);
        setImages(projectImages);
        const projects = await getProjects();
        const currentProject = projects.find(p => p.id === projectId);
        setProject(currentProject || null);
        const newSelection = new Set(selectedImages);
        newSelection.delete(deleteImageId);
        setSelectedImages(newSelection);
      }
    })();
    setDeleteImageId(null);
  }

  function handleSelectAll() {
    if (selectedImages.size === sortedImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(sortedImages.map(img => img.id)));
    }
  }

  async function handleBulkDownload() {
    if (selectedImages.size === 0 || !project) return;
    
    const selectedImageObjects = images.filter(img => selectedImages.has(img.id));
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      await downloadImagesAsZip(
        selectedImageObjects,
        project.name,
        (current, total) => {
          setDownloadProgress((current / total) * 100);
        },
        { format: bulkFormat }
      );
    } catch (error) {
      console.error('Failed to download images:', error);
      alert('Failed to download images. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  function handleBulkDelete() {
    if (selectedImages.size === 0 || !projectId) return;
    
    (async () => {
      let deletedCount = 0;
      for (const imageId of selectedImages) {
        if (await deleteImage(imageId)) {
          deletedCount++;
        }
      }
      if (deletedCount > 0) {
        const projectImages = await getImagesByProject(projectId);
        setImages(projectImages);
        const projects = await getProjects();
        const currentProject = projects.find(p => p.id === projectId);
        setProject(currentProject || null);
        setSelectedImages(new Set());
      }
    })();
  }

  function handleExportCSV() {
    // Helper to escape CSV fields
    const escapeCSVField = (field: string): string => {
      // Wrap in quotes and escape internal quotes by doubling them
      return `"${field.replace(/"/g, '""')}"`;
    };

    // If we have full chunk prompts data (from Script Chunker), export with script text
    if (chunkPromptsData.length > 0) {
      const csvRows = [
        // Header row
        'NR,Image Prompt,Related Script Text',
        // Data rows - all fields wrapped in quotes
        ...chunkPromptsData.map((chunk, index) => {
          const nr = escapeCSVField((index + 1).toString());
          const imagePrompt = escapeCSVField(chunk.prompt);
          const scriptText = escapeCSVField(chunk.originalText);
          return `${nr},${imagePrompt},${scriptText}`;
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'prompts'}-script-data.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (images.length > 0) {
      // Fallback: export prompts from generated images (no script text available)
      const sortedByDate = [...images].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const csvRows = [
        // Header row
        'NR,Image Prompt',
        // Data rows
        ...sortedByDate.map((img, index) => {
          const nr = escapeCSVField((index + 1).toString());
          const imagePrompt = escapeCSVField(img.prompt);
          return `${nr},${imagePrompt}`;
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'prompts'}-prompts.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert('No data available to export.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Project not found
        </h1>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const sortedImages = sortImages(images, sortBy);
  const selectedImageObjects = images.filter(img => selectedImages.has(img.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsLogViewerOpen(true)}
            variant="outline"
          >
            <FileText className="h-4 w-4 mr-2" />
            Project Log
          </Button>
          {(chunkPromptsData.length > 0 || images.length > 0) && (
            <Button 
              onClick={handleExportCSV}
              variant="outline"
              title={chunkPromptsData.length > 0 
                ? "Export prompts with script text as CSV" 
                : "Export image prompts as CSV"
              }
            >
              <Download className="h-4 w-4 mr-2" />
              {chunkPromptsData.length > 0 ? 'Export CSV' : 'Export Prompts'}
            </Button>
          )}
          <Button 
            onClick={() => setIsGeneratorOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Images className="h-4 w-4 mr-2" />
            Generate Images
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Images className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Images</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{images.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Created</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Selected</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedImages.size}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <ArrowUpDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Est. Size</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {selectedImages.size > 0 ? estimateZipSize(selectedImageObjects) : '0 MB'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {images.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <SortAsc className="h-4 w-4 text-slate-500" />
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="prompt-a-z">Prompt A-Z</SelectItem>
                  <SelectItem value="prompt-z-a">Prompt Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedImages.size === sortedImages.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            {selectedImages.size > 0 && (
              <Badge variant="secondary">
                {selectedImages.size} selected
              </Badge>
            )}
          </div>
          
          {selectedImages.size > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Selected
              </Button>
              <Select value={bulkFormat} onValueChange={(v) => setBulkFormat(v as ExportImageFormat)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="jpeg">JPEG (.jpg)</SelectItem>
                  <SelectItem value="png">PNG (.png)</SelectItem>
                  <SelectItem value="webp">WebP (.webp)</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Downloading images...</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">{Math.round(downloadProgress)}%</span>
          </div>
          <Progress value={downloadProgress} />
        </div>
      )}

      {/* Images Grid */}
      {sortedImages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onDelete={handleImageDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Images className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No images yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Generate your first images to get started
          </p>
          <Button 
            onClick={() => setIsGeneratorOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Images className="h-4 w-4 mr-2" />
            Generate Images
          </Button>
        </div>
      )}

      {/* Image Generator Modal */}
      <ImageGenerator
        projectId={projectId}
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onImageGenerated={handleImageGenerated}
        initialPrompts={typeof window !== 'undefined' ? sessionStorage.getItem('pendingPrompts') || undefined : undefined}
      />

      {/* Project Log Viewer */}
      <ProjectLogViewer
        projectId={projectId}
        projectName={project?.name}
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
        onImageGenerated={handleImageGenerated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteImage}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <ProjectDetailContent />
    </Suspense>
  );
}
