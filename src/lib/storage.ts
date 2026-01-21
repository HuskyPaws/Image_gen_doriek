import { Project, GeneratedImage, GenerationJob, GenerationLogEntry, ChunkPrompt } from './types';
import { getAll as idbGetAll, getByIndex as idbGetByIndex, put as idbPut, putMany as idbPutMany, clearStore as idbClearStore, withTransaction, openDatabase } from './idb';

const STORAGE_KEYS = {
  PROJECTS: 'image-generator-projects',
  IMAGES: 'image-generator-images',
  JOBS: 'image-generator-jobs',
  GENERATION_LOGS: 'image-generator-generation-logs',
} as const;

const MIGRATION_FLAG_KEY = 'image-generator-storage-migrated-v1';

// Keep generation logs bounded to prevent localStorage quota issues
const MAX_GENERATION_LOGS = 500;

function isQuotaExceededError(error: unknown): boolean {
  if (typeof window === 'undefined') return false;
  return (
    error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      // Firefox
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      // Older WebKit
      // @ts-ignore code exists on some DOMException implementations
      (typeof (error as any).code === 'number' && (error as any).code === 22)
    )
  );
}

function trimLogsToMax(logs: GenerationLogEntry[]): GenerationLogEntry[] {
  if (logs.length <= MAX_GENERATION_LOGS) return logs;
  return logs.slice(logs.length - MAX_GENERATION_LOGS);
}

function safeLocalStorageParse<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

