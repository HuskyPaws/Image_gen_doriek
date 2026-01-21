'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { GenerationLogEntry, GeneratedImage, GenerationSettings } from '@/lib/types';
import { getGenerationLogsByProject, getGenerationLogs, saveGenerationLogs, addImage, getImagesByProject } from '@/lib/storage';
import { generateImageWithFallback } from '@/lib/api';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  Calendar,
  Clock,
  Hash,
  AlertTriangle,
  Filter,
  RefreshCw,
  Edit,
  Play
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectLogViewerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  onImageGenerated?: (image: GeneratedImage) => void;
}

type LogFilter = 'all' | 'success' | 'failed' | 'fallback';
type LogSort = 'newest' | 'oldest' | 'session' | 'status';

// Helper function to calculate correct timestamp for retry attempts
async function calculateCorrectTimestamp(attemptNumber: number, projectId: string): Promise<string> {
  const allLogs = await getGenerationLogsByProject(projectId);
  const successfulLogs = allLogs
    .filter(log => log.status === 'success' && log.generatedImage)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);

  if (successfulLogs.length === 0) {
    // No successful images yet, use current time
    return new Date().toISOString();
  }

  // Find the successful attempts before and after this attempt number
  const beforeAttempt = successfulLogs
    .filter(log => log.attemptNumber < attemptNumber)
    .sort((a, b) => b.attemptNumber - a.attemptNumber)[0]; // Closest before

  const afterAttempt = successfulLogs
    .filter(log => log.attemptNumber > attemptNumber)
    .sort((a, b) => a.attemptNumber - b.attemptNumber)[0]; // Closest after

  if (beforeAttempt && afterAttempt) {
    // Interpolate between the two timestamps
    const beforeTime = new Date(beforeAttempt.generatedImage!.createdAt).getTime();
    const afterTime = new Date(afterAttempt.generatedImage!.createdAt).getTime();
    const interpolatedTime = beforeTime + ((afterTime - beforeTime) * (attemptNumber - beforeAttempt.attemptNumber) / (afterAttempt.attemptNumber - beforeAttempt.attemptNumber));
    return new Date(interpolatedTime).toISOString();
  } else if (beforeAttempt && !afterAttempt) {
    // Place after the last successful attempt
    const beforeTime = new Date(beforeAttempt.generatedImage!.createdAt).getTime();
    const timeDiff = (attemptNumber - beforeAttempt.attemptNumber) * 60000; // 1 minute per attempt difference
    return new Date(beforeTime + timeDiff).toISOString();
  } else if (!beforeAttempt && afterAttempt) {
    // Place before the first successful attempt
    const afterTime = new Date(afterAttempt.generatedImage!.createdAt).getTime();
    const timeDiff = (afterAttempt.attemptNumber - attemptNumber) * 60000; // 1 minute per attempt difference
    return new Date(afterTime - timeDiff).toISOString();
  } else {
    // Fallback to current time
    return new Date().toISOString();
  }
}

// Log entry row component
interface LogEntryRowProps {
  log: GenerationLogEntry;
  onImageClick: (url: string, prompt: string) => void;
  onRetryClick: (log: GenerationLogEntry) => void;
  showSession: boolean;
}

