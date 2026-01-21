'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Separator } from '@/components/ui/separator';
import { GenerationLogEntry } from '@/lib/types';
import { useEffect } from 'react';
import { getGenerationLogsBySession } from '@/lib/storage';
import { FileText, CheckCircle, XCircle, Eye, Download } from 'lucide-react';

interface GenerationLogSheetProps {
  logs: GenerationLogEntry[];
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export function GenerationLogSheet({ logs, isOpen, onClose, sessionId }: GenerationLogSheetProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{url: string; prompt: string} | null>(null);
  const [resolvedLogs, setResolvedLogs] = useState<GenerationLogEntry[]>(logs);

  useEffect(() => {
    if (!isOpen) return;
    if (sessionId) {
      (async () => {
        const sessionLogs = await getGenerationLogsBySession(sessionId);
        setResolvedLogs(sessionLogs);
      })();
    } else {
      setResolvedLogs(logs);
    }
  }, [isOpen, sessionId, logs]);

  // Filter logs by session if sessionId is provided
  const filteredLogs = resolvedLogs;

  // Sort logs by attempt number
  const sortedLogs = [...filteredLogs].sort((a, b) => a.attemptNumber - b.attemptNumber);

  const successCount = sortedLogs.filter(log => log.status === 'success').length;
  const failureCount = sortedLogs.filter(log => log.status === 'failed').length;

  function handleImageClick(imageUrl: string, prompt: string) {
    setEnlargedImage({ url: imageUrl, prompt });
  }

  function handleDownloadImage(imageUrl: string, fileName: string) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.click();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generation Log {sessionId && `- Session ${sessionId.slice(-8)}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Success: {successCount}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              Failed: {failureCount}
            </Badge>
            <Badge variant="outline">
              Total: {sortedLogs.length}
            </Badge>
          </div>

          <div className="flex-1 pr-4 overflow-y-auto">
            {sortedLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No generation attempts recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedLogs.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Attempt Number */}
                      <div className="col-span-1 text-center">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          #{log.attemptNumber}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <Badge 
                          variant={log.status === 'success' ? 'default' : 'destructive'}
                          className="flex items-center gap-1"
                        >
                          {log.status === 'success' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.status === 'success' ? 'Success' : 'Failed'}
                        </Badge>
                        {log.wasFallback && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Fallback
                          </Badge>
                        )}
                      </div>

                      {/* Prompt */}
                      <div className="col-span-5">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                            Prompt:
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-800 rounded p-2 max-h-20 overflow-y-auto">
                            {log.prompt}
                          </div>
                        </div>
                        {log.error && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
                            <span className="font-medium">Error:</span> {log.error}
                          </div>
                        )}
                      </div>

                      {/* Image */}
                      <div className="col-span-3">
                        {log.status === 'success' && log.generatedImage ? (
                          <div className="space-y-2">
                            <div className="relative group">
                              <img
                                src={log.generatedImage.url}
                                alt={`Generated image ${log.attemptNumber}`}
                                className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handleImageClick(log.generatedImage!.url, log.prompt)}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleImageClick(log.generatedImage!.url, log.prompt)}
                                className="flex-1 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadImage(log.generatedImage!.url, log.generatedImage!.fileName)}
                                className="flex-1 text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Model & Timestamp */}
                      <div className="col-span-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="font-medium">{log.modelUsed}</div>
                        <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />
          
          <div className="flex justify-end gap-2 pt-4">
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
    </>
  );
} 