async function ensureMigrated(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') return;

    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('generationLogs', 'readwrite');
      const store = tx.objectStore('generationLogs');

      // Only migrate if keys are absent in IDB
      const checkReq = store.get('projects');
      checkReq.onsuccess = () => {
        const hasProjectsInIdb = checkReq.result !== undefined;
        const projects = safeLocalStorageParse<Project[]>(STORAGE_KEYS.PROJECTS, []);
        const images = safeLocalStorageParse<GeneratedImage[]>(STORAGE_KEYS.IMAGES, []);
        const jobs = safeLocalStorageParse<GenerationJob[]>(STORAGE_KEYS.JOBS, []);

        if (!hasProjectsInIdb && (projects.length > 0 || images.length > 0 || jobs.length > 0)) {
          if (projects) store.put({ id: 'projects', value: projects });
          if (images) store.put({ id: 'images', value: images });
          if (jobs) store.put({ id: 'jobs', value: jobs });
        }
      };
      checkReq.onerror = () => reject(checkReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch {
    // best-effort migration; ignore errors
  }
}

// Helper function to safely parse JSON from localStorage
function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Project storage functions
export async function getProjects(): Promise<Project[]> {
  if (typeof window === 'undefined') return [];
  await ensureMigrated();
  // Store projects in IDB as a single list under key 'projects'
  const db = await openDatabase();
  return new Promise<Project[]>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readonly');
    const store = tx.objectStore('generationLogs');
    const req = store.get('projects');
    req.onsuccess = () => {
      const value = (req.result as any)?.value;
      if (value !== undefined) return resolve(value as Project[]);
      // Fallback read from localStorage if not found in IDB
      const fallback = safeLocalStorageParse<Project[]>(STORAGE_KEYS.PROJECTS, []);
      resolve(fallback);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjects(projects: Project[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readwrite');
    const store = tx.objectStore('generationLogs');
    store.put({ id: 'projects', value: projects });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function createProject(name: string, description?: string, chunkPromptsData?: ChunkPrompt[]): Promise<Project> {
  const projects = await getProjects();
  const newProject: Project = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageCount: 0,
    chunkPromptsData,
  };
  
  projects.push(newProject);
  await saveProjects(projects);
  return newProject;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await saveProjects(projects);
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await getProjects();
  const filteredProjects = projects.filter(p => p.id !== id);
  
  if (filteredProjects.length === projects.length) return false;
  
  await saveProjects(filteredProjects);
  
  // Also delete associated images
  const images = await getImages();
  const filteredImages = images.filter(img => img.projectId !== id);
  await saveImages(filteredImages);
  
  return true;
}

// Image storage functions
export async function getImages(): Promise<GeneratedImage[]> {
  if (typeof window === 'undefined') return [];
  await ensureMigrated();
  const db = await openDatabase();
  return new Promise<GeneratedImage[]>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readonly');
    const store = tx.objectStore('generationLogs');
    const req = store.get('images');
    req.onsuccess = () => {
      const value = (req.result as any)?.value;
      if (value !== undefined) return resolve(value as GeneratedImage[]);
      const fallback = safeLocalStorageParse<GeneratedImage[]>(STORAGE_KEYS.IMAGES, []);
      resolve(fallback);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveImages(images: GeneratedImage[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readwrite');
    const store = tx.objectStore('generationLogs');
    store.put({ id: 'images', value: images });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImagesByProject(projectId: string): Promise<GeneratedImage[]> {
  const all = await getImages();
  return all.filter(img => img.projectId === projectId);
}

export async function addImage(image: GeneratedImage, skipCountIncrement: boolean = false): Promise<void> {
  try {
    const images = await getImages();
    
    // Check for duplicate IDs to prevent overwriting
    const existingIndex = images.findIndex(img => img.id === image.id);
    if (existingIndex !== -1) {
      console.warn(`⚠️ Duplicate image ID detected: ${image.id}, skipping save`);
      return;
    }
    
    images.push(image);
    await saveImages(images);
    
    console.log(`✅ Image saved successfully: ${image.id} (Total images: ${images.length})`);
    
    // Update project image count (skip if recovering already-counted images)
    if (!skipCountIncrement) {
      const projects = await getProjects();
      const projectIndex = projects.findIndex(p => p.id === image.projectId);
      if (projectIndex !== -1) {
        projects[projectIndex].imageCount += 1;
        projects[projectIndex].updatedAt = new Date().toISOString();
        await saveProjects(projects);
      }
    }
  } catch (error) {
    console.error('❌ Failed to save image:', error);
    throw error; // Re-throw to let caller know it failed
  }
}

export async function deleteImage(imageId: string): Promise<boolean> {
  const images = await getImages();
  const imageToDelete = images.find(img => img.id === imageId);
  
  if (!imageToDelete) return false;
  
  const filteredImages = images.filter(img => img.id !== imageId);
  await saveImages(filteredImages);
  
  // Update project image count
  const projects = await getProjects();
  const projectIndex = projects.findIndex(p => p.id === imageToDelete.projectId);
  if (projectIndex !== -1) {
    projects[projectIndex].imageCount = Math.max(0, projects[projectIndex].imageCount - 1);
    projects[projectIndex].updatedAt = new Date().toISOString();
    await saveProjects(projects);
  }
  
  return true;
}

// Generation job storage functions
export async function getJobs(): Promise<GenerationJob[]> {
  if (typeof window === 'undefined') return [];
  await ensureMigrated();
  const db = await openDatabase();
  return new Promise<GenerationJob[]>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readonly');
    const store = tx.objectStore('generationLogs');
    const req = store.get('jobs');
    req.onsuccess = () => {
      const value = (req.result as any)?.value;
      if (value !== undefined) return resolve(value as GenerationJob[]);
      const fallback = safeLocalStorageParse<GenerationJob[]>(STORAGE_KEYS.JOBS, []);
      resolve(fallback);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveJobs(jobs: GenerationJob[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readwrite');
    const store = tx.objectStore('generationLogs');
    store.put({ id: 'jobs', value: jobs });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addJob(job: GenerationJob): Promise<void> {
  const jobs = await getJobs();
  jobs.push(job);
  await saveJobs(jobs);
}

export async function updateJob(jobId: string, updates: Partial<GenerationJob>): Promise<GenerationJob | null> {
  const jobs = await getJobs();
  const index = jobs.findIndex(j => j.id === jobId);
  
  if (index === -1) return null;
  
  jobs[index] = { ...jobs[index], ...updates };
  await saveJobs(jobs);
  return jobs[index];
}

export async function getJobsByProject(projectId: string): Promise<GenerationJob[]> {
  const all = await getJobs();
  return all.filter(job => job.projectId === projectId);
}

// Generation log storage functions (use IndexedDB for larger capacity)
export async function getGenerationLogs(): Promise<GenerationLogEntry[]> {
  if (typeof window === 'undefined') return [];
  return idbGetAll<GenerationLogEntry>('generationLogs');
}

export async function saveGenerationLogs(logs: GenerationLogEntry[]): Promise<void> {
  if (typeof window === 'undefined') return;
  await idbClearStore('generationLogs');
  await idbPutMany('generationLogs', logs);
}

export async function getGenerationLogsByProject(projectId: string): Promise<GenerationLogEntry[]> {
  if (typeof window === 'undefined') return [];
  return idbGetByIndex<GenerationLogEntry>('generationLogs', 'projectId', projectId);
}

export async function getGenerationLogsBySession(sessionId: string): Promise<GenerationLogEntry[]> {
  if (typeof window === 'undefined') return [];
  return idbGetByIndex<GenerationLogEntry>('generationLogs', 'sessionId', sessionId);
}

export async function addGenerationLog(log: GenerationLogEntry): Promise<void> {
  if (typeof window === 'undefined') return;
  await idbPut('generationLogs', log);
}

export async function clearGenerationLogsByProject(projectId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  // Delete via index cursor for the specific project
  const db = await (await import('./idb')).openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readwrite');
    const index = tx.objectStore('generationLogs').index('projectId');
    const request = index.openCursor(IDBKeyRange.only(projectId));
    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearGenerationLogsBySession(sessionId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await (await import('./idb')).openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('generationLogs', 'readwrite');
    const index = tx.objectStore('generationLogs').index('sessionId');
    const request = index.openCursor(IDBKeyRange.only(sessionId));
    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Cleanup functions
export async function cleanupOldJobs(daysOld: number = 7): Promise<void> {
  const jobs = await getJobs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const filteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.createdAt);
    return jobDate > cutoffDate || job.status === 'generating';
  });
  
  if (filteredJobs.length !== jobs.length) {
    await saveJobs(filteredJobs);
  }
}

// Export/Import functions for backup
export interface ExportData {
  projects: Project[];
  images: GeneratedImage[];
  jobs: GenerationJob[];
  generationLogs: GenerationLogEntry[];
  exportedAt: string;
}

export async function exportData(): Promise<ExportData> {
  return {
    projects: await getProjects(),
    images: await getImages(),
    jobs: await getJobs(),
    generationLogs: await getGenerationLogs(),
    exportedAt: new Date().toISOString(),
  };
}

export async function importData(data: ExportData): Promise<boolean> {
  try {
    await saveProjects(data.projects || []);
    await saveImages(data.images || []);
    await saveJobs(data.jobs || []);
    await saveGenerationLogs(data.generationLogs || []);
    return true;
  } catch {
    return false;
  }
}