import { SrtCue } from './types';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function timeStringToMs(time: string): number {
  // Expects HH:MM:SS,mmm
  const match = time.trim().match(/^(\d{2}):(\d{2}):(\d{2}),(\d{1,3})$/);
  if (!match) return 0;
  const [, hh, mm, ss, ms] = match;
  const hours = parseInt(hh, 10) || 0;
  const minutes = parseInt(mm, 10) || 0;
  const seconds = parseInt(ss, 10) || 0;
  const millis = parseInt(ms, 10) || 0;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

export function msToTimeString(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const millis = Math.max(0, ms % 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const msStr = millis.toString().padStart(3, '0');
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)},${msStr}`;
}

export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

export function msToFrames(ms: number, fps: number): number {
  return secondsToFrames(ms / 1000, fps);
}

export function mmssRange(startMs: number, endMs: number): string {
  function toMMSS(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;
    return `${pad2(mm)}:${pad2(ss)}`;
  }
  return `${toMMSS(startMs)}-${toMMSS(endMs)}`;
}

export function parseSrt(srtText: string): SrtCue[] {
  const lines = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SrtCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const idxLine = lines[i].trim();
    if (!idxLine) { i++; continue; }
    const index = parseInt(idxLine, 10);
    if (isNaN(index)) { i++; continue; }
    i++;

    const timingLine = lines[i]?.trim() || '';
    const tMatch = timingLine.match(/^(\d{2}:\d{2}:\d{2},\d{1,3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{1,3})/);
    if (!tMatch) { i++; continue; }
    const start = tMatch[1];
    const end = tMatch[2];
    i++;

    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }

    const text = textLines.join('\n').trim();
    const startMs = timeStringToMs(start);
    const endMs = timeStringToMs(end);

    cues.push({ index, start, end, startMs, endMs, text });

    // Skip blank separator
    while (i < lines.length && lines[i].trim() === '') i++;
  }
  return cues.sort((a, b) => a.startMs - b.startMs);
}






























