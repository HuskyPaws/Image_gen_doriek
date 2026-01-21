import { WikimediaImage } from './types';

const WIKIMEDIA_API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';

// Public domain license identifiers that indicate "no restrictions"
const PUBLIC_DOMAIN_LICENSES = [
  'pd',
  'public domain',
  'cc0',
  'cc-zero',
  'pd-us',
  'pd-old',
  'pd-old-70',
  'pd-old-100',
  'pd-art',
  'pd-usgov',
  'pd-usgov-military',
  'pd-usgov-military-army',
  'pd-usgov-military-navy',
  'pd-usgov-military-air force',
  'pd-usgov-nasa',
  'pd-usgov-noaa',
  'pd-author',
  'pd-self',
  'pd-ineligible',
  'pd-textlogo',
  'pd-shape',
  'pd-simple',
  'pd-release',
  'pd-because',
  'pd-user',
];

// Creative Commons licenses that allow reuse (with attribution)
const CC_REUSABLE_LICENSES = [
  'cc by',
  'cc-by',
  'cc by-sa',
  'cc-by-sa',
  'cc by 2.0',
  'cc by 2.5',
  'cc by 3.0',
  'cc by 4.0',
  'cc by-sa 2.0',
  'cc by-sa 2.5',
  'cc by-sa 3.0',
  'cc by-sa 4.0',
];

/**
 * Check if a license string indicates public domain / no restrictions
 */
export function isPublicDomain(licenseShortName: string): boolean {
  if (!licenseShortName) return false;
  const lower = licenseShortName.toLowerCase().trim();
  return PUBLIC_DOMAIN_LICENSES.some(pd => lower.includes(pd));
}

/**
 * Check if a license is a reusable Creative Commons license (requires attribution)
 */
export function isCreativeCommonsReusable(licenseShortName: string): boolean {
  if (!licenseShortName) return false;
  const lower = licenseShortName.toLowerCase().trim();
  // Exclude licenses with NC (non-commercial) or ND (no derivatives)
  if (lower.includes('-nc') || lower.includes('-nd')) return false;
  return CC_REUSABLE_LICENSES.some(cc => lower.includes(cc));
}

/**
 * Get license type: 'pd' (public domain), 'cc' (creative commons), or 'other'
 */
export function getLicenseType(licenseShortName: string): 'pd' | 'cc' | 'other' {
  if (isPublicDomain(licenseShortName)) return 'pd';
  if (isCreativeCommonsReusable(licenseShortName)) return 'cc';
  return 'other';
}

/**
 * Extract clean description from HTML
 */
function cleanHtmlDescription(html: string): string {
  if (!html) return '';
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
    .substring(0, 500); // Limit description length
}

/**
 * Parse Wikimedia API response into WikimediaImage objects
 */
function parseWikimediaResponse(data: any): WikimediaImage[] {
  const pages = data?.query?.pages;
  if (!pages) return [];

  const images: WikimediaImage[] = [];

  for (const pageId in pages) {
    const page = pages[pageId];
    if (!page.imageinfo || page.imageinfo.length === 0) continue;

    const info = page.imageinfo[0];
    const extmetadata = info.extmetadata || {};

    // Extract license information
    const licenseShortName = extmetadata.LicenseShortName?.value || '';
    const licenseUrl = extmetadata.LicenseUrl?.value || '';
    
    // Determine license type
    const licenseType = getLicenseType(licenseShortName);

    // Extract other metadata
    const author = extmetadata.Artist?.value 
      ? cleanHtmlDescription(extmetadata.Artist.value) 
      : undefined;
    const description = extmetadata.ImageDescription?.value 
      ? cleanHtmlDescription(extmetadata.ImageDescription.value) 
      : undefined;

    images.push({
      pageid: parseInt(pageId),
      title: page.title || '',
      thumbnailUrl: info.thumburl || info.url || '',
      fullUrl: info.url || '',
      width: info.width || 0,
      height: info.height || 0,
      license: licenseShortName,
      licenseUrl: licenseUrl || undefined,
      author,
      description,
      isPublicDomain: licenseType === 'pd',
      licenseType,
    });
  }

  return images;
}

/**
 * Search Wikimedia Commons for images matching a query
 * Returns all results, use filterPublicDomain to get only PD images
 * 
 * IMPORTANT: Uses filetype:bitmap to ONLY return actual images (not PDFs, videos, etc.)
 * This prevents irrelevant results from OCR-indexed PDFs
 */
