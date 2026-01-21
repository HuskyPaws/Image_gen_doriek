'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ChunkKeywords, WikimediaImage, SelectedStockImage } from '@/lib/types';
import { 
  searchWithLicenseFilter, 
  generateAttribution,
  getCommonsPageUrl,
  downloadImage
} from '@/lib/wikimedia-api';
import { 
  ArrowLeft, 
  Search, 
  Download, 
  CheckCircle, 
  Loader2, 
  ExternalLink,
  Image as ImageIcon,
  Tags,
  X,
  RefreshCw,
  Info,
  Check,
  Globe,
  Archive
} from 'lucide-react';

interface SearchStats {
  totalFound: number;
  pdCount: number;
  ccCount: number;
}

export default function StockImageFinderPage() {
  const [keywords, setKeywords] = useState<ChunkKeywords[]>([]);
  const [manualKeywords, setManualKeywords] = useState('');
  const [searchResults, setSearchResults] = useState<Map<string, WikimediaImage[]>>(new Map());
  const [searchStats, setSearchStats] = useState<Map<string, SearchStats>>(new Map());
  const [selectedImages, setSelectedImages] = useState<Map<number, SelectedStockImage>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });
  const [activeKeywordIndex, setActiveKeywordIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<WikimediaImage | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [includeCC, setIncludeCC] = useState(false);  // Toggle for CC-licensed images

  // Load keywords from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('stockFinderKeywords');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setKeywords(parsed);
        sessionStorage.removeItem('stockFinderKeywords');
      } catch (error) {
        console.error('Failed to parse stored keywords:', error);
      }
    }
  }, []);

  // Parse manual keywords input
  function parseManualKeywords(): string[] {
    return manualKeywords
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  // Search for a single keyword
  async function handleSearchSingle(keyword: string, chunkId: number) {
    setIsSearching(true);
    setActiveKeywordIndex(chunkId);
    
    try {
      const { images, totalFound, pdCount, ccCount } = await searchWithLicenseFilter(keyword, { 
        limit: 12, 
        includeCC 
      });
      
      const key = `${chunkId}-${keyword}`;
      setSearchResults(prev => {
        const next = new Map(prev);
        next.set(key, images);
        return next;
      });
      setSearchStats(prev => {
        const next = new Map(prev);
        next.set(key, { totalFound, pdCount, ccCount });
        return next;
      });
    } catch (error) {
      console.error('Search failed:', error);
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
      setActiveKeywordIndex(null);
    }
  }

  // Search all keywords
  async function handleSearchAll() {
    if (keywords.length === 0) return;
    
    setIsSearching(true);
    setSearchProgress({ current: 0, total: keywords.length });
    
    try {
      const newResults = new Map<string, WikimediaImage[]>();
      const newStats = new Map<string, SearchStats>();
      
      // Process keywords in batches
      const BATCH_SIZE = 3;
      for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
        const batch = keywords.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (kw) => {
            const result = await searchWithLicenseFilter(kw.primaryKeyword, { 
              limit: 12, 
              includeCC 
            });
            return { kw, result };
          })
        );
        
        for (const { kw, result } of batchResults) {
          const key = `${kw.chunkId}-${kw.primaryKeyword}`;
          newResults.set(key, result.images);
          newStats.set(key, { 
            totalFound: result.totalFound, 
            pdCount: result.pdCount, 
            ccCount: result.ccCount 
          });
        }
        
        setSearchProgress({ current: Math.min(i + BATCH_SIZE, keywords.length), total: keywords.length });
        
        // Small delay between batches
        if (i + BATCH_SIZE < keywords.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      setSearchResults(newResults);
      setSearchStats(newStats);
    } catch (error) {
      console.error('Search all failed:', error);
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
      setSearchProgress({ current: 0, total: 0 });
    }
  }

  // Search from manual input
  async function handleSearchManual() {
    const queries = parseManualKeywords();
    if (queries.length === 0) return;
    
    setIsSearching(true);
    setSearchProgress({ current: 0, total: queries.length });
    
    try {
      const newResults = new Map<string, WikimediaImage[]>();
      const newStats = new Map<string, SearchStats>();
      
      // Process in batches
      const BATCH_SIZE = 3;
      for (let i = 0; i < queries.length; i += BATCH_SIZE) {
        const batch = queries.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (query, batchIdx) => {
            const result = await searchWithLicenseFilter(query, { 
              limit: 12, 
              includeCC 
            });
            return { query, idx: i + batchIdx, result };
          })
        );
        
        for (const { query, idx, result } of batchResults) {
          const key = `manual-${idx}-${query}`;
          newResults.set(key, result.images);
          newStats.set(key, { 
            totalFound: result.totalFound, 
            pdCount: result.pdCount, 
            ccCount: result.ccCount 
          });
        }
        
        setSearchProgress({ current: Math.min(i + BATCH_SIZE, queries.length), total: queries.length });
        
        if (i + BATCH_SIZE < queries.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      setSearchResults(prev => {
        const merged = new Map(prev);
        newResults.forEach((value, key) => merged.set(key, value));
        return merged;
      });
      setSearchStats(prev => {
        const merged = new Map(prev);
        newStats.forEach((value, key) => merged.set(key, value));
        return merged;
      });
    } catch (error) {
      console.error('Manual search failed:', error);
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
      setSearchProgress({ current: 0, total: 0 });
    }
  }

  // Select an image for a keyword
  function handleSelectImage(chunkId: number, keyword: string, image: WikimediaImage) {
    setSelectedImages(prev => {
      const next = new Map(prev);
      next.set(chunkId, {
        chunkId,
        keyword,
        image,
        selectedAt: new Date().toISOString(),
      });
      return next;
    });
  }

  // Deselect an image
  function handleDeselectImage(chunkId: number) {
    setSelectedImages(prev => {
      const next = new Map(prev);
      next.delete(chunkId);
      return next;
    });
  }

  // Select first image for all chunks that have search results
  function handleSelectFirstForAll() {
    const newSelections = new Map(selectedImages);
    
    for (const kw of keywords) {
      const results = getResultsForKeyword(kw.chunkId, kw.primaryKeyword);
      if (results.length > 0 && !newSelections.has(kw.chunkId)) {
        newSelections.set(kw.chunkId, {
          chunkId: kw.chunkId,
          keyword: kw.primaryKeyword,
          image: results[0],
          selectedAt: new Date().toISOString(),
        });
      }
    }
    
    setSelectedImages(newSelections);
  }

  // Count how many chunks have search results but no selection
  function countChunksWithUnselectedResults(): number {
    let count = 0;
    for (const kw of keywords) {
      const results = getResultsForKeyword(kw.chunkId, kw.primaryKeyword);
      if (results.length > 0 && !selectedImages.has(kw.chunkId)) {
        count++;
      }
    }
    return count;
  }

  // Download all selected images as ZIP with sequential naming (001, 002, etc.)
  async function handleDownloadSelected() {
    if (selectedImages.size === 0) {
      alert('No images selected');
      return;
    }
    
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: selectedImages.size });
    
    try {
      const zip = new JSZip();
      const folder = zip.folder('stock-images');
      
      if (!folder) {
        throw new Error('Failed to create ZIP folder');
      }

      // Sort selections by chunkId
      const sortedSelections = Array.from(selectedImages.entries())
        .sort((a, b) => a[0] - b[0]);

      // CSV header - matching AI image export format
      const csvRows: string[] = ['NR,Image Prompt,Related Script Text'];
      
      // Download each image
      for (let i = 0; i < sortedSelections.length; i++) {
        const [chunkId, selection] = sortedSelections[i];
        const { image, keyword } = selection;
        
        setDownloadProgress({ current: i + 1, total: sortedSelections.length });

        try {
          // Download the image
          const blob = await downloadImage(image.fullUrl);
          
          // Sequential naming: 001, 002, 003...
          const seq = String(i + 1).padStart(3, '0');
          
          // Get file extension from URL or title
          const urlParts = image.fullUrl.split('.');
          const ext = urlParts[urlParts.length - 1].split('?')[0].toLowerCase() || 'jpg';
          const filename = `${seq}.${ext}`;
          
          // Add to ZIP
          folder.file(filename, blob);

          // Find the original script text for this chunk
          const chunkKeyword = keywords.find(kw => kw.chunkId === chunkId);
          const originalText = chunkKeyword?.originalText || '';
          
          // Escape CSV fields
          const escapeCSV = (str: string) => `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
          
          // Create image prompt/description from keyword and image info
          const imagePrompt = `Stock image: ${keyword} - ${image.title.replace(/^File:/, '')}`;
          
          // Add CSV row - matching AI image export format: NR, Image Prompt, Related Script Text
          csvRows.push([
            `"${i + 1}"`,
            escapeCSV(imagePrompt),
            escapeCSV(originalText)
          ].join(','));

        } catch (error) {
          console.error(`Failed to download image for chunk ${chunkId}:`, error);
        }
        
        // Small delay between downloads to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Add CSV file to ZIP
      const csvContent = csvRows.join('\n');
      folder.file('script-prompts.csv', csvContent);

      // Add attribution text file
      const attributionText = `Stock Image Attributions
${'='.repeat(60)}
Generated: ${new Date().toISOString()}
Total Images: ${sortedSelections.length}

Note: These images are from Wikimedia Commons. 
Public Domain images have no restrictions.
CC-licensed images require attribution when used.

${'='.repeat(60)}
MAPPING (Image Number → Chunk → Keyword)
${'='.repeat(60)}

${sortedSelections.map(([chunkId, selection], i) => {
  const seq = String(i + 1).padStart(3, '0');
  return `${seq} → Chunk ${chunkId} → "${selection.keyword}"
   ${generateAttribution(selection.image)}
   ${getCommonsPageUrl(selection.image)}`;
}).join('\n\n')}
`;
      folder.file('attributions.txt', attributionText);

      // Generate and download the ZIP file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `stock-images-${timestamp}.zip`);
      
      alert(`Downloaded ${sortedSelections.length} images as ZIP!\n\nContents:\n- Images named 001.jpg, 002.jpg, etc.\n- image-mapping.csv (for DaVinci/editing)\n- attributions.txt`);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  }

  // Get results for a specific keyword
  function getResultsForKeyword(chunkId: number, keyword: string): WikimediaImage[] {
    return searchResults.get(`${chunkId}-${keyword}`) || [];
  }

  const hasKeywords = keywords.length > 0;
  const hasResults = searchResults.size > 0;
  const selectedCount = selectedImages.size;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-100">Stock Image Finder</h1>
          </div>
          <p className="text-slate-400 mt-2">
            Search Wikimedia Commons for public domain images - no restrictions, no attribution required
          </p>
        </div>
      </div>

      {/* Info Alert with License Toggle */}
      <Alert className={includeCC ? "bg-amber-950 border-amber-800" : "bg-green-950 border-green-800"}>
        <Globe className={`h-4 w-4 ${includeCC ? 'text-amber-400' : 'text-green-400'}`} />
        <AlertDescription className="text-sm">
          <div className="flex items-center justify-between">
            <div className={includeCC ? 'text-amber-300' : 'text-green-300'}>
              {includeCC ? (
                <>
                  <strong>Including CC-Licensed Images:</strong> Showing Public Domain + Creative Commons images. 
                  <span className="text-amber-400"> CC images require attribution when used.</span>
                </>
              ) : (
                <>
                  <strong>Public Domain Only:</strong> Only showing images with no copyright restrictions. 
                  You can use these images freely without attribution.
                </>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer ml-4 shrink-0">
              <input
                type="checkbox"
                checked={includeCC}
                onChange={(e) => setIncludeCC(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-xs text-slate-300 whitespace-nowrap">Include CC images</span>
            </label>
          </div>
        </AlertDescription>
      </Alert>

      {/* Keywords from Script Chunker */}
      {hasKeywords && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-cyan-500" />
              Keywords from Script Chunker
            </CardTitle>
            <CardDescription>
              {keywords.length} keyword sets loaded. Search for images matching each chunk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSearchAll}
                disabled={isSearching}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search All Keywords
                  </>
                )}
              </Button>

              {/* Select First for All button - only show when there are results */}
              {hasResults && countChunksWithUnselectedResults() > 0 && (
                <Button
                  onClick={handleSelectFirstForAll}
                  variant="outline"
                  className="border-purple-500 text-purple-400 hover:bg-purple-950"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Select First for All ({countChunksWithUnselectedResults()})
                </Button>
              )}
              
              {selectedCount > 0 && (
                <Button
                  onClick={handleDownloadSelected}
                  disabled={isDownloading}
                  variant="outline"
                  className="border-green-500 text-green-400 hover:bg-green-950"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {downloadProgress.total > 0 
                        ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...`
                        : 'Preparing ZIP...'}
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Export {selectedCount} as ZIP
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Search Progress */}
            {isSearching && searchProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cyan-300">Searching Wikimedia Commons...</span>
                  <span className="text-cyan-400 font-bold">
                    {searchProgress.current} / {searchProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(searchProgress.current / searchProgress.total) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Keyword List with Results */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {keywords.map((kw) => {
                const results = getResultsForKeyword(kw.chunkId, kw.primaryKeyword);
                const selected = selectedImages.get(kw.chunkId);
                const isActive = activeKeywordIndex === kw.chunkId;
                
                return (
                  <div key={kw.chunkId} className="border border-slate-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-cyan-600">Chunk {kw.chunkId}</Badge>
                        <Badge variant="secondary">{kw.primaryKeyword}</Badge>
                        {selected && (
                          <Badge className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSearchSingle(kw.primaryKeyword, kw.chunkId)}
                        disabled={isSearching}
                      >
                        {isActive ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {results.length > 0 ? 'Refresh' : 'Search'}
                      </Button>
                    </div>

                    {/* All keywords for this chunk */}
                    <div className="flex flex-wrap gap-1">
                      {kw.keywords.map((keyword, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-slate-700"
                          onClick={() => handleSearchSingle(keyword, kw.chunkId)}
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>

                    {/* Search Results Grid */}
                    {results.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {results.map((image) => {
                          const isSelected = selected?.image.pageid === image.pageid;
                          
                          return (
                            <div 
                              key={image.pageid}
                              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected 
                                  ? 'border-green-500 ring-2 ring-green-500/50' 
                                  : 'border-transparent hover:border-cyan-500'
                              }`}
                              onClick={() => handleSelectImage(kw.chunkId, kw.primaryKeyword, image)}
                            >
                              <img
                                src={image.thumbnailUrl}
                                alt={image.title}
                                className="w-full h-24 object-cover"
                                loading="lazy"
                              />
                              
                              {/* Overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(image);
                                  }}
                                >
                                  <Info className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              </div>
                              
                              {/* Selected indicator */}
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                              
                              {/* License badge */}
                              <div className="absolute bottom-1 left-1">
                                <Badge className={`text-xs px-1 py-0 ${
                                  image.licenseType === 'pd' 
                                    ? 'bg-green-600/80' 
                                    : 'bg-amber-600/80'
                                }`}>
                                  {image.licenseType === 'pd' ? 'PD' : 'CC'}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* No results message with stats */}
                    {results.length === 0 && searchResults.has(`${kw.chunkId}-${kw.primaryKeyword}`) && (
                      <div className="text-sm text-slate-500 space-y-1">
                        {(() => {
                          const stats = searchStats.get(`${kw.chunkId}-${kw.primaryKeyword}`);
                          if (stats && stats.totalFound > 0) {
                            return (
                              <div className="p-3 bg-amber-950/50 border border-amber-800 rounded-lg">
                                <p className="text-amber-300">
                                  Found {stats.totalFound} images, but {stats.pdCount === 0 ? 'none' : `only ${stats.pdCount}`} are Public Domain.
                                  {stats.ccCount > 0 && !includeCC && (
                                    <span className="text-amber-400"> ({stats.ccCount} are CC-licensed - enable "Include CC images" above to see them)</span>
                                  )}
                                </p>
                              </div>
                            );
                          }
                          return <p className="italic">No images found for "{kw.primaryKeyword}". Try a different keyword.</p>;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Keywords Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            Manual Search
          </CardTitle>
          <CardDescription>
            Enter keywords manually to search for public domain images (one per line)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter search keywords (one per line)...&#10;&#10;Examples:&#10;medieval castle&#10;Byzantine emperor&#10;WW2 soldier"
            value={manualKeywords}
            onChange={(e) => setManualKeywords(e.target.value)}
            className="min-h-[150px] resize-y font-mono text-sm"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleSearchManual}
              disabled={isSearching || parseManualKeywords().length === 0}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search {parseManualKeywords().length} Keywords
                </>
              )}
            </Button>
            
            {manualKeywords && (
              <Button
                variant="outline"
                onClick={() => setManualKeywords('')}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Manual Search Results */}
          {Array.from(searchResults.entries())
            .filter(([key]) => key.startsWith('manual-'))
            .map(([key, images]) => {
              const parts = key.split('-');
              const query = parts.slice(2).join('-');
              
              return (
                <div key={key} className="border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{query}</Badge>
                    <span className="text-sm text-slate-400">{images.length} results</span>
                  </div>
                  
                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {images.map((image) => (
                        <div 
                          key={image.pageid}
                          className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
                          onClick={() => setPreviewImage(image)}
                        >
                          <img
                            src={image.thumbnailUrl}
                            alt={image.title}
                            className="w-full h-24 object-cover"
                            loading="lazy"
                          />
                          <div className="absolute bottom-1 left-1">
                            <Badge className={`text-xs px-1 py-0 ${
                              image.licenseType === 'pd' 
                                ? 'bg-green-600/80' 
                                : 'bg-amber-600/80'
                            }`}>
                              {image.licenseType === 'pd' ? 'PD' : 'CC'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      const stats = searchStats.get(key);
                      if (stats && stats.totalFound > 0) {
                        return (
                          <div className="p-3 bg-amber-950/50 border border-amber-800 rounded-lg">
                            <p className="text-amber-300 text-sm">
                              Found {stats.totalFound} images, but {stats.pdCount === 0 ? 'none' : `only ${stats.pdCount}`} are Public Domain.
                              {stats.ccCount > 0 && !includeCC && (
                                <span className="text-amber-400"> ({stats.ccCount} CC-licensed - enable "Include CC images" to see them)</span>
                              )}
                            </p>
                          </div>
                        );
                      }
                      return <p className="text-sm text-slate-500 italic">No images found for "{query}"</p>;
                    })()
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Selected Images Summary */}
      {selectedCount > 0 && (
        <Card className="border-2 border-green-500 bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              Selected Images ({selectedCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Array.from(selectedImages.values()).map((selection) => (
                <div 
                  key={selection.chunkId}
                  className="relative group"
                >
                  <img
                    src={selection.image.thumbnailUrl}
                    alt={selection.image.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <Badge className="absolute -top-2 -left-2 bg-cyan-600">
                    {selection.chunkId}
                  </Badge>
                  <button
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeselectImage(selection.chunkId)}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
            
            <Button
              onClick={handleDownloadSelected}
              disabled={isDownloading}
              className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {downloadProgress.total > 0 
                    ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...`
                    : 'Preparing ZIP...'}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Export as ZIP (001, 002, ... + CSV)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Details
            </DialogTitle>
            <DialogDescription className={previewImage?.licenseType === 'cc' ? 'text-amber-400' : ''}>
              {previewImage?.licenseType === 'pd' 
                ? 'Public Domain - No restrictions' 
                : 'Creative Commons - Attribution required when used'}
            </DialogDescription>
          </DialogHeader>
          
          {previewImage && (
            <div className="space-y-4">
              <img
                src={previewImage.thumbnailUrl}
                alt={previewImage.title}
                className="w-full max-h-[400px] object-contain rounded-lg bg-slate-900"
              />
              
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-100">
                  {previewImage.title.replace(/^File:/, '')}
                </h3>
                
                {previewImage.description && (
                  <p className="text-sm text-slate-400">{previewImage.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Badge className={previewImage.licenseType === 'pd' ? 'bg-green-600' : 'bg-amber-600'}>
                    {previewImage.license || 'Public Domain'}
                  </Badge>
                  <Badge variant="secondary">{previewImage.width} × {previewImage.height}</Badge>
                  {previewImage.author && (
                    <Badge variant="outline">By: {previewImage.author}</Badge>
                  )}
                </div>
                
                {previewImage.licenseType === 'cc' && (
                  <div className="p-2 bg-amber-950/50 border border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-300">
                      ⚠️ This image requires attribution when used. Copy the attribution text below.
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-slate-500 bg-slate-800 p-2 rounded">
                  {generateAttribution(previewImage)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(getCommonsPageUrl(previewImage), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Wikimedia
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const blob = await downloadImage(previewImage.fullUrl);
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = previewImage.title.replace(/^File:/, '');
                      link.click();
                      URL.revokeObjectURL(url);
                    } catch (error) {
                      alert('Download failed');
                    }
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Size
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

