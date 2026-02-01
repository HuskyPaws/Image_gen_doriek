'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScriptChunk, ChunkPrompt, ChunkKeywords } from '@/lib/types';
import { chunkScript } from '@/lib/script-chunker';
import { generatePromptsForChunks, generateKeywordsForChunks, generateCustomStylePrompt } from '@/lib/prompt-generator';
import { createProject } from '@/lib/storage';
import { ArrowLeft, FileText, Scissors, Wand2, ImageIcon, Download, CheckCircle, Loader2, Edit3, ChevronDown, ChevronUp, TestTube, FolderPlus, Trash2, Split, GitMerge, Plus, Check, X, Save, Search, Tags, Volume2, Play, Pause, Music, Star, Settings2 } from 'lucide-react';
import { AudioChunk, ElevenLabsVoice } from '@/lib/types';

// Audio preset type for saving/loading settings
interface AudioPreset {
  voiceId: string;
  modelId: string;
  stability: number;
  similarity: number;
  style: number;
  speed: number;
  useStitching: boolean;
  stitchingDepth: number;
  outputFormat?: string;
}
import { 
  fetchVoices, 
  generateSpeechForChunks, 
  combineAudioChunks, 
  downloadAudio, 
  cleanupAudioChunks,
  getElevenLabsApiKey,
  getFileExtension,
  POPULAR_VOICES,
  ELEVENLABS_MODELS
} from '@/lib/elevenlabs';