export async function searchWikimediaCommons(
  query: string,
  limit: number = 20
): Promise<WikimediaImage[]> {
  if (!query.trim()) return [];

  // CRITICAL: Add filetype:bitmap to filter to ONLY bitmap images
  // This prevents PDFs and other file types from appearing in results
  // The Wikimedia search indexes full text of PDFs via OCR, so without this filter,
  // completely unrelated PDFs can appear in search results
  const searchQuery = `${query.trim()} filetype:bitmap`;

  // Build the API URL with parameters
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6', // File namespace only
    gsrsearch: searchQuery,
    gsrlimit: Math.min(limit, 50).toString(), // API max is 50
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '300', // Thumbnail width
    format: 'json',
    origin: '*', // CORS support
  });

  const url = `${WIKIMEDIA_API_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikimedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return parseWikimediaResponse(data);
  } catch (error) {
    console.error('Error searching Wikimedia Commons:', error);
    throw error;
  }
}

/**
 * Filter images to only include public domain / no restrictions
 */
export function filterPublicDomain(images: WikimediaImage[]): WikimediaImage[] {
  return images.filter(img => img.isPublicDomain);
}

/**
 * Filter images to include public domain and creative commons (reusable)
 */
export function filterReusable(images: WikimediaImage[]): WikimediaImage[] {
  return images.filter(img => img.licenseType === 'pd' || img.licenseType === 'cc');
}

/**
 * Search Wikimedia Commons and return only public domain images
 */
export async function searchPublicDomainImages(
  query: string,
  limit: number = 20
): Promise<WikimediaImage[]> {
  const allImages = await searchWikimediaCommons(query, limit * 2); // Fetch more to account for filtering
  const pdImages = filterPublicDomain(allImages);
  return pdImages.slice(0, limit);
}

/**
 * Search Wikimedia Commons with license filter options
 * 
 * @param query - Search query
 * @param options.limit - Max number of results to return
 * @param options.includeCC - Include CC-licensed images (require attribution)
 * @param options.searchInTitle - If true, searches only in file titles (more precise)
 */
export async function searchWithLicenseFilter(
  query: string,
  options: {
    limit?: number;
    includeCC?: boolean;  // Include CC-licensed images (require attribution)
    searchInTitle?: boolean; // Search only in file titles for more relevant results
  } = {}
): Promise<{ images: WikimediaImage[]; totalFound: number; pdCount: number; ccCount: number }> {
  const { limit = 20, includeCC = false, searchInTitle = false } = options;
  
  // Optionally wrap query to search only in titles for more relevant results
  // intitle:"query" searches only in file names, not full-text content
  const searchQuery = searchInTitle ? `intitle:"${query.trim()}"` : query;
  
  // Fetch maximum (50) to find as many PD images as possible
  // PD images are often scattered throughout search results
  const allImages = await searchWikimediaCommons(searchQuery, 50);
  
  // Count by license type
  const pdCount = allImages.filter(img => img.licenseType === 'pd').length;
  const ccCount = allImages.filter(img => img.licenseType === 'cc').length;
  
  // Filter based on options
  let filteredImages: WikimediaImage[];
  if (includeCC) {
    filteredImages = filterReusable(allImages);
  } else {
    filteredImages = filterPublicDomain(allImages);
  }
  
  return {
    images: filteredImages.slice(0, limit),
    totalFound: allImages.length,
    pdCount,
    ccCount,
  };
}

/**
 * Get detailed information about a specific image by filename
 */
export async function getImageDetails(filename: string): Promise<WikimediaImage | null> {
  // Ensure filename starts with "File:"
  const normalizedFilename = filename.startsWith('File:') ? filename : `File:${filename}`;

  const params = new URLSearchParams({
    action: 'query',
    titles: normalizedFilename,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1200', // Larger thumbnail for details view
    format: 'json',
    origin: '*',
  });

  const url = `${WIKIMEDIA_API_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikimedia API error: ${response.status}`);
    }

    const data = await response.json();
    const images = parseWikimediaResponse(data);
    return images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error('Error fetching image details:', error);
    return null;
  }
}

/**
 * Download an image and return it as a Blob
 */
export async function downloadImage(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  return response.blob();
}

/**
 * Generate attribution text for an image (good practice even for PD)
 */
export function generateAttribution(image: WikimediaImage): string {
  const parts: string[] = [];
  
  // Title without "File:" prefix
  const cleanTitle = image.title.replace(/^File:/, '');
  parts.push(cleanTitle);
  
  if (image.author) {
    parts.push(`by ${image.author}`);
  }
  
  parts.push(`via Wikimedia Commons`);
  
  if (image.license) {
    parts.push(`(${image.license})`);
  }
  
  return parts.join(' ');
}

/**
 * Get the Wikimedia Commons page URL for an image
 */
export function getCommonsPageUrl(image: WikimediaImage): string {
  const encodedTitle = encodeURIComponent(image.title);
  return `https://commons.wikimedia.org/wiki/${encodedTitle}`;
}

/**
 * Search multiple queries in parallel and aggregate results
 */
export async function searchMultipleQueries(
  queries: string[],
  limitPerQuery: number = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, WikimediaImage[]>> {
  const results = new Map<string, WikimediaImage[]>();
  let completed = 0;
  const total = queries.length;

  // Process in batches of 3 to avoid rate limiting
  const BATCH_SIZE = 3;
  
  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const batch = queries.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (query) => {
        try {
          const images = await searchPublicDomainImages(query, limitPerQuery);
          return { query, images };
        } catch (error) {
          console.error(`Error searching for "${query}":`, error);
          return { query, images: [] };
        }
      })
    );

    for (const { query, images } of batchResults) {
      results.set(query, images);
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    }

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