function LogEntryRow({ log, onImageClick, onRetryClick, showSession }: LogEntryRowProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Status */}
        <div className="col-span-2">
          <Badge 
            variant={log.status === 'success' ? 'default' : 'destructive'}
            className="flex items-center gap-1 w-fit"
          >
            {log.status === 'success' ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {log.status === 'success' ? 'Success' : 'Failed'}
          </Badge>
          <div className="flex gap-1 mt-1">
            {log.wasFallback && (
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="h-2 w-2 mr-1" />
                Fallback
              </Badge>
            )}
            {showSession && (
              <Badge variant="outline" className="text-xs">
                <Hash className="h-2 w-2 mr-1" />
                {log.sessionId.slice(-4)}
              </Badge>
            )}
          </div>
        </div>

        {/* Prompt */}
        <div className="col-span-4">
          <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
            {log.prompt}
          </p>
          {log.error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1 rounded">
              {log.error}
            </p>
          )}
        </div>

        {/* Image */}
        <div className="col-span-3">
          {log.status === 'success' && log.generatedImage ? (
            <div className="space-y-2">
              <div className="relative group">
                <img
                  src={log.generatedImage.url}
                  alt={`Generated image for attempt ${log.attemptNumber}`}
                  className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onImageClick(log.generatedImage!.url, log.prompt)}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded">
                  <Eye className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded flex flex-col items-center justify-center gap-1">
              <XCircle className="h-6 w-6 text-slate-400" />
              <Button
                onClick={() => onRetryClick(log)}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Model & Metadata */}
        <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <div className="font-medium">{log.modelUsed}</div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(log.createdAt).toLocaleTimeString()}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(log.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Attempt Number */}
        <div className="col-span-1 text-center">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            #{log.attemptNumber}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProjectLogViewer({ projectId, isOpen, onClose, projectName, onImageGenerated }: ProjectLogViewerProps) {
  const [logs, setLogs] = useState<GenerationLogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [sort, setSort] = useState<LogSort>('newest');
  const [enlargedImage, setEnlargedImage] = useState<{url: string; prompt: string} | null>(null);
  const [retryLog, setRetryLog] = useState<GenerationLogEntry | null>(null);
  const [retryPrompt, setRetryPrompt] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Load logs function
  const loadLogs = useCallback(() => {
    (async () => {
      const projectLogs = await getGenerationLogsByProject(projectId);
      setLogs(projectLogs);
    })();
  }, [projectId]);

  // Load logs when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, projectId, loadLogs]);

  // Filter and sort logs
  const getFilteredAndSortedLogs = () => {
    let filteredLogs = [...logs];

    // Apply filter
    switch (filter) {
      case 'success':
        filteredLogs = filteredLogs.filter(log => log.status === 'success');
        break;
      case 'failed':
        filteredLogs = filteredLogs.filter(log => log.status === 'failed');
        break;
      case 'fallback':
        filteredLogs = filteredLogs.filter(log => log.wasFallback);
        break;
    }

    // Apply sort
    switch (sort) {
      case 'newest':
        filteredLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filteredLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'session':
        filteredLogs.sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.attemptNumber - b.attemptNumber);
        break;
      case 'status':
        filteredLogs.sort((a, b) => {
          if (a.status === b.status) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.status === 'success' ? -1 : 1;
        });
        break;
    }

    return filteredLogs;
  };

  const sortedLogs = getFilteredAndSortedLogs();
  const totalLogs = logs.length;
  const successCount = logs.filter(log => log.status === 'success').length;
  const failureCount = logs.filter(log => log.status === 'failed').length;
  const fallbackCount = logs.filter(log => log.wasFallback).length;

  // Group logs by session for better visualization
  const sessionGroups = sortedLogs.reduce((groups, log) => {
    if (!groups[log.sessionId]) {
      groups[log.sessionId] = [];
    }
    groups[log.sessionId].push(log);
    return groups;
  }, {} as Record<string, GenerationLogEntry[]>);

  function handleImageClick(imageUrl: string, prompt: string) {
    setEnlargedImage({ url: imageUrl, prompt });
  }

  function handleRetryClick(log: GenerationLogEntry) {
    setRetryLog(log);
    setRetryPrompt(log.prompt);
  }

  async function handleRetryGeneration() {
    if (!retryLog || !retryPrompt.trim()) return;

    setIsRetrying(true);

    try {
      // Use the same settings as the original attempt
      const settings: GenerationSettings = {
        model: retryLog.modelUsed,
        aspectRatio: '1:1', // Default, could be made configurable
        numImages: 1,
        promptOptimizer: true,
        enableFallback: true,
        openaiBackground: 'auto',
        openaiQuality: 'auto',
        openaiOutputFormat: 'png',
        guidanceScale: 2.5,
      };

      const result = await generateImageWithFallback({
        prompt: retryPrompt,
        settings,
      });

      if (result.data?.images?.length > 0) {
        const falImage = result.data.images[0];
        
        // Calculate the correct timestamp to maintain position based on attempt number
        const correctTimestamp = await calculateCorrectTimestamp(retryLog.attemptNumber, projectId);
        
        const generatedImage: GeneratedImage = {
          id: crypto.randomUUID(),
          projectId,
          prompt: retryPrompt,
          url: falImage.url,
          fileName: falImage.file_name,
          fileSize: falImage.file_size,
          contentType: falImage.content_type,
          createdAt: correctTimestamp,
          aspectRatio: settings.aspectRatio,
          requestId: result.requestId,
          modelUsed: result.modelUsed,
          wasFallback: result.wasFallback,
        };

        // Update the existing log entry to success
        const updatedLog: GenerationLogEntry = {
          ...retryLog,
          prompt: retryPrompt,
          status: 'success',
          generatedImage,
          modelUsed: result.modelUsed,
          wasFallback: result.wasFallback,
          error: undefined,
          createdAt: new Date().toISOString(),
        };

        // Update logs in storage
        const allLogs = await getGenerationLogs();
        const logIndex = allLogs.findIndex(l => l.id === retryLog.id);
        if (logIndex !== -1) {
          allLogs[logIndex] = updatedLog;
          await saveGenerationLogs(allLogs);
        }

        // Also add the image to the main images list
        if (onImageGenerated) {
          addImage(generatedImage);
          onImageGenerated(generatedImage);
        }

        // Reload logs to reflect changes
        loadLogs();
        setRetryLog(null);
        setRetryPrompt('');
      }
    } catch (error) {
      console.error('Retry failed:', error);
      // Could show error message to user
    } finally {
      setIsRetrying(false);
    }
  }

  function exportProjectLog() {
    // Create CSV header
    const csvHeaders = [
      'Attempt Number',
      'Timestamp',
      'Status',
      'Model Used',
      'Fallback',
      'Prompt',
      'Error',
      'Session ID'
    ];

    // Convert logs to CSV rows
    const csvRows = logs
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
      .map(log => [
        log.attemptNumber,
        new Date(log.createdAt).toLocaleString(),
        log.status,
        log.modelUsed,
        log.wasFallback ? 'Yes' : 'No',
        `"${log.prompt.replace(/"/g, '""')}"`, // Escape quotes in prompt
        log.error ? `"${log.error.replace(/"/g, '""')}"` : '',
        log.sessionId.slice(-8)
      ]);

    // Combine header and rows
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    // Add project summary as comments
    const summary = [
      `# Project: ${projectName || 'Unknown Project'}`,
      `# Export Date: ${new Date().toLocaleString()}`,
      `# Total Attempts: ${totalLogs} (${successCount} successful, ${failureCount} failed)`,
      `# Successful Generations: ${successCount}`,
      `# Failed Generations: ${failureCount}`,
      `# Fallbacks Used: ${fallbackCount}`,
      '#',
      ''
    ].join('\n');

    const fullCsvContent = summary + csvContent;
    
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(fullCsvContent);
    const exportFileDefaultName = `project-log-${projectName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function getSessionDisplayName(sessionId: string) {
    return `Session ${sessionId.slice(-8)}`;
  }

  // Load logs when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      loadLogs();
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Generation Log
              {projectName && <span className="text-slate-500">- {projectName}</span>}
            </DialogTitle>
            <DialogDescription>
              View all generation attempts for this project, including successful and failed generations.
            </DialogDescription>
          </DialogHeader>

          {/* Stats and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Success: {successCount}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Failed: {failureCount}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-amber-500" />
                Fallbacks: {fallbackCount}
              </Badge>
              <Badge variant="outline" className="font-semibold">
                Total Attempts: {totalLogs}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Select value={filter} onValueChange={(value) => setFilter(value as LogFilter)}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="fallback">Fallback</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sort} onValueChange={(value) => setSort(value as LogSort)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="session">By Session</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={exportProjectLog} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Separator />

          {/* Log Content */}
          <div className="flex-1 overflow-y-auto">
            {totalLogs === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No generation logs yet</h3>
                <p>Start generating images to see the activity log here.</p>
              </div>
            ) : sortedLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No logs match the current filter</h3>
                <p>Try adjusting your filter settings.</p>
              </div>
            ) : sort === 'session' ? (
              // Group by session view
              <div className="space-y-6">
                {Object.entries(sessionGroups).map(([sessionId, sessionLogs]) => (
                  <Card key={sessionId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        {getSessionDisplayName(sessionId)}
                        <Badge variant="outline" className="ml-auto">
                          {sessionLogs.length} attempts
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {sessionLogs.map((log) => (
                          <LogEntryRow 
                            key={log.id} 
                            log={log} 
                            onImageClick={handleImageClick}
                            onRetryClick={handleRetryClick}
                            showSession={false}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Flat list view
              <div className="space-y-3">
                {sortedLogs.map((log) => (
                  <LogEntryRow 
                    key={log.id} 
                    log={log} 
                    onImageClick={handleImageClick}
                    onRetryClick={handleRetryClick}
                    showSession={true}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Generated Image</DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <img
                  src={enlargedImage.url}
                  alt="Enlarged generated image"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Prompt:
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {enlargedImage.prompt}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEnlargedImage(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Retry Generation Modal */}
      {retryLog && (
        <Dialog open={!!retryLog} onOpenChange={() => setRetryLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Retry Generation #{retryLog.attemptNumber}
              </DialogTitle>
              <DialogDescription>
                Modify the prompt and regenerate this failed attempt. The new image will keep the same attempt number.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Original Error:</label>
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded mt-1">
                  {retryLog.error}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Model:</label>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {retryLog.modelUsed}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Prompt:</label>
                <Textarea
                  value={retryPrompt}
                  onChange={(e) => setRetryPrompt(e.target.value)}
                  className="mt-1 min-h-[100px]"
                  placeholder="Enter your modified prompt..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRetryLog(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRetryGeneration}
                disabled={!retryPrompt.trim() || isRetrying}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRetrying ? 'Generating...' : 'Retry Generation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 