'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Shuffle, 
  Sun, 
  Moon, 
  Image as ImageIcon,
  Eye,
  EyeOff,
  User,
  LayoutGrid,
  LayoutList,
  Search,
  Loader2,
  Youtube
} from 'lucide-react';

// Types
interface VideoItem {
  id: string;
  thumbnail: string;
  title: string;
  channelName: string;
  channelAvatar?: string;
  views: string;
  uploadTime: string;
  duration: string;
  isYours: boolean;
}

// Default competitor videos for demonstration
const DEFAULT_COMPETITORS: Omit<VideoItem, 'id' | 'isYours'>[] = [
  {
    thumbnail: '',
    title: 'How I Made $10,000 in One Week',
    channelName: 'Finance Guru',
    views: '1.2M views',
    uploadTime: '2 days ago',
    duration: '12:34',
  },
  {
    thumbnail: '',
    title: 'The Ultimate Guide to Productivity',
    channelName: 'Life Hacks',
    views: '856K views',
    uploadTime: '1 week ago',
    duration: '18:22',
  },
  {
    thumbnail: '',
    title: '10 Things You Didn\'t Know About History',
    channelName: 'History Channel',
    views: '2.1M views',
    uploadTime: '3 days ago',
    duration: '21:05',
  },
  {
    thumbnail: '',
    title: 'This Changed Everything For Me',
    channelName: 'Creator Tips',
    views: '445K views',
    uploadTime: '5 days ago',
    duration: '15:47',
  },
];

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getYoutubeApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('youtube_api_key');
}

