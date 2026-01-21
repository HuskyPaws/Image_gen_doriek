import { PromptRow, XmlExportOptions } from './types';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function windowsPathToPathUrl(winPath: string): string {
  // Input: C:\Users\Name\Folder\file.jpg
  // Output: file://localhost/C:/Users/Name/Folder/file.jpg
  const forward = winPath.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(forward)) {
    return `file://localhost/${forward}`;
  }
  return `file://localhost/${forward}`;
}

export interface BuildXmemlClip {
  nr: number;
  fileName: string; // actual saved file name (jpg)
  winFullPath: string; // Windows absolute path
  startFrame: number; // inclusive
  endFrame: number;   // exclusive
}

export interface BuildXmemlInput {
  clips: BuildXmemlClip[];
  options: XmlExportOptions;
}

export function aspectToDimensions(aspect: string): { width: number; height: number } {
  switch (aspect) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '4:3':
      return { width: 2048, height: 1536 };
    case '1:1':
      return { width: 1024, height: 1024 };
    case '21:9':
      return { width: 2560, height: 1080 };
    case '3:2':
      return { width: 1920, height: 1280 };
    case '2:3':
      return { width: 1280, height: 1920 };
    case '3:4':
      return { width: 1536, height: 2048 };
    default:
      return { width: 1920, height: 1080 };
  }
}

export function buildXmeml(input: BuildXmemlInput): string {
  const { clips, options } = input;
  const fps = options.fps;
  const ntsc = !!options.ntsc; // default false
  const sequenceName = options.sequenceName || 'Timeline 1 (Resolve)';
  const startTc = options.startTimecode || '01:00:00:00';
  const width = options.width;
  const height = options.height;

  const itemsXml = clips.map((clip, idx) => {
    const id = `${clip.fileName} ${idx}`;
    const name = clip.fileName;
    const pathurl = windowsPathToPathUrl(clip.winFullPath);

    return `            <clipitem id="${escapeXml(id)}">
                <name>${escapeXml(name)}</name>
                <duration>${clip.endFrame - clip.startFrame}</duration>
                <rate>
                    <timebase>${fps}</timebase>
                    <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
                </rate>
                <start>${clip.startFrame}</start>
                <end>${clip.endFrame}</end>
                <enabled>TRUE</enabled>
                <in>0</in>
                <out>${clip.endFrame - clip.startFrame}</out>
                <file id="${escapeXml(id)}-file">
                    <duration>1</duration>
                    <rate>
                        <timebase>${fps}</timebase>
                        <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
                    </rate>
                    <name>${escapeXml(name)}</name>
                    <pathurl>${escapeXml(pathurl)}</pathurl>
                    <timecode>
                        <string>00:00:00:00</string>
                        <displayformat>NDF</displayformat>
                        <rate>
                            <timebase>${fps}</timebase>
                            <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
                        </rate>
                    </timecode>
                    <media>
                        <video>
                            <duration>1</duration>
                            <samplecharacteristics>
                                <width>${width}</width>
                                <height>${height}</height>
                            </samplecharacteristics>
                        </video>
                    </media>
                </file>
            </clipitem>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
    <sequence>
        <name>${escapeXml(sequenceName)}</name>
        <duration>${clips.length > 0 ? clips[clips.length - 1].endFrame : 0}</duration>
        <rate>
            <timebase>${fps}</timebase>
            <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
        </rate>
        <in>-1</in>
        <out>-1</out>
        <timecode>
            <string>${escapeXml(startTc)}</string>
            <frame>${fps * 3600}</frame>
            <displayformat>NDF</displayformat>
            <rate>
                <timebase>${fps}</timebase>
                <ntsc>${ntsc ? 'TRUE' : 'FALSE'}</ntsc>
            </rate>
        </timecode>
        <media>
            <video>
                <track>
${itemsXml}
                </track>
            </video>
        </media>
    </sequence>
</xmeml>`;
}






























