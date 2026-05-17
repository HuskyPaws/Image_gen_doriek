'use client';

import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Music,
  Wand2,
  Download,
  Loader2,
  Trash2,
  RefreshCw,
  Archive,
  ImageOff,
} from 'lucide-react';
import { generateImageWithFallback, downloadImageAsBlob } from '@/lib/api';
import { GenerationSettings, ModelType } from '@/lib/types';

interface Stanza {
  id: number;
  text: string;
  label: string; // e.g. "Verse 1", "Chorus", or "Stanza 3"
}

interface StanzaImage {
  stanzaId: number;
  url: string;
  fileName: string;
  prompt: string;
  modelUsed: ModelType;
  wasFallback: boolean;
}

type AspectRatio = GenerationSettings['aspectRatio'];

const MODEL_OPTIONS: { value: ModelType; label: string }[] = [
  { value: 'nano-banana', label: 'Nano Banana (fal.ai)' },
  { value: 'imagen4-fast', label: 'Imagen 4 Fast (fal.ai)' },
  { value: 'imagen4', label: 'Imagen 4 (fal.ai)' },
  { value: 'seedream-v4', label: 'Seedream v4 (fal.ai)' },
  { value: 'seedream', label: 'Seedream v3 (fal.ai)' },
  { value: 'minimax', label: 'Minimax (fal.ai)' },
  { value: 'gpt-image-1-5', label: 'GPT Image 1.5 (fal.ai)' },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: '16:9 — Landscape' },
  { value: '9:16', label: '9:16 — Vertical (Reels/Shorts)' },
  { value: '1:1', label: '1:1 — Square' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9 — Cinematic' },
];

// Headers like "[Chorus]" or "Verse 1:" — used to label stanzas if present.
const STANZA_HEADER_RE = /^\s*(?:\[([^\]]+)\]|\(([^)]+)\)|([A-Za-z][A-Za-z0-9 \-]{0,30}))\s*:?\s*$/;

function parseStanzas(raw: string): Stanza[] {
  if (!raw.trim()) return [];

  // Split on blank lines (one or more empty lines between blocks).
  const blocks = raw
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const stanzas: Stanza[] = [];
  let counter = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Detect a section header on the first line: "[Chorus]", "(Verse 2)", "Bridge:" etc.
    let label = `Stanza ${counter}`;
    let bodyLines = lines;
    const headerMatch = lines[0].match(STANZA_HEADER_RE);
    if (headerMatch && lines.length > 1) {
      const tag = (headerMatch[1] || headerMatch[2] || headerMatch[3] || '').trim();
      // Only treat as header if it looks like a section name, not real lyrics.
      const looksLikeHeader =
        /^(verse|chorus|hook|bridge|pre[- ]?chorus|intro|outro|refrain|interlude|drop|breakdown|coda)/i.test(
          tag,
        );
      if (looksLikeHeader) {
        label = tag.replace(/\s+/g, ' ');
        bodyLines = lines.slice(1);
      }
    }

    const text = bodyLines.join('\n').trim();
    if (!text) continue;

    stanzas.push({ id: counter, text, label });
    counter += 1;
  }

  return stanzas;
}

function buildPrompt(stanza: Stanza, style: string): string {
  // Lyrics-as-imagery: collapse line breaks, append cinematic music-video framing.
  const lyric = stanza.text.replace(/\s+/g, ' ').trim();
  const styleClean = style.trim();
  const styleClause = styleClean
    ? `Visual style: ${styleClean}.`
    : 'Visual style: cinematic, moody, music-video still, dramatic lighting.';
  return `${styleClause} Scene inspired by the lyric: "${lyric}". Single evocative frame, no on-screen text, no watermark, no captions.`;
}

function safeFileName(label: string, idx: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'stanza';
  return `${String(idx).padStart(2, '0')}-${slug}.png`;
}