export default function ScriptChunkerPage() {
  const [scriptText, setScriptText] = useState('');
  const [chunks, setChunks] = useState<ScriptChunk[]>([]);
  const [prompts, setPrompts] = useState<ChunkPrompt[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [useAI, setUseAI] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [testResults, setTestResults] = useState<{
    originalWords: number;
    reconstructedWords: number;
    wordDelta: number;
    originalChars: number;
    reconstructedChars: number;
    charDelta: number;
    reconstructedText: string;
    missingWords: string[];
    addedWords: string[];
  } | null>(null);
  const [testChunkCount, setTestChunkCount] = useState(10);
  const [promptStyle, setPromptStyle] = useState<'narrative' | 'director-painting' | 'cinematic' | 'archival' | 'copperplate' | 'french-academic' | 'french-academic-dynamic'>('director-painting');
  const [environment, setEnvironment] = useState<'medieval' | 'ww2' | 'custom'>('medieval');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [styleGeneratorInput, setStyleGeneratorInput] = useState('');
  const [isGeneratingStyle, setIsGeneratingStyle] = useState(false);
  const [showStyleExample, setShowStyleExample] = useState(false);
  const [savedStyles, setSavedStyles] = useState<{name: string; prompt: string; createdAt: string}[]>([]);
  const [styleName, setStyleName] = useState('');
  const [showSaveStyleDialog, setShowSaveStyleDialog] = useState(false);
  const [selectedSavedStyle, setSelectedSavedStyle] = useState<string | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [editingChunkId, setEditingChunkId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [promptProgress, setPromptProgress] = useState({ current: 0, total: 0 });
  const [parallelRequests, setParallelRequests] = useState(3);
  const [generationMode, setGenerationMode] = useState<'prompts' | 'keywords'>('prompts');
  const [keywords, setKeywords] = useState<ChunkKeywords[]>([]);
  
  // Audio generation state (ElevenLabs)
  const [showAudioSection, setShowAudioSection] = useState(false);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ current: 0, total: 0 });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(POPULAR_VOICES[0].voice_id);
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [selectedAudioModel, setSelectedAudioModel] = useState<string>(ELEVENLABS_MODELS.MULTILINGUAL_V2);
  const [playingChunkId, setPlayingChunkId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Voice settings
  const [voiceStability, setVoiceStability] = useState(0.5);
  const [voiceSimilarity, setVoiceSimilarity] = useState(0.75);
  const [voiceStyle, setVoiceStyle] = useState(0.0);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [showAdvancedVoiceSettings, setShowAdvancedVoiceSettings] = useState(false);
  const [useRequestStitching, setUseRequestStitching] = useState(true);
  const [stitchingDepth, setStitchingDepth] = useState(1); // How many previous IDs to use (1-3)
  const [audioOutputFormat, setAudioOutputFormat] = useState('mp3_44100_128');
  // Saved audio settings and favorite voices
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);
  const [savedAudioPresets, setSavedAudioPresets] = useState<{name: string; settings: AudioPreset}[]>([]);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Check for imported script from Script Writer
  useEffect(() => {
    const importedScript = sessionStorage.getItem('importedScript');
    if (importedScript) {
      setScriptText(importedScript);
      sessionStorage.removeItem('importedScript');
    }
  }, []);

  // Load saved styles from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('customImageStyles');
        if (saved) {
          setSavedStyles(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load saved styles:', e);
      }
    }
  }, []);

  // Reset prompt style when switching environments to avoid invalid combinations
  useEffect(() => {
    // If switching to WW2 and medieval-only styles are selected, reset to director-painting
    if (environment === 'ww2' && (promptStyle === 'copperplate' || promptStyle === 'french-academic' || promptStyle === 'french-academic-dynamic')) {
      setPromptStyle('director-painting');
    }
    // If switching to medieval and archival is selected, reset to director-painting
    if (environment === 'medieval' && promptStyle === 'archival') {
      setPromptStyle('director-painting');
    }
  }, [environment, promptStyle]);

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      cleanupAudioChunks(audioChunks);
    };
  }, [audioChunks]);

  // Load ElevenLabs voices when audio section is opened
  useEffect(() => {
    if (showAudioSection && availableVoices.length === 0 && !isLoadingVoices) {
      loadVoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAudioSection]);

  // Load favorite voices and audio presets from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFavorites = localStorage.getItem('elevenlabs_favorite_voices');
        if (savedFavorites) {
          setFavoriteVoices(JSON.parse(savedFavorites));
        }
        const savedPresets = localStorage.getItem('elevenlabs_audio_presets');
        if (savedPresets) {
          setSavedAudioPresets(JSON.parse(savedPresets));
        }
      } catch (e) {
        console.error('Failed to load audio settings:', e);
      }
    }
  }, []);

  const wordCount = scriptText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const paragraphCount = scriptText.trim().split(/\n\n+/).filter(p => p.trim().length > 0).length;

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setScriptText(content);
    };
    reader.readAsText(file);
  }

  function handleChunkScript() {
    if (!scriptText.trim()) return;
    setIsProcessing(true);
    setTestResults(null); // Clear previous test results
    try {
      const result = chunkScript(scriptText);
      setChunks(result);
      setCurrentStep(2);
    } catch (error) {
      console.error('Chunking failed:', error);
      alert(`Failed to chunk script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleGeneratePrompts(testMode: boolean = false) {
    if (chunks.length === 0) return;
    setIsProcessing(true);
    setPromptProgress({ current: 0, total: 0 });
    
    try {
      const chunksToProcess = testMode ? chunks.slice(0, testChunkCount) : chunks;
      setPromptProgress({ current: 0, total: chunksToProcess.length });
      
      const result = await generatePromptsForChunks(
        chunksToProcess, 
        useAI, 
        promptStyle,
        (current, total) => {
          setPromptProgress({ current, total });
        },
        parallelRequests,
        environment,
        environment === 'custom' ? customStylePrompt : undefined
      );
      
      setPrompts(result);
      setCurrentStep(3);
    } catch (error) {
      console.error('Prompt generation failed:', error);
      alert(`Failed to generate prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setPromptProgress({ current: 0, total: 0 });
    }
  }

  async function handleGenerateKeywords(testMode: boolean = false) {
    if (chunks.length === 0) return;
    setIsProcessing(true);
    setPromptProgress({ current: 0, total: 0 });
    
    try {
      const chunksToProcess = testMode ? chunks.slice(0, testChunkCount) : chunks;
      setPromptProgress({ current: 0, total: chunksToProcess.length });
      
      // Pass the full script text for context-aware keyword generation
      const result = await generateKeywordsForChunks(
        chunksToProcess,
        useAI,
        environment === 'ww2' ? 'ww2' : 'medieval',
        (current, total) => {
          setPromptProgress({ current, total });
        },
        parallelRequests,
        scriptText // Pass the full original script for context
      );
      
      setKeywords(result);
      setCurrentStep(3);
    } catch (error) {
      console.error('Keyword generation failed:', error);
      alert(`Failed to generate keywords: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setPromptProgress({ current: 0, total: 0 });
    }
  }

  function handleGenerate(testMode: boolean = false) {
    if (generationMode === 'keywords') {
      handleGenerateKeywords(testMode);
    } else {
      handleGeneratePrompts(testMode);
    }
  }

  async function handleGenerateStyle() {
    if (!styleGeneratorInput.trim()) return;
    setIsGeneratingStyle(true);
    
    try {
      const generatedPrompt = await generateCustomStylePrompt(styleGeneratorInput.trim());
      setCustomStylePrompt(generatedPrompt);
      setStyleGeneratorInput(''); // Clear the input after success
    } catch (error) {
      console.error('Style generation failed:', error);
      alert(`Failed to generate style: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingStyle(false);
    }
  }

  function handleSaveStyle() {
    if (!styleName.trim() || !customStylePrompt.trim()) return;
    
    const newStyle = {
      name: styleName.trim(),
      prompt: customStylePrompt,
      createdAt: new Date().toISOString(),
    };
    
    // Check if style with same name exists
    const existingIndex = savedStyles.findIndex(s => s.name.toLowerCase() === newStyle.name.toLowerCase());
    let updatedStyles: typeof savedStyles;
    
    if (existingIndex >= 0) {
      // Update existing style
      updatedStyles = [...savedStyles];
      updatedStyles[existingIndex] = newStyle;
    } else {
      // Add new style
      updatedStyles = [...savedStyles, newStyle];
    }
    
    setSavedStyles(updatedStyles);
    setSelectedSavedStyle(newStyle.name);
    
    // Save to localStorage
    try {
      localStorage.setItem('customImageStyles', JSON.stringify(updatedStyles));
    } catch (e) {
      console.error('Failed to save style:', e);
      // Try to free up space by clearing non-essential data
      try {
        // Clear old generation logs and session data that might be taking space
        const keysToTry = ['generationLogs', 'sessionLogs', 'generation_logs', 'pending_prompts'];
        keysToTry.forEach(key => localStorage.removeItem(key));
        // Retry save
        localStorage.setItem('customImageStyles', JSON.stringify(updatedStyles));
        alert('Saved successfully after clearing old data.');
      } catch {
        alert('Browser storage is full. Please go to Settings and clear some data, or clear your browser data for this site.');
      }
    }
    
    setShowSaveStyleDialog(false);
    setStyleName('');
  }

  function handleLoadStyle(name: string) {
    const style = savedStyles.find(s => s.name === name);
    if (style) {
      setCustomStylePrompt(style.prompt);
      setSelectedSavedStyle(name);
    }
  }

  function handleDeleteStyle(name: string) {
    const updatedStyles = savedStyles.filter(s => s.name !== name);
    setSavedStyles(updatedStyles);
    
    if (selectedSavedStyle === name) {
      setSelectedSavedStyle(null);
    }
    
    try {
      localStorage.setItem('customImageStyles', JSON.stringify(updatedStyles));
    } catch (e) {
      console.error('Failed to delete style:', e);
    }
  }

  // Audio generation functions
  async function loadVoices() {
    if (!getElevenLabsApiKey()) return;
    
    setIsLoadingVoices(true);
    try {
      const voices = await fetchVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Failed to load voices:', error);
      // Don't show alert - just use popular voices as fallback
    } finally {
      setIsLoadingVoices(false);
    }
  }

  function toggleFavoriteVoice(voiceId: string) {
    const updated = favoriteVoices.includes(voiceId)
      ? favoriteVoices.filter(id => id !== voiceId)
      : [...favoriteVoices, voiceId];
    
    setFavoriteVoices(updated);
    try {
      localStorage.setItem('elevenlabs_favorite_voices', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save favorites:', e);
    }
  }

  function getCurrentAudioPreset(): AudioPreset {
    return {
      voiceId: selectedVoiceId,
      modelId: selectedAudioModel,
      stability: voiceStability,
      similarity: voiceSimilarity,
      style: voiceStyle,
      speed: voiceSpeed,
      useStitching: useRequestStitching,
      stitchingDepth: stitchingDepth,
      outputFormat: audioOutputFormat,
    };
  }

  function handleSaveAudioPreset() {
    if (!presetName.trim()) return;
    
    const newPreset = {
      name: presetName.trim(),
      settings: getCurrentAudioPreset(),
    };
    
    // Check if preset with same name exists
    const existingIndex = savedAudioPresets.findIndex(
      p => p.name.toLowerCase() === newPreset.name.toLowerCase()
    );
    
    let updated: typeof savedAudioPresets;
    if (existingIndex >= 0) {
      updated = [...savedAudioPresets];
      updated[existingIndex] = newPreset;
    } else {
      updated = [...savedAudioPresets, newPreset];
    }
    
    setSavedAudioPresets(updated);
    try {
      localStorage.setItem('elevenlabs_audio_presets', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save preset:', e);
    }
    
    setShowSavePresetDialog(false);
    setPresetName('');
  }

  function handleLoadAudioPreset(preset: AudioPreset) {
    setSelectedVoiceId(preset.voiceId);
    setSelectedAudioModel(preset.modelId);
    setVoiceStability(preset.stability);
    setVoiceSimilarity(preset.similarity);
    setVoiceStyle(preset.style);
    setVoiceSpeed(preset.speed);
    setUseRequestStitching(preset.useStitching);
    setStitchingDepth(preset.stitchingDepth);
    setAudioOutputFormat(preset.outputFormat || 'mp3_44100_128');
  }

  function handleDeleteAudioPreset(name: string) {
    const updated = savedAudioPresets.filter(p => p.name !== name);
    setSavedAudioPresets(updated);
    try {
      localStorage.setItem('elevenlabs_audio_presets', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete preset:', e);
    }
  }

  // Helper to get voice name by ID
  function getVoiceName(voiceId: string): string {
    const popular = POPULAR_VOICES.find(v => v.voice_id === voiceId);
    if (popular) return popular.name;
    const custom = availableVoices.find(v => v.voice_id === voiceId);
    if (custom) return custom.name;
    return voiceId.substring(0, 8) + '...';
  }

  async function handleGenerateAudio() {
    if (chunks.length === 0) return;
    
    const apiKey = getElevenLabsApiKey();
    if (!apiKey) {
      alert('Please add your ElevenLabs API key in Settings to generate audio.');
      return;
    }

    setIsGeneratingAudio(true);
    setAudioProgress({ current: 0, total: chunks.length });
    
    // Clean up previous audio
    cleanupAudioChunks(audioChunks);
    setAudioChunks([]);

    try {
      const results = await generateSpeechForChunks(
        chunks,
        {
          voiceId: selectedVoiceId,
          modelId: selectedAudioModel,
          outputFormat: audioOutputFormat,
          voiceSettings: {
            stability: voiceStability,
            similarity_boost: voiceSimilarity,
            style: voiceStyle,
            use_speaker_boost: true,
            speed: voiceSpeed,
          },
          useStitching: useRequestStitching,
          stitchingDepth: stitchingDepth,
        },
        (current, total, chunk) => {
          setAudioProgress({ current, total });
          setAudioChunks(prev => {
            const existing = prev.findIndex(c => c.chunkId === chunk.chunkId);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = chunk;
              return updated;
            }
            return [...prev, chunk];
          });
        }
      );

      setAudioChunks(results);
      
      const successCount = results.filter(r => r.status === 'completed').length;
      const failCount = results.filter(r => r.status === 'failed').length;
      
      if (failCount > 0) {
        alert(`Audio generation completed: ${successCount} successful, ${failCount} failed.`);
      }
    } catch (error) {
      console.error('Audio generation failed:', error);
      alert(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgress({ current: 0, total: 0 });
    }
  }

  async function handleDownloadAllAudio() {
    const completedChunks = audioChunks.filter(c => c.status === 'completed' && c.audioBlob);
    if (completedChunks.length === 0) {
      alert('No audio to download. Generate audio first.');
      return;
    }

    try {
      const combinedBlob = await combineAudioChunks(completedChunks, audioOutputFormat);
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = getFileExtension(audioOutputFormat);
      downloadAudio(combinedBlob, `script-narration-${timestamp}.${extension}`);
    } catch (error) {
      console.error('Failed to combine audio:', error);
      alert(`Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function handlePlayChunk(chunkId: number) {
    const chunk = audioChunks.find(c => c.chunkId === chunkId);
    if (!chunk?.audioUrl) return;

    if (playingChunkId === chunkId) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingChunkId(null);
    } else {
      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Play new chunk
      const audio = new Audio(chunk.audioUrl);
      audio.onended = () => {
        setPlayingChunkId(null);
        audioRef.current = null;
      };
      audio.play();
      audioRef.current = audio;
      setPlayingChunkId(chunkId);
    }
  }

  function handlePromptEdit(chunkId: number, newPrompt: string) {
    setPrompts(prev => prev.map(p => p.chunkId === chunkId ? { ...p, prompt: newPrompt } : p));
  }

  function handleExportCSVFromPrompts() {
    if (prompts.length === 0) {
      alert('No prompts to export.');
      return;
    }

    // Helper to escape CSV fields
    const escapeCSVField = (field: string): string => {
      // Wrap in quotes and escape internal quotes by doubling them
      return `"${field.replace(/"/g, '""')}"`;
    };

    // Create CSV content with proper comma-delimited format
    const csvRows = [
      // Header row
      'NR,Image Prompt,Related Script Text',
      // Data rows - all fields wrapped in quotes
      ...prompts.map((prompt) => {
        const nr = escapeCSVField(prompt.chunkId.toString());
        const imagePrompt = escapeCSVField(prompt.prompt);
        const scriptText = escapeCSVField(prompt.originalText);
        return `${nr},${imagePrompt},${scriptText}`;
      })
    ];

    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `script-prompts-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCSVFromKeywords() {
    if (keywords.length === 0) {
      alert('No keywords to export.');
      return;
    }

    const escapeCSVField = (field: string): string => {
      return `"${field.replace(/"/g, '""')}"`;
    };

    const csvRows = [
      'NR,Primary Keyword,All Keywords,Related Script Text',
      ...keywords.map((kw) => {
        const nr = escapeCSVField(kw.chunkId.toString());
        const primary = escapeCSVField(kw.primaryKeyword);
        const allKw = escapeCSVField(kw.keywords.join('; '));
        const text = escapeCSVField(kw.originalText);
        return `${nr},${primary},${allKw},${text}`;
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `script-keywords-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleNavigateToStockFinder() {
    if (keywords.length === 0) return;
    
    // Store keywords in sessionStorage for the Stock Image Finder
    try {
      const keywordsData = JSON.stringify(keywords);
      sessionStorage.setItem('stockFinderKeywords', keywordsData);
      window.location.href = '/tools/stock-image-finder';
    } catch (error) {
      console.error('Failed to store keywords:', error);
      alert('Failed to transfer keywords. Please try exporting as CSV instead.');
    }
  }

  async function handleCreateProjectAndGenerate() {
    if (prompts.length === 0) return;
    setIsProcessing(true);
    
    try {
      const finalProjectName = projectName.trim() || 'Untitled Script Project';
      
      // Create the project
      const project = await createProject(
        finalProjectName,
        `Generated from script chunker: ${chunks.length} chunks, ${prompts.length} prompts`
      );
      
      // Try to store data in sessionStorage (with size limits handling)
      if (typeof window !== 'undefined') {
        try {
          // Store just prompt text for image generation (smaller)
          const promptsText = prompts.map(p => p.prompt).join('\n');
          
          // Check size before storing (sessionStorage limit is typically 5-10MB)
          const estimatedSize = new Blob([promptsText]).size;
          
          if (estimatedSize < 4 * 1024 * 1024) { // Less than 4MB
            sessionStorage.setItem('pendingPrompts', promptsText);
            
            // Try to store full chunk data for CSV (optional)
            try {
              const chunkData = JSON.stringify(prompts);
              const chunkDataSize = new Blob([chunkData]).size;
              
              if (chunkDataSize < 4 * 1024 * 1024) {
                sessionStorage.setItem('chunkPromptsData', chunkData);
              } else {
                console.warn('Chunk data too large for sessionStorage, CSV export will be disabled in project');
              }
            } catch (e) {
              console.warn('Could not store chunk data:', e);
            }
            
            sessionStorage.setItem('autoGenerateOnLoad', 'true');
          } else {
            // Data too large - show warning and navigate without auto-generation
            alert(`⚠️ Dataset is very large (${prompts.length} prompts).\n\nThe project was created, but you'll need to manually add prompts in the image generator.\n\nTip: Use "Export CSV" to save your prompts, then you can batch import them later.`);
          }
        } catch (storageError) {
          console.error('SessionStorage error:', storageError);
          alert(`⚠️ Could not store prompts in browser (too large).\n\nThe project was created. Please use "Export CSV" to save your prompts, then manually import them.`);
        }
      }
      
      // Navigate to project page
      window.location.href = `/project?id=${project.id}`;
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setIsProjectDialogOpen(false);
    }
  }

  function toggleChunkExpansion(chunkId: number) {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  }

  // Renumber chunks after modification
  function renumberChunks(chunksToRenumber: ScriptChunk[]): ScriptChunk[] {
    return chunksToRenumber.map((chunk, index) => ({
      ...chunk,
      id: index + 1,
    }));
  }

  function handleDeleteChunk(chunkId: number) {
    const updatedChunks = chunks.filter(c => c.id !== chunkId);
    setChunks(renumberChunks(updatedChunks));
    // Clear prompts since chunks changed
    if (prompts.length > 0) {
      setPrompts([]);
      setCurrentStep(2);
    }
  }

  function startEditingChunk(chunkId: number) {
    const chunk = chunks.find(c => c.id === chunkId);
    if (chunk) {
      setEditingChunkId(chunkId);
      setEditingText(chunk.text);
    }
  }

  function saveChunkEdit() {
    if (editingChunkId === null) return;
    
    const words = editingText.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = editingText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    setChunks(prev => prev.map(chunk => 
      chunk.id === editingChunkId 
        ? { 
            ...chunk, 
            text: editingText,
            wordCount: words.length,
            sentenceCount: sentences.length,
          }
        : chunk
    ));
    
    setEditingChunkId(null);
    setEditingText('');
    
    // Clear prompts since chunk text changed
    if (prompts.length > 0) {
      setPrompts([]);
      setCurrentStep(2);
    }
  }

  function cancelChunkEdit() {
    setEditingChunkId(null);
    setEditingText('');
  }

  function handleSplitChunk(chunkId: number) {
    const chunkIndex = chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) return;
    
    const chunk = chunks[chunkIndex];
    const words = chunk.text.trim().split(/\s+/);
    const midpoint = Math.ceil(words.length / 2);
    
    const firstHalf = words.slice(0, midpoint).join(' ');
    const secondHalf = words.slice(midpoint).join(' ');
    
    const firstWords = firstHalf.split(/\s+/).filter(w => w.length > 0);
    const firstSentences = firstHalf.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const secondWords = secondHalf.split(/\s+/).filter(w => w.length > 0);
    const secondSentences = secondHalf.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const newChunks = [...chunks];
    newChunks.splice(chunkIndex, 1, 
      {
        id: chunk.id,
        text: firstHalf,
        wordCount: firstWords.length,
        sentenceCount: firstSentences.length,
        clauseCount: chunk.clauseCount,
      },
      {
        id: chunk.id + 1,
        text: secondHalf,
        wordCount: secondWords.length,
        sentenceCount: secondSentences.length,
        clauseCount: chunk.clauseCount,
      }
    );
    
    setChunks(renumberChunks(newChunks));
    
    // Clear prompts since chunks changed
    if (prompts.length > 0) {
      setPrompts([]);
      setCurrentStep(2);
    }
  }

  function handleMergeWithNext(chunkId: number) {
    const chunkIndex = chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1 || chunkIndex === chunks.length - 1) return;
    
    const currentChunk = chunks[chunkIndex];
    const nextChunk = chunks[chunkIndex + 1];
    
    const mergedText = `${currentChunk.text} ${nextChunk.text}`;
    const words = mergedText.split(/\s+/).filter(w => w.length > 0);
    const sentences = mergedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const newChunks = [...chunks];
    newChunks.splice(chunkIndex, 2, {
      id: currentChunk.id,
      text: mergedText,
      wordCount: words.length,
      sentenceCount: sentences.length,
      clauseCount: currentChunk.clauseCount + nextChunk.clauseCount,
    });
    
    setChunks(renumberChunks(newChunks));
    
    // Clear prompts since chunks changed
    if (prompts.length > 0) {
      setPrompts([]);
      setCurrentStep(2);
    }
  }

  function handleAddChunkAfter(chunkId: number) {
    const chunkIndex = chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) return;
    
    const newChunk: ScriptChunk = {
      id: chunkId + 1,
      text: '[New chunk - click edit to add text]',
      wordCount: 7,
      sentenceCount: 1,
      clauseCount: 1,
    };
    
    const newChunks = [...chunks];
    newChunks.splice(chunkIndex + 1, 0, newChunk);
    
    setChunks(renumberChunks(newChunks));
    
    // Clear prompts since chunks changed
    if (prompts.length > 0) {
      setPrompts([]);
      setCurrentStep(2);
    }
  }

  const avgWordsPerChunk = chunks.length > 0 ? Math.round(chunks.reduce((sum, c) => sum + c.wordCount, 0) / chunks.length) : 0;

  function handleTestExport() {
    if (chunks.length === 0) return;
    
    // Reconstruct text from chunks
    const reconstructedText = chunks.map(c => c.text).join(' ');
    
    // Calculate stats
    const originalWords = scriptText.trim().split(/\s+/).filter(w => w.length > 0);
    const reconstructedWords = reconstructedText.trim().split(/\s+/).filter(w => w.length > 0);
    
    const originalWordCount = originalWords.length;
    const reconstructedWordCount = reconstructedWords.length;
    const originalCharCount = scriptText.trim().length;
    const reconstructedCharCount = reconstructedText.trim().length;
    
    // Find missing and added words
    const missingWords: string[] = [];
    const addedWords: string[] = [];
    
    // Find words in original but not in reconstructed
    for (const word of originalWords) {
      const lower = word.toLowerCase();
      const countOriginal = originalWords.filter(w => w.toLowerCase() === lower).length;
      const countReconstructed = reconstructedWords.filter(w => w.toLowerCase() === lower).length;
      if (countReconstructed < countOriginal) {
        for (let i = 0; i < countOriginal - countReconstructed; i++) {
          if (!missingWords.includes(word)) {
            missingWords.push(word);
          }
        }
      }
    }
    
    // Find words in reconstructed but not in original
    for (const word of reconstructedWords) {
      const lower = word.toLowerCase();
      const countOriginal = originalWords.filter(w => w.toLowerCase() === lower).length;
      const countReconstructed = reconstructedWords.filter(w => w.toLowerCase() === lower).length;
      if (countReconstructed > countOriginal) {
        for (let i = 0; i < countReconstructed - countOriginal; i++) {
          if (!addedWords.includes(word)) {
            addedWords.push(word);
          }
        }
      }
    }
    
    setTestResults({
      originalWords: originalWordCount,
      reconstructedWords: reconstructedWordCount,
      wordDelta: reconstructedWordCount - originalWordCount,
      originalChars: originalCharCount,
      reconstructedChars: reconstructedCharCount,
      charDelta: reconstructedCharCount - originalCharCount,
      reconstructedText,
      missingWords: [...new Set(missingWords)],
      addedWords: [...new Set(addedWords)],
    });
  }

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
            <h1 className="text-3xl font-bold text-slate-100">Script Chunker</h1>
          </div>
          <p className="text-slate-400 mt-2">
            Intelligently break scripts into visual beats, generate image prompts, and create images
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
              currentStep === step 
                ? 'bg-blue-500 text-white scale-110' 
                : currentStep > step
                ? 'bg-green-500 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-1 rounded transition-all ${
                currentStep > step ? 'bg-green-500' : 'bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Upload/Input Script */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Step 1: Upload or Paste Script
            </CardTitle>
            <CardDescription>
              Upload a .txt or .md file, or paste your script directly. The script will be intelligently chunked into visual beats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload File
              </Button>
              {scriptText && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {wordCount} words
                  </Badge>
                  <Badge variant="secondary">
                    {paragraphCount} paragraphs
                  </Badge>
                </div>
              )}
            </div>

            <Textarea
              placeholder="Paste your script here...&#10;&#10;For example:&#10;&#10;Anne Boleyn arrived at the Tower of London on a gray morning in May 1536. The very walls that once celebrated her coronation now loomed as her prison.&#10;&#10;Inside her cell, she paced nervously. Her ladies-in-waiting watched in silence. The queen who had captivated a king now faced execution."
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="min-h-[300px] resize-y font-mono text-sm"
            />

            <Button
              onClick={handleChunkScript}
              disabled={!scriptText.trim() || isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chunking...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4 mr-2" />
                  Chunk Script into Beats
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review Chunks */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-purple-500" />
              Step 2: Review Chunks
            </CardTitle>
            <CardDescription>
              Script has been broken into {chunks.length} visual beats. Review the chunks before generating prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {chunks.length} chunks
                </Badge>
                <Badge variant="secondary">
                  Avg {avgWordsPerChunk} words/chunk
                </Badge>
              </div>
              <Alert className="bg-green-950 border-green-800 p-2 w-auto">
                <AlertDescription className="text-green-300 text-xs flex items-center gap-2">
                  <TestTube className="h-3 w-3" />
                  Click "Run Test" below to verify text integrity
                </AlertDescription>
              </Alert>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-slate-700">
                {chunks.map((chunk, index) => {
                  const isExpanded = expandedChunks.has(chunk.id);
                  const isEditing = editingChunkId === chunk.id;
                  const displayText = isExpanded || chunk.text.length <= 150 
                    ? chunk.text 
                    : chunk.text.substring(0, 150) + '...';
                  
                  return (
                    <div key={chunk.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500">{chunk.id}</Badge>
                          <span className="text-xs text-slate-400">
                            {chunk.wordCount} words • {chunk.sentenceCount} sentences • {chunk.clauseCount} clauses
                          </span>
                        </div>
                        
                        {/* Action buttons */}
                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingChunk(chunk.id)}
                              title="Edit chunk text"
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSplitChunk(chunk.id)}
                              title="Split chunk in half"
                              className="h-8 w-8 p-0"
                            >
                              <Split className="h-3.5 w-3.5" />
                            </Button>
                            {index < chunks.length - 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMergeWithNext(chunk.id)}
                                title="Merge with next chunk"
                                className="h-8 w-8 p-0"
                              >
                                <GitMerge className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddChunkAfter(chunk.id)}
                              title="Add new chunk after this"
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteChunk(chunk.id)}
                              title="Delete chunk"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            {chunk.text.length > 150 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleChunkExpansion(chunk.id)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Chunk text or edit mode */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[100px] text-sm"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={saveChunkEdit}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelChunkEdit}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {displayText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test Results */}
            {testResults && (
              <Card className="border-2 border-blue-500 bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-400">
                    <TestTube className="h-5 w-5" />
                    Chunking Test Results
                  </CardTitle>
                  <CardDescription>
                    {testResults.wordDelta === 0 
                      ? '✅ Perfect match - All words preserved!'
                      : '⚠️ Differences detected - See details below'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-400">Original Words</p>
                      <p className="text-lg font-bold text-slate-100">{testResults.originalWords}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Reconstructed Words</p>
                      <p className="text-lg font-bold text-slate-100">{testResults.reconstructedWords}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Word Delta</p>
                      <p className={`text-lg font-bold ${testResults.wordDelta === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults.wordDelta > 0 ? '+' : ''}{testResults.wordDelta}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Char Delta</p>
                      <p className={`text-lg font-bold ${testResults.charDelta === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults.charDelta > 0 ? '+' : ''}{testResults.charDelta}
                      </p>
                    </div>
                  </div>

                  {/* Missing Words */}
                  {testResults.missingWords.length > 0 && (
                    <div className="p-4 bg-red-950 border border-red-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-red-400 mb-2">
                        ⚠️ Missing Words ({testResults.missingWords.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {testResults.missingWords.map((word, idx) => (
                          <Badge key={idx} variant="destructive" className="font-mono">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Added Words */}
                  {testResults.addedWords.length > 0 && (
                    <div className="p-4 bg-yellow-950 border border-yellow-800 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                        ⚠️ Added Words ({testResults.addedWords.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {testResults.addedWords.map((word, idx) => (
                          <Badge key={idx} className="bg-yellow-600 font-mono">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy-Paste Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-300">
                        Copy This for Debugging:
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const text = `CHUNKING TEST RESULTS
${'='.repeat(60)}

STATS:
- Original words: ${testResults.originalWords}
- Reconstructed words: ${testResults.reconstructedWords}
- Word delta: ${testResults.wordDelta}
- Character delta: ${testResults.charDelta}
${testResults.wordDelta === 0 ? '\n✅ PERFECT MATCH' : '\n⚠️ DIFFERENCES DETECTED'}

${testResults.missingWords.length > 0 ? `MISSING WORDS (${testResults.missingWords.length}):
${testResults.missingWords.join(', ')}
` : ''}
${testResults.addedWords.length > 0 ? `ADDED WORDS (${testResults.addedWords.length}):
${testResults.addedWords.join(', ')}
` : ''}
${'='.repeat(60)}

RECONSTRUCTED TEXT:
${testResults.reconstructedText}

${'='.repeat(60)}

ORIGINAL TEXT:
${scriptText.trim()}`;
                          navigator.clipboard.writeText(text);
                        }}
                      >
                        Copy All
                      </Button>
                    </div>
                    <Textarea
                      readOnly
                      value={`CHUNKING TEST RESULTS
${'='.repeat(60)}

STATS:
- Original words: ${testResults.originalWords}
- Reconstructed words: ${testResults.reconstructedWords}
- Word delta: ${testResults.wordDelta}
- Character delta: ${testResults.charDelta}
${testResults.wordDelta === 0 ? '\n✅ PERFECT MATCH' : '\n⚠️ DIFFERENCES DETECTED'}

${testResults.missingWords.length > 0 ? `MISSING WORDS (${testResults.missingWords.length}):
${testResults.missingWords.join(', ')}
` : ''}
${testResults.addedWords.length > 0 ? `ADDED WORDS (${testResults.addedWords.length}):
${testResults.addedWords.join(', ')}
` : ''}
${'='.repeat(60)}

RECONSTRUCTED TEXT:
${testResults.reconstructedText}

${'='.repeat(60)}

ORIGINAL TEXT:
${scriptText.trim()}`}
                      className="min-h-[200px] font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {/* Test Mode Controls */}
              <div className="flex items-center gap-2 p-3 bg-purple-950 border border-purple-800 rounded-lg">
                <Wand2 className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-purple-300 font-medium">Test Mode:</span>
                <Input
                  type="number"
                  min="1"
                  max={chunks.length}
                  value={testChunkCount}
                  onChange={(e) => setTestChunkCount(Math.min(chunks.length, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 h-8 text-center"
                />
                <span className="text-sm text-purple-300">chunks (out of {chunks.length})</span>
                <Button
                  onClick={() => handleGenerate(true)}
                  disabled={isProcessing}
                  variant="outline"
                  className="border-purple-500 text-purple-400 hover:bg-purple-950"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-3 w-3 mr-2" />
                      Test Generate
                    </>
                  )}
                </Button>
              </div>

              {/* Main Controls */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Script
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestExport}
                  className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testResults ? 'Refresh Test' : 'Run Test'}
                </Button>
                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={isProcessing}
                  className={`flex-1 ${generationMode === 'keywords' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                  }`}
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {generationMode === 'keywords' ? 'Generating Keywords...' : 'Generating Prompts...'}
                    </>
                  ) : (
                    <>
                      {generationMode === 'keywords' ? (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Generate All {chunks.length} Keywords
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate All {chunks.length} Prompts
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Indicator */}
            {isProcessing && promptProgress.total > 0 && (
              <Card className={`border-2 ${generationMode === 'keywords' ? 'border-cyan-500 bg-cyan-950/20' : 'border-purple-500 bg-purple-950/20'}`}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className={generationMode === 'keywords' ? 'text-cyan-300 font-medium' : 'text-purple-300 font-medium'}>
                        {generationMode === 'keywords' ? 'Generating keywords...' : 'Generating prompts...'}
                      </span>
                      <span className={generationMode === 'keywords' ? 'text-cyan-400 font-bold' : 'text-purple-400 font-bold'}>
                        {promptProgress.current} / {promptProgress.total}
                      </span>
                    </div>
                    <Progress 
                      value={(promptProgress.current / promptProgress.total) * 100} 
                      className="h-3"
                    />
                    <p className={`text-xs text-center ${generationMode === 'keywords' ? 'text-cyan-400' : 'text-purple-400'}`}>
                      {Math.round((promptProgress.current / promptProgress.total) * 100)}% complete
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio Generation Section (Optional) */}
            <Card className="border-2 border-indigo-500/50 bg-indigo-950/10">
              <button
                onClick={() => setShowAudioSection(!showAudioSection)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-indigo-950/20 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-300">Audio Narration (Optional)</h3>
                    <p className="text-xs text-slate-400">Generate text-to-speech audio using ElevenLabs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {audioChunks.filter(c => c.status === 'completed').length > 0 && (
                    <Badge className="bg-green-600 text-xs">
                      {audioChunks.filter(c => c.status === 'completed').length} audio clips
                    </Badge>
                  )}
                  {showAudioSection ? (
                    <ChevronUp className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-indigo-400" />
                  )}
                </div>
              </button>
              
              {showAudioSection && (
                <CardContent className="pt-0 pb-4 space-y-4">
                  {!getElevenLabsApiKey() ? (
                    <Alert className="bg-amber-950 border-amber-800">
                      <Volume2 className="h-4 w-4 text-amber-400" />
                      <AlertDescription className="text-amber-300 text-sm">
                        ElevenLabs API key not configured. Add it in Settings to generate audio narration.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Saved Presets Section */}
                      {savedAudioPresets.length > 0 && (
                        <div className="p-3 bg-slate-800 rounded-lg border border-green-500/50">
                          <label className="text-sm font-medium text-green-300 mb-2 block flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Saved Presets ({savedAudioPresets.length})
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {savedAudioPresets.map((preset) => (
                              <div 
                                key={preset.name}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                              >
                                <button
                                  onClick={() => handleLoadAudioPreset(preset.settings)}
                                  className="flex-1 text-left"
                                  title={`Voice: ${getVoiceName(preset.settings.voiceId)}`}
                                >
                                  {preset.name}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete preset "${preset.name}"?`)) {
                                      handleDeleteAudioPreset(preset.name);
                                    }
                                  }}
                                  className="ml-1 p-0.5 rounded hover:bg-red-500/30 transition-colors"
                                  title="Delete preset"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Voice and Model Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Voice Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Voice</label>
                          <div className="flex gap-2">
                            <select
                              value={selectedVoiceId}
                              onChange={(e) => setSelectedVoiceId(e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-800 text-slate-200 rounded border border-slate-600 text-sm"
                            >
                              {/* Favorite Voices */}
                              {favoriteVoices.length > 0 && (
                                <optgroup label="⭐ Favorites">
                                  {favoriteVoices.map((voiceId) => {
                                    const popular = POPULAR_VOICES.find(v => v.voice_id === voiceId);
                                    const custom = availableVoices.find(v => v.voice_id === voiceId);
                                    const name = popular?.name || custom?.name || voiceId;
                                    const desc = popular?.description || custom?.category || '';
                                    return (
                                      <option key={voiceId} value={voiceId}>
                                        ⭐ {name} {desc ? `- ${desc}` : ''}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                              <optgroup label="Popular Voices">
                                {POPULAR_VOICES.map((voice) => (
                                  <option key={voice.voice_id} value={voice.voice_id}>
                                    {favoriteVoices.includes(voice.voice_id) ? '⭐ ' : ''}{voice.name} - {voice.description}
                                  </option>
                                ))}
                              </optgroup>
                              {availableVoices.length > 0 && (
                                <optgroup label="Your Voices">
                                  {availableVoices
                                    .filter(v => !POPULAR_VOICES.find(pv => pv.voice_id === v.voice_id))
                                    .map((voice) => (
                                      <option key={voice.voice_id} value={voice.voice_id}>
                                        {favoriteVoices.includes(voice.voice_id) ? '⭐ ' : ''}{voice.name} {voice.category ? `(${voice.category})` : ''}
                                      </option>
                                    ))}
                                </optgroup>
                              )}
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFavoriteVoice(selectedVoiceId)}
                              className={`px-2 ${favoriteVoices.includes(selectedVoiceId) ? 'border-yellow-500 text-yellow-400' : 'border-slate-600'}`}
                              title={favoriteVoices.includes(selectedVoiceId) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className={`h-4 w-4 ${favoriteVoices.includes(selectedVoiceId) ? 'fill-yellow-400' : ''}`} />
                            </Button>
                          </div>
                          {isLoadingVoices && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading your voices...
                            </p>
                          )}
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Model</label>
                          <select
                            value={selectedAudioModel}
                            onChange={(e) => setSelectedAudioModel(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded border border-slate-600 text-sm"
                          >
                            <option value={ELEVENLABS_MODELS.MULTILINGUAL_V2}>
                              Multilingual v2 (Best quality, supports 29 languages)
                            </option>
                            <option value={ELEVENLABS_MODELS.TURBO_V2_5}>
                              Turbo v2.5 (Faster, English-focused)
                            </option>
                            <option value={ELEVENLABS_MODELS.FLASH_V2_5}>
                              Flash v2.5 (Fastest, lowest latency)
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* Output Format Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Output Format</label>
                        <select
                          value={audioOutputFormat}
                          onChange={(e) => setAudioOutputFormat(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 text-slate-200 rounded border border-slate-600 text-sm"
                        >
                          <optgroup label="WAV / PCM (Uncompressed - Highest Quality)">
                            <option value="pcm_44100">WAV 44.1kHz (CD Quality) - Largest files</option>
                            <option value="pcm_24000">WAV 24kHz - Smaller files</option>
                            <option value="pcm_22050">WAV 22kHz</option>
                            <option value="pcm_16000">WAV 16kHz - Smallest uncompressed</option>
                          </optgroup>
                          <optgroup label="MP3 (Compressed)">
                            <option value="mp3_44100_192">MP3 192kbps (High quality)</option>
                            <option value="mp3_44100_128">MP3 128kbps (Good quality) - Recommended</option>
                            <option value="mp3_44100_64">MP3 64kbps (Medium quality)</option>
                            <option value="mp3_22050_32">MP3 32kbps (Low quality, small files)</option>
                          </optgroup>
                        </select>
                        <p className="text-xs text-slate-500">
                          {audioOutputFormat.startsWith('pcm_') 
                            ? '🎵 WAV: Uncompressed audio, best for editing. Larger file sizes.'
                            : '🎵 MP3: Compressed audio, good for sharing. Smaller file sizes.'}
                        </p>
                      </div>

                      {/* Advanced Voice Settings */}
                      <div className="border border-slate-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setShowAdvancedVoiceSettings(!showAdvancedVoiceSettings)}
                          className="w-full p-3 bg-slate-800 flex items-center justify-between text-left hover:bg-slate-750 transition-colors"
                        >
                          <span className="text-sm font-medium text-slate-300">
                            Advanced Voice Settings
                          </span>
                          {showAdvancedVoiceSettings ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        {showAdvancedVoiceSettings && (
                          <div className="p-4 space-y-4 bg-slate-900/50">
                            {/* Stability */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">
                                  Stability
                                </label>
                                <span className="text-xs text-slate-400 font-mono">{voiceStability.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={voiceStability}
                                onChange={(e) => setVoiceStability(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-xs text-slate-500">
                                Lower = more expressive & variable. Higher = more consistent & stable.
                              </p>
                            </div>

                            {/* Similarity Boost */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">
                                  Similarity Boost
                                </label>
                                <span className="text-xs text-slate-400 font-mono">{voiceSimilarity.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={voiceSimilarity}
                                onChange={(e) => setVoiceSimilarity(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-xs text-slate-500">
                                How closely the output matches the original voice. Higher = closer match.
                              </p>
                            </div>

                            {/* Style Exaggeration */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">
                                  Style Exaggeration
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.005"
                                    value={voiceStyle}
                                    onChange={(e) => setVoiceStyle(Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    className="w-16 px-2 py-0.5 text-xs font-mono bg-slate-800 border border-slate-600 rounded text-right"
                                  />
                                </div>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.005"
                                value={voiceStyle}
                                onChange={(e) => setVoiceStyle(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-xs text-slate-500">
                                Amplifies the voice&apos;s original style. Use 0 for narration, higher for dramatic delivery.
                              </p>
                            </div>

                            {/* Speed */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">
                                  Speed
                                </label>
                                <span className="text-xs text-slate-400 font-mono">{voiceSpeed.toFixed(2)}x</span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.05"
                                value={voiceSpeed}
                                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                              <p className="text-xs text-slate-500">
                                Playback speed. 1.0 = normal, lower = slower, higher = faster.
                              </p>
                            </div>

                            {/* Request Stitching Toggle */}
                            <div className="pt-3 border-t border-slate-700 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <label className="text-sm font-medium text-slate-300">
                                    Request Stitching
                                  </label>
                                  <p className="text-xs text-slate-500">
                                    Links chunks for smoother prosody, but may cause volume decay
                                  </p>
                                </div>
                                <button
                                  onClick={() => setUseRequestStitching(!useRequestStitching)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    useRequestStitching ? 'bg-indigo-600' : 'bg-slate-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      useRequestStitching ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>

                              {useRequestStitching && (
                                <div className="space-y-2 pl-4 border-l-2 border-indigo-500/30">
                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-300">
                                      Stitching Depth
                                    </label>
                                    <span className="text-xs text-slate-400 font-mono">{stitchingDepth} chunk{stitchingDepth > 1 ? 's' : ''}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="1"
                                    value={stitchingDepth}
                                    onChange={(e) => setStitchingDepth(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                  />
                                  <p className="text-xs text-slate-500">
                                    {stitchingDepth === 1 && 'Minimal stitching - reduces volume decay, slight prosody variations'}
                                    {stitchingDepth === 2 && 'Balanced - moderate continuity with some volume consistency'}
                                    {stitchingDepth === 3 && 'Maximum continuity - smoothest prosody but highest volume decay risk'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Save Preset & Reset Buttons */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSavePresetDialog(true)}
                                className="flex-1 border-green-500 text-green-400 hover:bg-green-950"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Preset
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setVoiceStability(0.5);
                                  setVoiceSimilarity(0.75);
                                  setVoiceStyle(0.0);
                                  setVoiceSpeed(1.0);
                                  setUseRequestStitching(true);
                                  setStitchingDepth(1);
                                  setAudioOutputFormat('mp3_44100_128');
                                }}
                                className="flex-1"
                              >
                                Reset to Defaults
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request Stitching Info */}
                      {useRequestStitching ? (
                        <Alert className="bg-blue-950 border-blue-800">
                          <Music className="h-4 w-4 text-blue-400" />
                          <AlertDescription className="text-blue-300 text-sm">
                            <strong>Stitching Enabled (Depth: {stitchingDepth}):</strong> Each chunk references the previous {stitchingDepth} chunk{stitchingDepth > 1 ? 's' : ''} for smoother prosody. 
                            If you notice volume decreasing over time, try reducing the depth to 1 or disabling stitching in Advanced Settings.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="bg-amber-950 border-amber-800">
                          <Music className="h-4 w-4 text-amber-400" />
                          <AlertDescription className="text-amber-300 text-sm">
                            <strong>Stitching Disabled:</strong> Each chunk is generated independently. Volume will stay consistent, but there may be slight prosody variations between chunks.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Generate Button */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleGenerateAudio}
                          disabled={isGeneratingAudio || chunks.length === 0}
                          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                          {isGeneratingAudio ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating Audio ({audioProgress.current}/{audioProgress.total})...
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-4 w-4 mr-2" />
                              Generate Audio for {chunks.length} Chunks
                            </>
                          )}
                        </Button>
                        
                        {audioChunks.filter(c => c.status === 'completed').length > 0 && (
                          <Button
                            onClick={handleDownloadAllAudio}
                            variant="outline"
                            className="border-green-500 text-green-400 hover:bg-green-950"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download All
                          </Button>
                        )}
                      </div>

                      {/* Audio Progress */}
                      {isGeneratingAudio && audioProgress.total > 0 && (
                        <div className="space-y-2">
                          <Progress 
                            value={(audioProgress.current / audioProgress.total) * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-center text-indigo-400">
                            {Math.round((audioProgress.current / audioProgress.total) * 100)}% complete
                          </p>
                        </div>
                      )}

                      {/* Audio Chunks Preview */}
                      {audioChunks.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-slate-300">Generated Audio Clips</h4>
                          <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                            <div className="divide-y divide-slate-700">
                              {audioChunks.map((chunk) => (
                                <div
                                  key={chunk.chunkId}
                                  className="p-2 flex items-center justify-between hover:bg-slate-800/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      className={
                                        chunk.status === 'completed' ? 'bg-green-600' :
                                        chunk.status === 'generating' ? 'bg-yellow-600' :
                                        chunk.status === 'failed' ? 'bg-red-600' : 'bg-slate-600'
                                      }
                                    >
                                      {chunk.chunkId}
                                    </Badge>
                                    <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                      {chunk.text.substring(0, 50)}...
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {chunk.status === 'generating' && (
                                      <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                                    )}
                                    {chunk.status === 'completed' && chunk.audioUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePlayChunk(chunk.chunkId)}
                                        className="h-7 w-7 p-0"
                                      >
                                        {playingChunkId === chunk.chunkId ? (
                                          <Pause className="h-4 w-4 text-indigo-400" />
                                        ) : (
                                          <Play className="h-4 w-4 text-indigo-400" />
                                        )}
                                      </Button>
                                    )}
                                    {chunk.status === 'failed' && (
                                      <span className="text-xs text-red-400" title={chunk.error}>
                                        Failed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Generation Mode Selector */}
            <Card className="border-2 border-cyan-500 bg-cyan-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-cyan-400">Generation Mode</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Choose what to generate from your script chunks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Mode 1: AI Image Prompts */}
                  <button
                    onClick={() => setGenerationMode('prompts')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      generationMode === 'prompts'
                        ? 'border-cyan-500 bg-cyan-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-cyan-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-cyan-400" />
                        <h4 className="font-semibold text-slate-100">AI Image Prompts</h4>
                      </div>
                      {generationMode === 'prompts' && (
                        <CheckCircle className="h-5 w-5 text-cyan-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Generate detailed AI image prompts for each chunk. Use these to create AI-generated images with tools like Midjourney, DALL-E, or the built-in image generator.
                    </p>
                  </button>

                  {/* Mode 2: Search Keywords */}
                  <button
                    onClick={() => setGenerationMode('keywords')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      generationMode === 'keywords'
                        ? 'border-cyan-500 bg-cyan-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-cyan-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-cyan-400" />
                        <h4 className="font-semibold text-slate-100">Search Keywords</h4>
                      </div>
                      {generationMode === 'keywords' && (
                        <CheckCircle className="h-5 w-5 text-cyan-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Generate search keywords for finding stock images on Wikimedia Commons. Perfect for finding royalty-free, public domain historical images.
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Environment Selector */}
            <Card className="border-2 border-indigo-500 bg-indigo-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-indigo-400">Visual Environment</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Choose the visual style and time period for your images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Environment 1: Medieval/Rembrandt */}
                  <button
                    onClick={() => setEnvironment('medieval')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      environment === 'medieval'
                        ? 'border-indigo-500 bg-indigo-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-100">Medieval / Renaissance</h4>
                      {environment === 'medieval' && (
                        <CheckCircle className="h-5 w-5 text-indigo-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Rembrandt painting style with dramatic chiaroscuro lighting, warm golden tones, rich textures, and period-accurate medieval/Renaissance details. Perfect for historical religious narratives.
                    </p>
                  </button>

                  {/* Environment 2: WW2 Documentary */}
                  <button
                    onClick={() => setEnvironment('ww2')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      environment === 'ww2'
                        ? 'border-indigo-500 bg-indigo-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-100">WW2 Documentary</h4>
                      {environment === 'ww2' && (
                        <CheckCircle className="h-5 w-5 text-indigo-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Black and white documentary photography style with high contrast, authentic 1940s film grain, natural lighting, and photojournalistic composition. Perfect for military and wartime narratives.
                    </p>
                  </button>

                  {/* Environment 3: Custom Style */}
                  <button
                    onClick={() => setEnvironment('custom')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      environment === 'custom'
                        ? 'border-indigo-500 bg-indigo-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-100">Custom Style</h4>
                      {environment === 'custom' && (
                        <CheckCircle className="h-5 w-5 text-indigo-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Define your own visual style by writing custom instructions. Perfect for unique aesthetics not covered by the preset options.
                    </p>
                  </button>
                </div>

                {/* Custom Style Prompt Input - only shown when custom is selected */}
                {environment === 'custom' && (
                  <div className="mt-4 space-y-4">
                    {/* Saved Styles Section */}
                    {savedStyles.length > 0 && (
                      <div className="p-4 bg-slate-800 rounded-lg border border-green-500/50">
                        <label className="text-sm font-medium text-green-300 mb-2 block flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Saved Styles ({savedStyles.length})
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {savedStyles.map((style) => (
                            <div 
                              key={style.name}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                                selectedSavedStyle === style.name
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              <button
                                onClick={() => handleLoadStyle(style.name)}
                                className="flex-1 text-left"
                              >
                                {style.name}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete style "${style.name}"?`)) {
                                    handleDeleteStyle(style.name);
                                  }
                                }}
                                className="ml-1 p-0.5 rounded hover:bg-red-500/30 transition-colors"
                                title="Delete style"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {selectedSavedStyle && (
                          <p className="text-xs text-green-400 mt-2">
                            ✓ Using saved style: {selectedSavedStyle}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Style Generator Section */}
                    <div className="p-4 bg-gradient-to-r from-purple-950/50 to-indigo-950/50 rounded-lg border border-purple-500/50">
                      <label className="text-sm font-medium text-purple-300 mb-2 block flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        Style Generator (AI-Powered)
                      </label>
                      <p className="text-xs text-slate-400 mb-3">
                        Describe your desired style in simple terms, and the AI will generate the full system prompt for you.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Victorian era oil painting, 1980s neon cyberpunk, Japanese woodblock print..."
                          value={styleGeneratorInput}
                          onChange={(e) => setStyleGeneratorInput(e.target.value)}
                          className="flex-1 bg-slate-900 border-slate-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && styleGeneratorInput.trim() && !isGeneratingStyle) {
                              handleGenerateStyle();
                            }
                          }}
                        />
                        <Button
                          onClick={handleGenerateStyle}
                          disabled={!styleGeneratorInput.trim() || isGeneratingStyle}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isGeneratingStyle ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Generate Style
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Manual Style Instructions */}
                    <div className="p-4 bg-slate-800 rounded-lg border border-indigo-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-indigo-300 block">
                          Custom Style Instructions
                        </label>
                        {customStylePrompt.trim() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSaveStyleDialog(true)}
                            className="border-green-500 text-green-400 hover:bg-green-950"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save Style
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        {customStylePrompt 
                          ? 'Edit the generated style instructions below, or write your own from scratch.'
                          : 'Write instructions that describe the visual style for your image prompts, or use the Style Generator above.'}
                      </p>
                      <Textarea
                        placeholder="Enter your custom style instructions here..."
                        value={customStylePrompt}
                        onChange={(e) => {
                          setCustomStylePrompt(e.target.value);
                          setSelectedSavedStyle(null); // Clear selection when editing
                        }}
                        className="min-h-[250px] text-sm font-mono bg-slate-900 border-slate-600"
                      />
                      <p className="text-xs text-amber-400 mt-2">
                        💡 Tip: Include a REQUIRED prefix (e.g., &quot;My style.&quot;), specific visual characteristics, and clear instructions for how prompts should be structured.
                      </p>
                    </div>

                    {/* Example Section - Collapsible */}
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setShowStyleExample(!showStyleExample)}
                        className="w-full p-3 bg-slate-800 flex items-center justify-between text-left hover:bg-slate-750 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          View Example Style Instructions
                        </span>
                        {showStyleExample ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      {showStyleExample && (
                        <div className="p-4 bg-slate-900 border-t border-slate-700">
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{`You are a specialized AI assistant that creates detailed image prompts for documentary videos. You transform written scripts into comprehensive visual sequences using vintage 1970s film photography style.

CRITICAL REQUIREMENTS:
1. ALL prompts MUST begin with: "Vintage 1970s film photography style."
2. ALL prompts MUST pass moderation - no violence, gore, nudity, or inappropriate content
3. ALL people MUST be fully clothed in period-appropriate 1970s attire
4. ALWAYS include specific details about people (ages, roles, clothing)
5. Stay REALISTIC - authentic documentary photography aesthetic
6. Length: 4-5 sentences minimum, 8-10 sentences maximum

STYLE CHARACTERISTICS:
- Warm, slightly faded color palette with orange/amber tint
- Subtle film grain texture throughout the image
- Soft focus with occasional vignetting at edges
- Natural available lighting (no studio setups)
- Slightly desaturated colors with lifted blacks
- Authentic 1970s clothing, hairstyles, and settings
- Candid, documentary-like composition
- Occasional lens flare from bright light sources
- Muted greens and blues, warm skin tones

PROMPT STRUCTURE (ALWAYS FOLLOW THIS):
1. "Vintage 1970s film photography style." (REQUIRED opening)
2. Setting/location with specific 1970s details
3. Primary subject: Who is the focal point (age, role, appearance)
4. Clothing details: Period-accurate 1970s fashion
5. Physical details: Expressions, postures, body language
6. Lighting: Natural light source, warm tones, soft shadows
7. Film characteristics: Grain, color cast, vignette effects
8. Background elements: Period-accurate objects and environment
9. Overall mood and atmosphere

EXAMPLE OF A GOOD PROMPT:
"Vintage 1970s film photography style. A family gathering in a suburban backyard during a summer barbecue, circa 1975. A father in his early 40s wearing a brown plaid short-sleeve shirt and tan slacks tends to a charcoal grill while his wife, in a yellow sundress with floral pattern, arranges potato salad on a folding table. Two children, a boy around 10 in striped t-shirt and cutoff jeans, and a girl around 7 in a pink tank top and shorts, play with a garden hose nearby. Natural late afternoon sunlight creates warm golden tones across the scene, with subtle film grain visible throughout. The image has slightly lifted blacks and that characteristic 1970s amber color cast. A wood-paneled station wagon is partially visible in the driveway."

AVOID:
- Modern elements (contemporary clothing, technology, architecture)
- Generic descriptions without specific 1970s details
- Overly sharp, digital-looking images
- Cold or blue color tones
- Studio lighting setups
- Graphic content of any kind`}</pre>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              setCustomStylePrompt(`You are a specialized AI assistant that creates detailed image prompts for documentary videos. You transform written scripts into comprehensive visual sequences using vintage 1970s film photography style.

CRITICAL REQUIREMENTS:
1. ALL prompts MUST begin with: "Vintage 1970s film photography style."
2. ALL prompts MUST pass moderation - no violence, gore, nudity, or inappropriate content
3. ALL people MUST be fully clothed in period-appropriate 1970s attire
4. ALWAYS include specific details about people (ages, roles, clothing)
5. Stay REALISTIC - authentic documentary photography aesthetic
6. Length: 4-5 sentences minimum, 8-10 sentences maximum

STYLE CHARACTERISTICS:
- Warm, slightly faded color palette with orange/amber tint
- Subtle film grain texture throughout the image
- Soft focus with occasional vignetting at edges
- Natural available lighting (no studio setups)
- Slightly desaturated colors with lifted blacks
- Authentic 1970s clothing, hairstyles, and settings
- Candid, documentary-like composition
- Occasional lens flare from bright light sources
- Muted greens and blues, warm skin tones

PROMPT STRUCTURE (ALWAYS FOLLOW THIS):
1. "Vintage 1970s film photography style." (REQUIRED opening)
2. Setting/location with specific 1970s details
3. Primary subject: Who is the focal point (age, role, appearance)
4. Clothing details: Period-accurate 1970s fashion
5. Physical details: Expressions, postures, body language
6. Lighting: Natural light source, warm tones, soft shadows
7. Film characteristics: Grain, color cast, vignette effects
8. Background elements: Period-accurate objects and environment
9. Overall mood and atmosphere

EXAMPLE OF A GOOD PROMPT:
"Vintage 1970s film photography style. A family gathering in a suburban backyard during a summer barbecue, circa 1975. A father in his early 40s wearing a brown plaid short-sleeve shirt and tan slacks tends to a charcoal grill while his wife, in a yellow sundress with floral pattern, arranges potato salad on a folding table. Two children, a boy around 10 in striped t-shirt and cutoff jeans, and a girl around 7 in a pink tank top and shorts, play with a garden hose nearby. Natural late afternoon sunlight creates warm golden tones across the scene, with subtle film grain visible throughout. The image has slightly lifted blacks and that characteristic 1970s amber color cast. A wood-paneled station wagon is partially visible in the driveway."

AVOID:
- Modern elements (contemporary clothing, technology, architecture)
- Generic descriptions without specific 1970s details
- Overly sharp, digital-looking images
- Cold or blue color tones
- Studio lighting setups
- Graphic content of any kind`);
                              setShowStyleExample(false);
                            }}
                          >
                            Use This Example as Template
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Style Selector - Only shown for prompts mode and non-custom environment */}
            {generationMode === 'prompts' && environment !== 'custom' && (
            <Card className="border-2 border-amber-500 bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-amber-400">Prompt Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`grid grid-cols-1 gap-3 ${environment === 'ww2' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                  {/* Style 1: Narrative */}
                  <button
                    onClick={() => setPromptStyle('narrative')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      promptStyle === 'narrative'
                        ? 'border-amber-500 bg-amber-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-100">Narrative Style</h4>
                      {promptStyle === 'narrative' && (
                        <CheckCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {environment === 'ww2' 
                        ? 'Detailed documentary photography descriptions with emotional depth, authentic 1940s period details, and comprehensive black and white compositions. Focuses on human stories and photojournalism.'
                        : 'Detailed descriptive prompts with psychological depth, emotional states, and comprehensive scene descriptions. Focuses on storytelling and character development.'
                      }
                    </p>
                  </button>

                  {/* Style 2: Director - Painting Styled (RECOMMENDED) */}
                  <button
                    onClick={() => setPromptStyle('director-painting')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      promptStyle === 'director-painting'
                        ? 'border-amber-500 bg-amber-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-100">
                        {environment === 'ww2' ? 'Director - Photography Hybrid' : 'Director - Painting Styled'}
                      </h4>
                      {promptStyle === 'director-painting' && (
                        <CheckCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {environment !== 'ww2' && <><Badge className="bg-green-600 text-xs mb-1">Recommended</Badge><br /></>}
                      {environment === 'ww2'
                        ? 'Combines cinematographic shot descriptions with authentic WW2 documentary photography techniques. Film grain, high contrast B&W, natural lighting, and photojournalistic composition.'
                        : 'Combines cinematographic shot descriptions with rich Rembrandt painting techniques. Detailed lighting, textures, colors, and composition with painting-like quality.'
                      }
                    </div>
                  </button>

                  {/* Style 3: Pure Cinematic */}
                  <button
                    onClick={() => setPromptStyle('cinematic')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      promptStyle === 'cinematic'
                        ? 'border-amber-500 bg-amber-950/50'
                        : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-100">
                        {environment === 'ww2' ? 'Pure Documentary' : 'Pure Cinematic'}
                      </h4>
                      {promptStyle === 'cinematic' && (
                        <CheckCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {environment === 'ww2'
                        ? 'War photographer shot descriptions with specific framing, uniform details, and authentic period equipment. Like Robert Capa calling shots. Technical and precise documentary style.'
                        : 'Director-style shot descriptions with specific compositions, camera angles, and visual elements. Like calling shots on a film set. More directive and technical.'
                      }
                    </p>
                  </button>

                  {/* Style 4: Copperplate Etching - MEDIEVAL ONLY */}
                  {environment === 'medieval' && (
                    <button
                      onClick={() => setPromptStyle('copperplate')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        promptStyle === 'copperplate'
                          ? 'border-amber-500 bg-amber-950/50'
                          : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-100">Copperplate Etching</h4>
                        {promptStyle === 'copperplate' && (
                          <CheckCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        <Badge className="bg-blue-600 text-xs mb-1">18th Century</Badge><br />
                        Authentic antique print style: cross-hatching, stipple shading, sepia-gray wash, paper specks. Describes actions visually (avoids violent words). Perfect for naval, maritime, and period scenes.
                      </div>
                    </button>
                  )}

                  {/* Style 5: French Academic - MEDIEVAL ONLY */}
                  {environment === 'medieval' && (
                    <button
                      onClick={() => setPromptStyle('french-academic')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        promptStyle === 'french-academic'
                          ? 'border-amber-500 bg-amber-950/50'
                          : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-100">French Academic</h4>
                        {promptStyle === 'french-academic' && (
                          <CheckCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        <Badge className="bg-purple-600 text-xs mb-1">19th Century</Badge><br />
                        École des Beaux-Arts style museum painting. Neo-medieval/Gothic Revival undertone, canvas weave texture, craquelure, formal compositions. Dignified academic portraiture with polished finish.
                      </div>
                    </button>
                  )}

                  {/* Style 6: French Academic Dynamic - MEDIEVAL ONLY */}
                  {environment === 'medieval' && (
                    <button
                      onClick={() => setPromptStyle('french-academic-dynamic')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        promptStyle === 'french-academic-dynamic'
                          ? 'border-amber-500 bg-amber-950/50'
                          : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-100">French Academic Dynamic</h4>
                        {promptStyle === 'french-academic-dynamic' && (
                          <CheckCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        <Badge className="bg-pink-600 text-xs mb-1">Expressive</Badge><br />
                        Like Géricault, Delacroix, David. Dynamic movement, expressive gestures, emotional facial expressions, environmental storytelling. Wind-swept robes, dramatic skies, narrative power.
                      </div>
                    </button>
                  )}

                  {/* Style 7: Archival Photo - WW2 Only */}
                  {environment === 'ww2' && (
                    <button
                      onClick={() => setPromptStyle('archival')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        promptStyle === 'archival'
                          ? 'border-amber-500 bg-amber-950/50'
                          : 'border-slate-700 bg-slate-900 hover:border-amber-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-100">Archival Photo</h4>
                        {promptStyle === 'archival' && (
                          <CheckCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        <Badge className="bg-green-600 text-xs mb-1">Recommended for WW2</Badge><br />
                        Authentic WWII-era archival photograph look. 1940s 35mm film, soft focus, halation, heavy grain. Aged print with yellowed paper tint, curled corners, dust specks, scratches. Looks like a real museum archive photo.
                      </div>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="useAI" className="text-sm text-slate-300 cursor-pointer flex-1">
                  {generationMode === 'keywords' 
                    ? 'Use AI for intelligent keyword extraction (requires OpenRouter API key)'
                    : 'Use AI for detailed prompt generation (requires OpenRouter API key)'
                  }
                </label>
                {!useAI && (
                  <Badge variant="destructive" className="text-xs">
                    Template Mode
                  </Badge>
                )}
                {useAI && (
                  <Badge className="bg-purple-600 text-xs">
                    AI Mode
                  </Badge>
                )}
              </div>

              {useAI && (
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <label htmlFor="parallelRequests" className="text-sm text-slate-300 flex-1">
                    Parallel Requests (faster generation)
                  </label>
                  <select
                    id="parallelRequests"
                    value={parallelRequests}
                    onChange={(e) => setParallelRequests(parseInt(e.target.value))}
                    className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded border border-slate-600 text-sm"
                  >
                    <option value="1">1 (Slowest, safest)</option>
                    <option value="2">2</option>
                    <option value="3">3 (Recommended)</option>
                    <option value="4">4</option>
                    <option value="5">5 (Fastest)</option>
                  </select>
                  <Badge className="bg-blue-600 text-xs">
                    {parallelRequests}x Speed
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Results - Prompts or Keywords */}
      {currentStep === 3 && generationMode === 'prompts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-pink-500" />
              Step 3: Review & Edit Prompts
            </CardTitle>
            <CardDescription>
              {prompts.length} {promptStyle === 'copperplate' ? 'copperplate etching' : promptStyle === 'archival' ? 'archival photo' : promptStyle === 'french-academic' ? 'French Academic' : promptStyle === 'french-academic-dynamic' ? 'French Academic Dynamic' : environment === 'ww2' ? 'WW2 documentary' : 'Rembrandt-style'} prompts generated
              {prompts.length < chunks.length && (
                <span className="text-yellow-400"> (Test Mode - {prompts.length} of {chunks.length} chunks)</span>
              )}
              . You can edit any prompt before generating images.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-950 border-blue-800">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 text-sm">
                {promptStyle === 'copperplate' 
                  ? 'All prompts begin with "Create an 18th-century copperplate etching / line engraving..." as required. Edit prompts if needed.'
                  : promptStyle === 'archival'
                  ? 'All prompts begin with "WWII-era authentic archival photo..." as required. Edit prompts if needed.'
                  : promptStyle === 'french-academic'
                  ? 'All prompts begin with "Create a 19th-century French academic history painting..." as required. Edit prompts if needed.'
                  : promptStyle === 'french-academic-dynamic'
                  ? 'All prompts begin with "Create a 19th-century French academic history painting...dynamic movement and emotional expression..." as required. Edit prompts if needed.'
                  : environment === 'ww2' 
                  ? 'All prompts begin with "WW2 black and white documentary photography style." as required. Edit prompts if needed.'
                  : 'All prompts begin with "Rembrandt painting style." as required. Edit prompts if needed.'
                }
              </AlertDescription>
            </Alert>

            {prompts.length > 100 && (
              <Alert className="bg-amber-950 border-amber-800">
                <Download className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-300 text-sm">
                  💡 <strong>Large dataset detected ({prompts.length} prompts)</strong> - We recommend exporting the CSV now to save your work. Browser storage limits may prevent automatic transfer to the image generator.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-slate-700">
                {prompts.map((prompt) => {
                  const isExpanded = expandedChunks.has(prompt.chunkId);
                  
                  return (
                    <div key={prompt.chunkId} className="p-4 space-y-3 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-pink-500">Chunk {prompt.chunkId}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleChunkExpansion(prompt.chunkId)}
                        >
                          {isExpanded ? 'Hide Original' : 'Show Original'}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 bg-slate-900 rounded border border-slate-700">
                          <p className="text-xs text-slate-400 mb-1">Original Text:</p>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{prompt.originalText}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-3 w-3 text-slate-400" />
                          <label className="text-xs text-slate-400">Prompt (editable):</label>
                        </div>
                        <Textarea
                          value={prompt.prompt}
                          onChange={(e) => handlePromptEdit(prompt.chunkId, e.target.value)}
                          className="min-h-[100px] text-sm font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {prompts.length < chunks.length && (
                <Alert className="bg-yellow-950 border-yellow-800">
                  <AlertDescription className="text-yellow-300 text-sm flex items-center justify-between">
                    <span>
                      ⚠️ You're viewing {prompts.length} of {chunks.length} prompts (Test Mode). 
                      Go back to generate all prompts or continue to create a project for these {prompts.length} chunks.
                    </span>
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert className="bg-blue-950 border-blue-800">
                <FolderPlus className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300 text-sm">
                  A new project will be created and you'll be taken to the project page where you can generate images, download them, and regenerate any that don't pass moderation.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleExportCSVFromPrompts}
                  variant="outline"
                  className="w-full border-blue-500 text-blue-400 hover:bg-blue-950"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV (NR • Image Prompt • Script Text)
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={isProcessing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Chunks
                  </Button>
                  <Button
                    onClick={() => setIsProjectDialogOpen(true)}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    size="lg"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Project & Generate {prompts.length} Image{prompts.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Keywords */}
      {currentStep === 3 && generationMode === 'keywords' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-cyan-500" />
              Step 3: Review Keywords
            </CardTitle>
            <CardDescription>
              {keywords.length} keyword sets generated for stock image search
              {keywords.length < chunks.length && (
                <span className="text-yellow-400"> (Test Mode - {keywords.length} of {chunks.length} chunks)</span>
              )}
              . Use these to find public domain images on Wikimedia Commons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-cyan-950 border-cyan-800">
              <Search className="h-4 w-4 text-cyan-400" />
              <AlertDescription className="text-cyan-300 text-sm">
                These keywords are optimized for searching Wikimedia Commons for public domain images. 
                Click "Find Stock Images" to search for matching images.
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-slate-700">
                {keywords.map((kw) => {
                  const isExpanded = expandedChunks.has(kw.chunkId);
                  
                  return (
                    <div key={kw.chunkId} className="p-4 space-y-3 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-cyan-500">Chunk {kw.chunkId}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleChunkExpansion(kw.chunkId)}
                        >
                          {isExpanded ? 'Hide Original' : 'Show Original'}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 bg-slate-900 rounded border border-slate-700">
                          <p className="text-xs text-slate-400 mb-1">Original Text:</p>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{kw.originalText}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tags className="h-3 w-3 text-cyan-400" />
                          <label className="text-xs text-slate-400">Primary Keyword:</label>
                          <Badge className="bg-cyan-600">{kw.primaryKeyword}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {kw.keywords.map((keyword, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary"
                              className="bg-slate-700 text-slate-200"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {keywords.length < chunks.length && (
                <Alert className="bg-yellow-950 border-yellow-800">
                  <AlertDescription className="text-yellow-300 text-sm">
                    ⚠️ You're viewing {keywords.length} of {chunks.length} keyword sets (Test Mode). 
                    Go back to generate all keywords.
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert className="bg-green-950 border-green-800">
                <ImageIcon className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300 text-sm">
                  Click "Find Stock Images" to open the Stock Image Finder where you can search 
                  Wikimedia Commons for public domain images matching these keywords.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleExportCSVFromKeywords}
                  variant="outline"
                  className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-950"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV (NR • Keywords • Script Text)
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={isProcessing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Chunks
                  </Button>
                  <Button
                    onClick={handleNavigateToStockFinder}
                    disabled={isProcessing || keywords.length === 0}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                    size="lg"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Stock Images ({keywords.length} Keywords)
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Style Dialog */}
      <Dialog open={showSaveStyleDialog} onOpenChange={setShowSaveStyleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Custom Style</DialogTitle>
            <DialogDescription>
              Give your style a name to save it for future use. Saved styles are stored in your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Style Name</label>
              <Input
                type="text"
                placeholder="e.g., Victorian Oil Painting, Cyberpunk Neon..."
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && styleName.trim()) {
                    handleSaveStyle();
                  }
                }}
                autoFocus
              />
            </div>
            {savedStyles.some(s => s.name.toLowerCase() === styleName.trim().toLowerCase()) && (
              <Alert className="bg-amber-950 border-amber-800">
                <AlertDescription className="text-amber-300 text-sm">
                  ⚠️ A style with this name already exists. Saving will overwrite it.
                </AlertDescription>
              </Alert>
            )}
            <div className="text-xs text-slate-400">
              <p className="font-medium mb-1">Style Preview (first 200 characters):</p>
              <p className="bg-slate-900 p-2 rounded border border-slate-700 font-mono">
                {customStylePrompt.substring(0, 200)}{customStylePrompt.length > 200 ? '...' : ''}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveStyleDialog(false);
                setStyleName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStyle}
              disabled={!styleName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Style
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Name Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Give your project a name. This will create a new project with {prompts.length} image prompt{prompts.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Enter project name..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isProcessing) {
                  handleCreateProjectAndGenerate();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProjectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProjectAndGenerate}
              disabled={isProcessing}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Audio Preset Dialog */}
      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Audio Preset</DialogTitle>
            <DialogDescription>
              Save your current audio settings as a preset for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Preset Name</label>
              <Input
                type="text"
                placeholder="e.g., Documentary Narrator, Audiobook Style..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && presetName.trim()) {
                    handleSaveAudioPreset();
                  }
                }}
                autoFocus
              />
            </div>
            {savedAudioPresets.some(p => p.name.toLowerCase() === presetName.trim().toLowerCase()) && (
              <Alert className="bg-amber-950 border-amber-800">
                <AlertDescription className="text-amber-300 text-sm">
                  A preset with this name already exists. Saving will overwrite it.
                </AlertDescription>
              </Alert>
            )}
            <div className="text-xs text-slate-400 p-3 bg-slate-900 rounded border border-slate-700">
              <p className="font-medium mb-2">Current Settings:</p>
              <ul className="space-y-1">
                <li>Voice: {getVoiceName(selectedVoiceId)}</li>
                <li>Model: {selectedAudioModel}</li>
                <li>Stability: {voiceStability.toFixed(2)} | Similarity: {voiceSimilarity.toFixed(2)}</li>
                <li>Style: {voiceStyle.toFixed(3)} | Speed: {voiceSpeed.toFixed(2)}x</li>
                <li>Stitching: {useRequestStitching ? `On (depth: ${stitchingDepth})` : 'Off'}</li>
                <li>Format: {audioOutputFormat.startsWith('pcm_') ? 'WAV' : 'MP3'} ({audioOutputFormat})</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSavePresetDialog(false);
                setPresetName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAudioPreset}
              disabled={!presetName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

