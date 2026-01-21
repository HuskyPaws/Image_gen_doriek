import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { GeneratedImage } from './types';
import { downloadImageAsBlob } from './api';

export type ExportImageFormat = 'original' | 'png' | 'jpeg' | 'webp';

interface ExportOptions {
  format?: ExportImageFormat;
  quality?: number; // 0..1 for lossy formats
  background?: string; // used when converting images with transparency to opaque formats
}

function replaceExtension(fileName: string, newExt: ExportImageFormat): string {
  const ext = newExt === 'original' ? '' : `.${newExt}`;
  if (newExt === 'original') return fileName;
  const idx = fileName.lastIndexOf('.');
  const base = idx > -1 ? fileName.slice(0, idx) : fileName;
  return `${base}${ext}`;
}

async function convertBlob(
  inputBlob: Blob,
  targetFormat: Exclude<ExportImageFormat, 'original'>,
  quality: number = 0.92,
  background?: string
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(inputBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D context for canvas');

    if (targetFormat === 'jpeg' && background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const mime = `image/${targetFormat}`;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), mime, quality);
    });
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadImagesAsZip(
  images: GeneratedImage[],
  projectName: string,
  onProgress?: (current: number, total: number) => void,
  options: ExportOptions = {}
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(projectName || 'Generated Images');

  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  // Sort images by creation date
  const sortedImages = [...images].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Create a text file with all prompts (match sequential filenames)
  const promptsText = sortedImages
    .map((img, index) => {
      const seq = String(index + 1).padStart(3, '0');
      return `${index + 1}. ${seq}\nPrompt: ${img.prompt}\nCreated: ${new Date(img.createdAt).toLocaleString()}\n`;
    })
    .join('\n');
  
  folder.file('prompts.txt', promptsText);

  // Download and add each image to the ZIP
  for (let i = 0; i < sortedImages.length; i++) {
    const image = sortedImages[i];
    onProgress?.(i, sortedImages.length);

    try {
      const originalBlob = await downloadImageAsBlob(image.url);
      let blobToSave = originalBlob;

      // Determine file extension
      const seq = String(i + 1).padStart(3, '0');
      const inferExt = (): string => {
        if (options.format && options.format !== 'original') {
          return options.format;
        }
        // Try from fileName
        const idx = image.fileName.lastIndexOf('.');
        if (idx > -1) return image.fileName.slice(idx + 1).toLowerCase();
        // Try from contentType
        if (image.contentType && image.contentType.startsWith('image/')) {
          return image.contentType.split('/')[1].toLowerCase();
        }
        return 'png';
      };
      let ext = inferExt();

      if (options.format && options.format !== 'original') {
        const targetFormat = options.format;
        blobToSave = await convertBlob(
          originalBlob,
          targetFormat,
          options.quality ?? (targetFormat === 'jpeg' ? 0.92 : 0.92),
          options.background ?? (targetFormat === 'jpeg' ? '#ffffff' : undefined)
        );
        ext = targetFormat;
      }

      const targetFileName = `${seq}.${ext}`;
      folder.file(targetFileName, blobToSave);
    } catch (error) {
      console.error(`Failed to download image ${image.fileName}:`, error);
      // Continue with other images
    }
  }

  onProgress?.(sortedImages.length, sortedImages.length);

  // Generate and download the ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `${projectName || 'images'}_${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(zipBlob, zipFileName);
}

export async function downloadSingleImage(
  image: GeneratedImage,
  options: ExportOptions = {}
): Promise<void> {
  try {
    const originalBlob = await downloadImageAsBlob(image.url);
    if (!options.format || options.format === 'original') {
      saveAs(originalBlob, image.fileName);
      return;
    }

    const targetFormat = options.format;
    const converted = await convertBlob(
      originalBlob,
      targetFormat,
      options.quality ?? (targetFormat === 'jpeg' ? 0.92 : 0.92),
      options.background ?? (targetFormat === 'jpeg' ? '#ffffff' : undefined)
    );
    const fileName = replaceExtension(image.fileName, targetFormat);
    saveAs(converted, fileName);
  } catch (error) {
    console.error('Failed to download image:', error);
    throw new Error('Failed to download image');
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function estimateZipSize(images: GeneratedImage[]): string {
  const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
  // ZIP compression typically reduces image file sizes by 5-15%, but we'll be conservative
  const estimatedZipSize = totalSize * 0.9;
  return formatFileSize(estimatedZipSize);
} 