function formatViewCount(count: string): string {
  const num = parseInt(count);
  if (isNaN(num)) return count;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K views`;
  return `${num} views`;
}

function formatDuration(duration: string): string {
  // Parse ISO 8601 duration (e.g., PT1H2M3S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatUploadTime(publishedAt: string): string {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// YouTube-style video card for Homepage view
function HomepageVideoCard({ 
  video, 
  darkMode,
  showHighlight = true,
  onClick 
}: { 
  video: VideoItem; 
  darkMode: boolean;
  showHighlight?: boolean;
  onClick?: () => void;
}) {
  const [avatarError, setAvatarError] = useState(false);
  const textColor = darkMode ? 'text-white' : 'text-[#0f0f0f]';
  const mutedColor = darkMode ? 'text-[#aaa]' : 'text-[#606060]';
  const shouldHighlight = video.isYours && showHighlight;
  
  return (
    <div 
      className={`cursor-pointer group ${shouldHighlight ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800">
        {video.thumbnail ? (
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <ImageIcon className="w-12 h-12 text-slate-500" />
          </div>
        )}
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1 py-0.5 rounded">
          {video.duration}
        </div>
        {shouldHighlight && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            YOUR VIDEO
          </div>
        )}
      </div>
      
      {/* Video info */}
      <div className="flex gap-3 mt-3">
        {/* Channel avatar */}
        <div className="flex-shrink-0">
          {video.channelAvatar && !avatarError ? (
            <img 
              src={video.channelAvatar} 
              alt={video.channelName}
              className="w-9 h-9 rounded-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <User className={`w-5 h-5 ${mutedColor}`} />
            </div>
          )}
        </div>
        
        {/* Title and meta */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-sm leading-5 line-clamp-2 ${textColor}`}>
            {video.title}
          </h3>
          <p className={`text-sm mt-1 ${mutedColor}`}>
            {video.channelName}
          </p>
          <p className={`text-sm ${mutedColor}`}>
            {video.views} • {video.uploadTime}
          </p>
        </div>
      </div>
    </div>
  );
}

// YouTube-style video card for Sidebar/Recommended view
function SidebarVideoCard({ 
  video, 
  darkMode,
  showHighlight = true,
  onClick 
}: { 
  video: VideoItem; 
  darkMode: boolean;
  showHighlight?: boolean;
  onClick?: () => void;
}) {
  const textColor = darkMode ? 'text-white' : 'text-[#0f0f0f]';
  const mutedColor = darkMode ? 'text-[#aaa]' : 'text-[#606060]';
  const shouldHighlight = video.isYours && showHighlight;
  
  return (
    <div 
      className={`flex gap-2 cursor-pointer group ${shouldHighlight ? 'ring-2 ring-blue-500 rounded-lg p-1 -m-1' : ''}`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-[168px] aspect-video rounded-lg overflow-hidden bg-slate-800">
        {video.thumbnail ? (
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <ImageIcon className="w-8 h-8 text-slate-500" />
          </div>
        )}
        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
          {video.duration}
        </div>
        {shouldHighlight && (
          <div className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
            YOURS
          </div>
        )}
      </div>
      
      {/* Video info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className={`font-medium text-sm leading-5 line-clamp-2 ${textColor}`}>
          {video.title}
        </h3>
        <p className={`text-xs mt-1 ${mutedColor}`}>
          {video.channelName}
        </p>
        <p className={`text-xs ${mutedColor}`}>
          {video.views} • {video.uploadTime}
        </p>
      </div>
    </div>
  );
}

export default function ThumbnailTesterPage() {
  // Your video state
  const [yourThumbnail, setYourThumbnail] = useState<string>('');
  const [yourTitle] = useState('My Amazing Video Title');
  const [yourChannel, setYourChannel] = useState('My Channel');
  const [yourViews, setYourViews] = useState('0 views');
  const [yourUploadTime, setYourUploadTime] = useState('Just now');
  const [yourDuration, setYourDuration] = useState('10:00');
  
  // Multiple titles for A/B testing
  const [titleVariations, setTitleVariations] = useState<string[]>(['My Amazing Video Title']);
  const [activeTitleIndex, setActiveTitleIndex] = useState(0);
  
  // Competitor videos state
  const [competitors, setCompetitors] = useState<VideoItem[]>([]);
  
  // View state
  const [viewMode, setViewMode] = useState<'homepage' | 'sidebar'>('homepage');
  const [darkMode, setDarkMode] = useState(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [showYourVideoHighlight, setShowYourVideoHighlight] = useState(true);
  
  // YouTube search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchOrder, setSearchOrder] = useState<'relevance' | 'viewCount' | 'date'>('relevance');
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const competitorFileInputRef = useRef<HTMLInputElement>(null);
  const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);

  // Initialize with some default competitors
  useEffect(() => {
    const defaultVideos: VideoItem[] = DEFAULT_COMPETITORS.map(comp => ({
      ...comp,
      id: generateId(),
      isYours: false,
    }));
    setCompetitors(defaultVideos);
  }, []);

  // Update combined videos list whenever your video or competitors change
  useEffect(() => {
    const yourVideo: VideoItem = {
      id: 'yours',
      thumbnail: yourThumbnail,
      title: titleVariations[activeTitleIndex] || yourTitle,
      channelName: yourChannel,
      views: yourViews,
      uploadTime: yourUploadTime,
      duration: yourDuration,
      isYours: true,
    };
    
    setVideos([yourVideo, ...competitors]);
  }, [yourThumbnail, yourTitle, yourChannel, yourViews, yourUploadTime, yourDuration, competitors, titleVariations, activeTitleIndex]);

  function handleThumbnailUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setYourThumbnail(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleCompetitorThumbnailUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingCompetitorId) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setCompetitors(prev => prev.map(c => 
        c.id === editingCompetitorId 
          ? { ...c, thumbnail: e.target?.result as string }
          : c
      ));
      setEditingCompetitorId(null);
    };
    reader.readAsDataURL(file);
  }

  function addCompetitor() {
    const newCompetitor: VideoItem = {
      id: generateId(),
      thumbnail: '',
      title: 'Competitor Video Title',
      channelName: 'Channel Name',
      views: '100K views',
      uploadTime: '1 day ago',
      duration: '10:00',
      isYours: false,
    };
    setCompetitors(prev => [...prev, newCompetitor]);
  }

  function updateCompetitor(id: string, updates: Partial<VideoItem>) {
    setCompetitors(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function removeCompetitor(id: string) {
    setCompetitors(prev => prev.filter(c => c.id !== id));
  }

  function shuffleVideos() {
    setVideos(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }

  async function searchYouTubeVideos() {
    const apiKey = getYoutubeApiKey();
    if (!apiKey) {
      alert('Please add your YouTube Data API key in Settings to search videos.');
      return;
    }

    if (!searchKeyword.trim()) {
      alert('Please enter a search keyword.');
      return;
    }

    setIsSearching(true);

    try {
      // Step 1: Search for videos (fetch more to filter out Shorts)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchKeyword)}&type=video&maxResults=30&order=${searchOrder}&key=${apiKey}`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        throw new Error(errorData.error?.message || 'Failed to search videos');
      }
      
      const searchData = await searchResponse.json();
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

      if (!videoIds) {
        alert('No videos found for this keyword.');
        setIsSearching(false);
        return;
      }

      // Step 2: Get video details (views, duration)
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      
      if (!detailsResponse.ok) {
        const errorData = await detailsResponse.json();
        throw new Error(errorData.error?.message || 'Failed to get video details');
      }

      const detailsData = await detailsResponse.json();

      // Helper to get duration in seconds
      const getDurationSeconds = (duration: string): number => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        return hours * 3600 + minutes * 60 + seconds;
      };

      // Helper to check if video is a Short or too short (under 3 minutes)
      const isShortOrTooShort = (item: any): boolean => {
        const duration = getDurationSeconds(item.contentDetails.duration);
        const title = item.snippet.title.toLowerCase();
        const description = (item.snippet.description || '').toLowerCase();
        
        // Filter out if: under 3 minutes (180 seconds), has #shorts tag
        if (duration < 180) return true;
        if (title.includes('#shorts') || title.includes('#short')) return true;
        if (description.includes('#shorts') || description.includes('#short')) return true;
        
        return false;
      };

      // Step 3: Filter out Shorts and videos under 3 minutes
      const filteredVideos = detailsData.items.filter((item: any) => !isShortOrTooShort(item)).slice(0, 10);

      if (filteredVideos.length === 0) {
        alert('No videos found over 3 minutes. Try a different keyword.');
        setIsSearching(false);
        return;
      }

      // Step 4: Get channel icons
      const channelIds = [...new Set(filteredVideos.map((item: any) => item.snippet.channelId))].join(',');
      const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${apiKey}`;
      const channelsResponse = await fetch(channelsUrl);
      
      let channelAvatars: Record<string, string> = {};
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        channelAvatars = channelsData.items.reduce((acc: Record<string, string>, channel: any) => {
          // Try to get the best quality avatar, some URLs might be blocked
          const avatar = channel.snippet.thumbnails.medium?.url || 
                        channel.snippet.thumbnails.default?.url || 
                        channel.snippet.thumbnails.high?.url || '';
          acc[channel.id] = avatar;
          return acc;
        }, {});
      }

      // Step 5: Convert to our VideoItem format
      const newCompetitors: VideoItem[] = filteredVideos.map((item: any) => ({
        id: generateId(),
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        channelAvatar: channelAvatars[item.snippet.channelId] || '',
        views: formatViewCount(item.statistics.viewCount || '0'),
        uploadTime: formatUploadTime(item.snippet.publishedAt),
        duration: formatDuration(item.contentDetails.duration),
        isYours: false,
      }));

      // Replace existing competitors with search results
      setCompetitors(newCompetitors);

    } catch (error) {
      console.error('YouTube search failed:', error);
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  }

  function addTitleVariation() {
    setTitleVariations(prev => [...prev, `Title Variation ${prev.length + 1}`]);
  }

  function updateTitleVariation(index: number, value: string) {
    setTitleVariations(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function removeTitleVariation(index: number) {
    if (titleVariations.length <= 1) return;
    setTitleVariations(prev => prev.filter((_, i) => i !== index));
    if (activeTitleIndex >= titleVariations.length - 1) {
      setActiveTitleIndex(Math.max(0, titleVariations.length - 2));
    }
  }

  const bgColor = darkMode ? 'bg-[#0f0f0f]' : 'bg-[#f9f9f9]';
  const cardBg = darkMode ? 'bg-[#272727]' : 'bg-white';
  const borderColor = darkMode ? 'border-[#3f3f3f]' : 'border-[#e5e5e5]';

  return (
    <div className="min-h-screen">
      {/* Header with controls */}
      <div className="container mx-auto py-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-slate-100">Thumbnail Tester</h1>
            </div>
            <p className="text-slate-400 mt-2">
              Test how your thumbnail and title look among competitors
            </p>
          </div>
          
          {/* View Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'homepage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('homepage')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Homepage
            </Button>
            <Button
              variant={viewMode === 'sidebar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('sidebar')}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Sidebar
            </Button>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shuffleVideos}
              title="Shuffle video order"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant={showYourVideoHighlight ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowYourVideoHighlight(!showYourVideoHighlight)}
              title={showYourVideoHighlight ? 'Hide your video highlight' : 'Show your video highlight'}
            >
              {showYourVideoHighlight ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Your Video Settings */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Your Video
                </CardTitle>
                <CardDescription>Configure your thumbnail and title</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Thumbnail Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-video rounded-lg overflow-hidden bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors border-2 border-dashed border-slate-600 hover:border-blue-500"
                  >
                    {yourThumbnail ? (
                      <img src={yourThumbnail} alt="Your thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Click to upload</span>
                        <span className="text-xs text-slate-500">1280×720 recommended</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </div>

                {/* Title Variations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Title Variations</label>
                    <Button variant="ghost" size="sm" onClick={addTitleVariation}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {titleVariations.map((title, index) => (
                    <div key={index} className="flex gap-2">
                      <div 
                        className={`flex-shrink-0 w-6 h-8 flex items-center justify-center rounded cursor-pointer ${
                          activeTitleIndex === index 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                        onClick={() => setActiveTitleIndex(index)}
                      >
                        {index + 1}
                      </div>
                      <Input
                        value={title}
                        onChange={(e) => updateTitleVariation(index, e.target.value)}
                        placeholder="Enter title..."
                        className="flex-1"
                      />
                      {titleVariations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTitleVariation(index)}
                          className="px-2 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Other fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Channel Name</label>
                    <Input
                      value={yourChannel}
                      onChange={(e) => setYourChannel(e.target.value)}
                      placeholder="Channel name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Duration</label>
                    <Input
                      value={yourDuration}
                      onChange={(e) => setYourDuration(e.target.value)}
                      placeholder="10:00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Views</label>
                    <Input
                      value={yourViews}
                      onChange={(e) => setYourViews(e.target.value)}
                      placeholder="1M views"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Upload Time</label>
                    <Input
                      value={yourUploadTime}
                      onChange={(e) => setYourUploadTime(e.target.value)}
                      placeholder="2 days ago"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitors Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Competitors</CardTitle>
                  <Button variant="outline" size="sm" onClick={addCompetitor}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* YouTube Search */}
                <div className="p-3 bg-red-950/30 rounded-lg border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-400">Search YouTube</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Enter keyword..."
                      className="flex-1 h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSearching) {
                          searchYouTubeVideos();
                        }
                      }}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={searchYouTubeVideos}
                      disabled={isSearching || !searchKeyword.trim()}
                      className="bg-red-600 hover:bg-red-700 h-8"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <select
                    value={searchOrder}
                    onChange={(e) => setSearchOrder(e.target.value as any)}
                    className="w-full h-7 text-xs bg-slate-800 border border-slate-600 rounded px-2"
                  >
                    <option value="relevance">Sort: Most Relevant</option>
                    <option value="viewCount">Sort: Most Views</option>
                    <option value="date">Sort: Most Recent</option>
                  </select>
                  {!getYoutubeApiKey() && (
                    <p className="text-xs text-amber-400">
                      Add YouTube API key in Settings to enable search
                    </p>
                  )}
                </div>

                {/* Competitor List */}
                <div className="max-h-[300px] overflow-y-auto space-y-3">
                {competitors.map((comp) => (
                  <div key={comp.id} className="p-3 bg-slate-800 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      {/* Mini thumbnail */}
                      <div 
                        onClick={() => {
                          setEditingCompetitorId(comp.id);
                          competitorFileInputRef.current?.click();
                        }}
                        className="w-20 aspect-video rounded overflow-hidden bg-slate-700 cursor-pointer hover:opacity-80 flex-shrink-0"
                      >
                        {comp.thumbnail ? (
                          <img src={comp.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Upload className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input
                          value={comp.title}
                          onChange={(e) => updateCompetitor(comp.id, { title: e.target.value })}
                          placeholder="Video title"
                          className="h-7 text-xs mb-1"
                        />
                        <Input
                          value={comp.channelName}
                          onChange={(e) => updateCompetitor(comp.id, { channelName: e.target.value })}
                          placeholder="Channel"
                          className="h-7 text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCompetitor(comp.id)}
                        className="px-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={comp.views}
                        onChange={(e) => updateCompetitor(comp.id, { views: e.target.value })}
                        placeholder="Views"
                        className="h-6 text-xs"
                      />
                      <Input
                        value={comp.uploadTime}
                        onChange={(e) => updateCompetitor(comp.id, { uploadTime: e.target.value })}
                        placeholder="Time"
                        className="h-6 text-xs"
                      />
                      <Input
                        value={comp.duration}
                        onChange={(e) => updateCompetitor(comp.id, { duration: e.target.value })}
                        placeholder="Duration"
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                ))}
                <input
                  ref={competitorFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCompetitorThumbnailUpload}
                  className="hidden"
                />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            <Card className={`${bgColor} border ${borderColor} overflow-hidden`}>
              <CardHeader className={`pb-2 ${cardBg} border-b ${borderColor}`}>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg ${darkMode ? 'text-white' : 'text-black'}`}>
                    {viewMode === 'homepage' ? 'YouTube Homepage' : 'Recommended Videos'}
                  </CardTitle>
                  <Badge variant="secondary" className={darkMode ? 'bg-slate-700' : 'bg-slate-200'}>
                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className={`p-4 ${bgColor}`}>
                {viewMode === 'homepage' ? (
                  /* Homepage Grid View */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {videos.map((video) => (
                      <HomepageVideoCard 
                        key={video.id} 
                        video={video} 
                        darkMode={darkMode}
                        showHighlight={showYourVideoHighlight}
                      />
                    ))}
                  </div>
                ) : (
                  /* Sidebar/Recommended View */
                  <div className="flex gap-4">
                    {/* Main video player area (placeholder) */}
                    <div className="hidden xl:block w-[400px] flex-shrink-0">
                      <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
                        <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          Video Player Area
                        </span>
                      </div>
                      <div className="mt-3">
                        <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                          Currently Watching: Some Video
                        </h2>
                        <p className={`text-sm ${darkMode ? 'text-[#aaa]' : 'text-[#606060]'}`}>
                          100K views • 1 day ago
                        </p>
                      </div>
                    </div>
                    
                    {/* Sidebar recommendations */}
                    <div className="flex-1 space-y-2">
                      <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
                        Up next
                      </h3>
                      {videos.map((video) => (
                        <SidebarVideoCard 
                          key={video.id} 
                          video={video} 
                          darkMode={darkMode}
                          showHighlight={showYourVideoHighlight}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
