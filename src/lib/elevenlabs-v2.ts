/**
 * ElevenLabs Text-to-Speech Service
 * 
 * This module provides functions for:
 * - Fetching available voices
 * - Converting text to speech with request stitching for consistent prosody
 * - Combining multiple audio chunks into a single file
 */

import { ElevenLabsVoice, ElevenLabsVoiceSettings, ElevenLabsGenerationOptions, AudioChunk, ScriptChunk } from './types';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Default voice settings for natural-sounding narration
const DEFAULT_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
  speed: 1.0,
};

// Popular models
export const ELEVENLABS_MODELS = {
  MULTILINGUAL_V2: 'eleven_multilingual_v2',
  TURBO_V2_5: 'eleven_turbo_v2_5',
  FLASH_V2_5: 'eleven_flash_v2_5',
  MONOLINGUAL_V1: 'eleven_monolingual_v1',
} as const;

/**
 * Get the ElevenLabs API key from localStorage
 */
export function getElevenLabsApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('elevenlabs_api_key');
}

/**
 * Fetch available voices from ElevenLabs
 */
export async function fetchVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured. Please add it in Settings.');
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch voices: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.voices || [];
}

/**
 * Generate speech for a single text chunk
 * Returns the audio blob and request ID for stitching
 */
export async function generateSpeechForChunk(
  text: string,
  options: ElevenLabsGenerationOptions,
): Promise<{ audioBlob: Blob; requestId: string }> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured. Please add it in Settings.');
  }

  const {
    voiceId,
    modelId = ELEVENLABS_MODELS.MULTILINGUAL_V2,
    outputFormat = 'mp3_44100_128',
    voiceSettings = DEFAULT_VOICE_SETTINGS,
    previousRequestIds = [],
  } = options;

  const response = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: voiceSettings,
        previous_request_ids: previousRequestIds.slice(-3), // ElevenLabs recommends max 3 previous IDs
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Speech generation failed: ${response.status} - ${errorText}`);
  }

  // Get request ID from headers for stitching
  const requestId = response.headers.get('request-id') || '';
  
  // Get audio data
  const audioBlob = await response.blob();

  return { audioBlob, requestId };
}

/**
 * Options for batch speech generation
 */
export interface BatchGenerationOptions extends Omit<ElevenLabsGenerationOptions, 'previousRequestIds'> {
  useStitching?: boolean; // Whether to use request stitching (default: true)
  stitchingDepth?: number; // How many previous request IDs to use (1-3, default: 1)
}

/**
 * Generate speech for multiple chunks with optional request stitching
 * Request stitching maintains voice prosody across chunks but can cause volume decay
 * 
 * @param stitchingDepth - How many previous requests to reference (1 = only last chunk, 3 = max)
 *                         Lower values reduce volume decay issues but may have more prosody jumps
 */
export async function generateSpeechForChunks(
  chunks: ScriptChunk[],
  options: BatchGenerationOptions,
  onProgress?: (current: number, total: number, chunk: AudioChunk) => void,
): Promise<AudioChunk[]> {
  const results: AudioChunk[] = [];
  const requestIds: string[] = [];
  const { useStitching = true, stitchingDepth = 1, ...genOptions } = options;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Create initial pending result
    const audioChunk: AudioChunk = {
      chunkId: chunk.id,
      text: chunk.text,
      status: 'generating',
    };

    try {
      // Determine which request IDs to use for stitching
      // Only use the most recent N IDs based on stitchingDepth
      const previousIds = useStitching 
        ? requestIds.slice(-Math.min(stitchingDepth, 3)) 
        : [];

      // Generate speech with optional stitching
      const { audioBlob, requestId } = await generateSpeechForChunk(
        chunk.text,
        {
          ...genOptions,
          previousRequestIds: previousIds,
        }
      );

      // Store request ID for next iteration (stitching)
      if (useStitching) {
        requestIds.push(requestId);
      }

      // Update result
      audioChunk.audioBlob = audioBlob;
      audioChunk.audioUrl = URL.createObjectURL(audioBlob);
      audioChunk.requestId = requestId;
      audioChunk.status = 'completed';
    } catch (error) {
      audioChunk.status = 'failed';
      audioChunk.error = error instanceof Error ? error.message : 'Unknown error';
      // Don't add failed request ID to the chain
    }

    results.push(audioChunk);
    
    if (onProgress) {
      onProgress(i + 1, chunks.length, audioChunk);
    }
  }

  return results;
}

/**
 * Create a WAV header for PCM data
 */
function createWavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  
  // "RIFF" chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // File size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"
  
  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, byteRate, true); // Byte rate
  view.setUint16(32, blockAlign, true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample
  
  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true); // Data size
  
  return header;
}

/**
 * Get sample rate from format string
 */
function getSampleRateFromFormat(format: string): number {
  if (format.includes('44100')) return 44100;
  if (format.includes('24000')) return 24000;
  if (format.includes('22050')) return 22050;
  if (format.includes('16000')) return 16000;
  return 44100; // Default
}

/**
 * Combine multiple audio blobs into a single audio file
 * Handles both MP3 (simple concatenation) and PCM (adds WAV header)
 */
export async function combineAudioChunks(
  chunks: AudioChunk[], 
  format: string = 'mp3_44100_128'
): Promise<Blob> {
  const completedChunks = chunks.filter(
    (c) => c.status === 'completed' && c.audioBlob
  );

  if (completedChunks.length === 0) {
    throw new Error('No completed audio chunks to combine');
  }

  const audioBuffers: ArrayBuffer[] = [];
  
  for (const chunk of completedChunks) {
    if (chunk.audioBlob) {
      const buffer = await chunk.audioBlob.arrayBuffer();
      audioBuffers.push(buffer);
    }
  }

  // Combine all buffers
  const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buffer of audioBuffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  // For PCM format, add WAV header
  if (format.startsWith('pcm_')) {
    const sampleRate = getSampleRateFromFormat(format);
    const wavHeader = createWavHeader(totalLength, sampleRate);
    
    // Combine header + data
    const wavFile = new Uint8Array(44 + totalLength);
    wavFile.set(new Uint8Array(wavHeader), 0);
    wavFile.set(combined, 44);
    
    return new Blob([wavFile], { type: 'audio/wav' });
  }

  // For MP3, just return concatenated data
  return new Blob([combined], { type: 'audio/mpeg' });
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: string): string {
  if (format.startsWith('pcm_')) return 'wav';
  return 'mp3';
}

/**
 * Download an audio blob as a file
 */
export function downloadAudio(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clean up audio URLs to prevent memory leaks
 */
export function cleanupAudioChunks(chunks: AudioChunk[]): void {
  for (const chunk of chunks) {
    if (chunk.audioUrl) {
      URL.revokeObjectURL(chunk.audioUrl);
    }
  }
}

/**
 * Get a list of popular pre-made voices for quick selection
 */
export const POPULAR_VOICES = [
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm & authoritative male' },
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep male narrator' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft female narrator' },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm & clear female' },
  { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'British female' },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'American male' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Young male narrator' },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'British female narrator' },
] as const;
