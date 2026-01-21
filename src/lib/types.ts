export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
  chunkPromptsData?: ChunkPrompt[];
}

export interface GeneratedImage {
  id: string;
  projectId: string;
  prompt: string;
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt: string;
  aspectRatio: string;
  requestId: string;
  modelUsed: ModelType;
  wasFallback?: boolean;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  prompts: string[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  completedImages: GeneratedImage[];
  errors: string[];
  createdAt: string;
}

export interface GenerationLogEntry {
  id: string;
  projectId: string;
  sessionId: string;
  attemptNumber: number;
  prompt: string;
  status: 'success' | 'failed';
  error?: string;
  generatedImage?: GeneratedImage;
  modelUsed: ModelType;
  wasFallback?: boolean;
  createdAt: string;
}

export type ModelType = 'minimax' | 'imagen4' | 'imagen4-fast' | 'seedream' | 'seedream-v4' | 'gpt-image-1' | 'nano-banana';

export interface GenerationSettings {
  model: ModelType;
  aspectRatio: '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9' | '5:4' | '4:5' | '4:3-custom';
  numImages: number;
  promptOptimizer: boolean;
  enableFallback?: boolean;
  // OpenAI-specific settings
  openaiBackground?: 'auto' | 'transparent' | 'opaque';
  openaiQuality?: 'auto' | 'high' | 'medium' | 'low';
  openaiOutputFormat?: 'png' | 'jpeg' | 'webp';
  // Seedream-specific settings
  guidanceScale?: number;
  // Imagen 4 specific settings
  imagen4Resolution?: '1K' | '2K';
}

export interface FalImageResponse {
  images: Array<{
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
  }>;
}

export interface FalApiResult {
  data: FalImageResponse;
  requestId: string;
}

export type SortOption = 'newest' | 'oldest' | 'prompt-az' | 'prompt-za'; 

// --- Script-to-Resolve types ---
export interface SrtCue {
  index: number;
  startMs: number; // inclusive
  endMs: number;   // exclusive
  start: string;   // HH:MM:SS,mmm
  end: string;     // HH:MM:SS,mmm
  text: string;
}

export interface PromptRow {
  nr: number; // 1-based sequential index
  timestamp: string; // MM:SS-MM:SS
  durationSec: number; // seconds, can be fractional
  prompt: string; // Must begin with "Rembrandt painting style."
  relatedText: string; // exact quote from script
}

export interface XmlExportOptions {
  fps: number; // e.g., 24
  startTimecode: string; // e.g., 01:00:00:00
  width: number; // e.g., 1920
  height: number; // e.g., 1080
  imageFolder: string; // Windows path, e.g., C:\\Users\\Name\\Pictures
  sequenceName?: string; // default: "Timeline 1 (Resolve)"
  ntsc?: boolean; // default: false
  ndf?: boolean; // Non-drop frame; default true (NDF)
}

// --- Script Chunker types ---
export interface ScriptChunk {
  id: number;
  text: string;
  wordCount: number;
  sentenceCount: number;
  clauseCount: number;
}

export interface ChunkPrompt {
  chunkId: number;
  originalText: string;
  prompt: string;
  wordCount: number;
}

// --- Stock Image Finder types ---
export interface ChunkKeywords {
  chunkId: number;
  originalText: string;
  keywords: string[];  // 3-5 search terms
  primaryKeyword: string;  // Best single search term
  wordCount: number;
}

export interface WikimediaImage {
  pageid: number;
  title: string;  // File:Example.jpg
  thumbnailUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  license: string;
  licenseUrl?: string;
  author?: string;
  description?: string;
  isPublicDomain: boolean;  // True if no restrictions
  licenseType: 'pd' | 'cc' | 'other';  // 'pd' = public domain, 'cc' = creative commons (attribution required), 'other' = restricted
}

export interface SelectedStockImage {
  chunkId: number;
  keyword: string;
  image: WikimediaImage;
  selectedAt: string;
}