export default function MusicVideoPage() {
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [model, setModel] = useState<ModelType>('nano-banana');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [images, setImages] = useState<Map<number, StanzaImage>>(new Map());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [zipBusy, setZipBusy] = useState(false);

  const stanzas = useMemo(() => parseStanzas(lyrics), [lyrics]);
  const totalChars = lyrics.length;
  const generatedCount = images.size;

  async function generateOne(stanza: Stanza) {
    const prompt = buildPrompt(stanza, style);
    const settings: GenerationSettings = {
      model,
      aspectRatio,
      numImages: 1,
      promptOptimizer: false,
      enableFallback: true,
    };

    try {
      const result = await generateImageWithFallback({ prompt, settings });
      const first = result.data?.images?.[0];
      if (!first) {
        throw new Error('Backend returned no image');
      }
      setImages((prev) => {
        const next = new Map(prev);
        next.set(stanza.id, {
          stanzaId: stanza.id,
          url: first.url,
          fileName: first.file_name || safeFileName(stanza.label, stanza.id),
          prompt,
          modelUsed: result.modelUsed,
          wasFallback: result.wasFallback,
        });
        return next;
      });
      setErrors((prev) => {
        if (!prev.has(stanza.id)) return prev;
        const next = new Map(prev);
        next.delete(stanza.id);
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrors((prev) => {
        const next = new Map(prev);
        next.set(stanza.id, msg);
        return next;
      });
    }
  }

  async function handleGenerateAll() {
    if (stanzas.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setProgress({ current: 0, total: stanzas.length });
    // Clear prior errors but keep already-generated images visible.
    setErrors(new Map());

    for (let i = 0; i < stanzas.length; i += 1) {
      setProgress({ current: i, total: stanzas.length });
      await generateOne(stanzas[i]);
      // Light delay between requests, mirroring batch behavior in lib/api.ts.
      if (i < stanzas.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    setProgress({ current: stanzas.length, total: stanzas.length });
    setIsGenerating(false);
  }

  async function handleRegenerate(stanza: Stanza) {
    if (isGenerating) return;
    setIsGenerating(true);
    await generateOne(stanza);
    setIsGenerating(false);
  }

  function handleClear() {
    setLyrics('');
    setImages(new Map());
    setErrors(new Map());
    setProgress({ current: 0, total: 0 });
  }

  async function handleDownloadOne(img: StanzaImage) {
    try {
      const blob = await downloadImageAsBlob(img.url);
      saveAs(blob, img.fileName);
    } catch (err) {
      alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleDownloadZip() {
    if (images.size === 0) return;
    setZipBusy(true);
    try {
      const zip = new JSZip();
      // Save in stanza order so frames stay in lyric sequence.
      const ordered = stanzas
        .map((s) => images.get(s.id))
        .filter((x): x is StanzaImage => !!x);

      for (let i = 0; i < ordered.length; i += 1) {
        const img = ordered[i];
        const stanza = stanzas.find((s) => s.id === img.stanzaId);
        const fileName = safeFileName(stanza?.label || 'stanza', i + 1);
        const blob = await downloadImageAsBlob(img.url);
        zip.file(fileName, blob);
      }

      // Include a manifest so the user can match images back to lyrics.
      const manifest = ordered.map((img, i) => {
        const stanza = stanzas.find((s) => s.id === img.stanzaId);
        return {
          order: i + 1,
          label: stanza?.label || `Stanza ${img.stanzaId}`,
          lyric: stanza?.text || '',
          prompt: img.prompt,
          model: img.modelUsed,
          wasFallback: img.wasFallback,
          fileName: safeFileName(stanza?.label || 'stanza', i + 1),
        };
      });
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      const archive = await zip.generateAsync({ type: 'blob' });
      saveAs(archive, `music-video-frames-${Date.now()}.zip`);
    } catch (err) {
      alert(`ZIP export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Music className="h-8 w-8 text-pink-500" />
          Music Video Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Paste song lyrics. Each stanza (block separated by a blank line) becomes one
          generated image — ready to drop on a timeline as a music-video frame sequence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lyrics</CardTitle>
            <CardDescription>
              Separate stanzas with a blank line. Section headers like
              <code className="mx-1 px-1 rounded bg-slate-100 dark:bg-slate-800">[Chorus]</code>
              or <code className="mx-1 px-1 rounded bg-slate-100 dark:bg-slate-800">Verse 1:</code>
              are detected automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`[Verse 1]\nWalking through the empty streets tonight\nNeon signs reflecting in the rain\n\n[Chorus]\nWe were dreamers in the city light\nNever coming down again`}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="min-h-[420px] font-mono text-sm"
            />
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                {totalChars} characters · {stanzas.length} stanza
                {stanzas.length === 1 ? '' : 's'} detected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!lyrics && images.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Style applies to every stanza.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Visual style (optional)</label>
              <Input
                placeholder="e.g. neon noir, 35mm film grain, melancholy"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Leave blank for a default cinematic music-video look.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={model} onValueChange={(v) => setModel(v as ModelType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aspect ratio</label>
              <Select
                value={aspectRatio}
                onValueChange={(v) => setAspectRatio(v as AspectRatio)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateAll}
              disabled={stanzas.length === 0 || isGenerating}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating {progress.current}/{progress.total}…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate {stanzas.length || ''} image
                  {stanzas.length === 1 ? '' : 's'}
                </>
              )}
            </Button>

            {isGenerating && progress.total > 0 && (
              <Progress
                value={(progress.current / progress.total) * 100}
                className="h-2"
              />
            )}

            <Button
              variant="outline"
              onClick={handleDownloadZip}
              disabled={images.size === 0 || zipBusy}
              className="w-full"
            >
              {zipBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Packaging…
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Download all as ZIP ({generatedCount})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {stanzas.length === 0 && (
        <Alert>
          <AlertDescription>
            No stanzas detected yet — paste lyrics on the left and they&apos;ll appear
            here as image cards.
          </AlertDescription>
        </Alert>
      )}

      {stanzas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stanzas.map((stanza) => {
            const img = images.get(stanza.id);
            const err = errors.get(stanza.id);
            return (
              <Card key={stanza.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>
                      #{stanza.id} · {stanza.label}
                    </span>
                    {img?.wasFallback && (
                      <Badge variant="secondary" className="text-xs">
                        fallback
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">
                    {stanza.text}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-900 rounded-md overflow-hidden flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={stanza.label}
                        className="w-full h-full object-cover"
                      />
                    ) : err ? (
                      <div className="text-center px-4 text-xs text-red-600 dark:text-red-400">
                        <ImageOff className="h-6 w-6 mx-auto mb-2" />
                        {err}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {isGenerating ? 'Queued…' : 'Not generated yet'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerate(stanza)}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {img ? 'Regenerate' : 'Generate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => img && handleDownloadOne(img)}
                      disabled={!img}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
