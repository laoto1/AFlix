import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { workerPool } from './workerPool';
import * as MTCService from '../services/metruyenchu';
import * as STVService from '../services/sangtacviet';

export interface DownloadProgress {
    loaded: number;
    total: number;
    percent: number;
}

// ── Image Download Helper ──
// Uses the shared workerPool for image proxy and handles failover
async function fetchImageWithRetry(url: string, retries = 3): Promise<Response> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        const worker = workerPool.getWorker();
        let fetchUrl = url;
        if (worker) {
            const baseUrl = worker.endsWith('/') ? worker.slice(0, -1) : worker;
            fetchUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(url)}`;
        }

        try {
            const response = await fetch(fetchUrl, { referrerPolicy: 'no-referrer' });
            if (response.status === 429 || response.status >= 500) {
                if (worker) workerPool.markDead(worker);
                lastError = new Error(`Worker returned ${response.status}`);
                continue;
            }
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${url} (Status: ${response.status})`);
            }
            return response;
        } catch (err: any) {
            if (worker && fetchUrl !== url) workerPool.markDead(worker);
            lastError = err;
        }
    }
    throw lastError || new Error(`Failed to fetch image after ${retries} retries: ${url}`);
}


/**
 * Downloads all images of a chapter and bundles them into a ZIP file.
 * Returns a promise that resolves when the download completes.
 * Can emit progress back to a callback constraint.
 */
export const downloadChapterAsZip = async (
    comicName: string,
    chapterName: string,
    chapterApiUrl: string, // the URL to fetch the chapter's image list
    onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {

    try {
        // 1. Fetch the chapter details to get the image list
        const res = await axios.get(chapterApiUrl);
        const data = res.data;

        if (data.status !== 'success' || !data.data || !data.data.item || !data.data.item.chapter_image) {
            throw new Error('Invalid chapter data format');
        }

        const chapterData = data.data.item;

        // Build URLs
        const imageUrls: string[] = chapterData.chapter_image.map((img: { image_file: string }) => {
            let file = img.image_file;
            if (file.startsWith('http')) return file;
            const path = chapterData.chapter_path ? chapterData.chapter_path + '/' : '';
            return (data.data.domain_cdn || '') + '/' + path + file;
        });

        if (imageUrls.length === 0) {
            throw new Error('No images found for this chapter');
        }

        const zip = new JSZip();
        let loaded = 0;
        const total = imageUrls.length;

        if (onProgress) {
            onProgress({ loaded, total, percent: 0 });
        }

        // 2. Fetch all images and add to zip
        // We use Promise.all to fetch concurrently, but we could also do it sequentially
        // For performance, let's fetch in parallel but limit concurrency if needed, or just Promise.all
        const fetchImage = async (url: string, index: number) => {
            const response = await fetchImageWithRetry(url, Math.max(3, workerPool.workers.length));
            const blob = await response.blob();

            // Format index with padding for correct order in zip (e.g., 001.jpg, 002.jpg)
            const paddedIndex = String(index + 1).padStart(3, '0');
            // Extract extension safely, ignoring query parameters
            let ext = 'jpg';
            try {
                const pathname = new URL(url).pathname;
                const extMatch = pathname.match(/\.([^.]+)$/);
                if (extMatch) ext = extMatch[1];
            } catch (e) {
                // Ignore URL parsing errors and fallback to jpg
            }
            const zipFileName = `${paddedIndex}.${ext}`;

            zip.file(zipFileName, blob);

            loaded++;
            if (onProgress) {
                onProgress({ loaded, total, percent: Math.round((loaded / total) * 100) });
            }
        };

        // Process images with limited concurrency (e.g., 5 at a time)
        const concurrencyLimit = 5;
        for (let i = 0; i < imageUrls.length; i += concurrencyLimit) {
            const chunk = imageUrls.slice(i, i + concurrencyLimit);
            const promises = chunk.map((url, chunkIndex) => fetchImage(url, i + chunkIndex));
            await Promise.all(promises);
        }

        // 3. Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // 4. Trigger download
        // Cleanse filename
        const safeComicName = comicName.replace(/[<>:"/\\|?*]+/g, '_');
        const safeChapterName = chapterName.replace(/[<>:"/\\|?*]+/g, '_');

        saveAs(zipBlob, `${safeComicName} - Chapter ${safeChapterName}.zip`);

    } catch (error) {
        console.error('Failed to download chapter as zip:', error);
        throw error;
    }
};

/**
 * Downloads all images across multiple chapters and bundles them into ONE single ZIP file.
 * Returns a promise that resolves when the download completes.
 * Can emit progress back to a callback.
 */
export const downloadComicAsSingleZip = async (
    comicName: string,
    chapters: { chapterName: string, chapterApiUrl: string }[],
    onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
    try {
        const zip = new JSZip();

        let totalImages = 0;
        let loadedImages = 0;

        // Pre-fetch all chapter metadata to get total images count
        const chapterDataList = [];
        for (const ch of chapters) {
            const res = await axios.get(ch.chapterApiUrl);
            const data = res.data;

            if (data.status !== 'success' || !data.data || !data.data.item || !data.data.item.chapter_image) {
                console.warn(`Invalid chapter data format for chapter ${ch.chapterName}`);
                continue;
            }

            const chapterData = data.data.item;
            const imageUrls: string[] = chapterData.chapter_image.map((img: { image_file: string }) => {
                let file = img.image_file;
                if (file.startsWith('http')) return file;
                const path = chapterData.chapter_path ? chapterData.chapter_path + '/' : '';
                return (data.data.domain_cdn || '') + '/' + path + file;
            });

            if (imageUrls.length > 0) {
                totalImages += imageUrls.length;
                chapterDataList.push({
                    chapterName: ch.chapterName,
                    imageUrls
                });
            }
        }

        if (totalImages === 0) {
            throw new Error('No images found for the given chapters');
        }

        if (onProgress) {
            onProgress({ loaded: 0, total: totalImages, percent: 0 });
        }

        const concurrencyLimit = 5;

        // Process chapters sequentially to keep memory in check, but fetch images semi-concurrently
        for (const chData of chapterDataList) {
            const folder = zip.folder(`Chapter ${chData.chapterName}`);
            if (!folder) continue;

            const fetchImage = async (url: string, index: number) => {
                const response = await fetchImageWithRetry(url, Math.max(3, workerPool.workers.length));
                const blob = await response.blob();

                const paddedIndex = String(index + 1).padStart(3, '0');
                let ext = 'jpg';
                try {
                    const pathname = new URL(url).pathname;
                    const extMatch = pathname.match(/\.([^.]+)$/);
                    if (extMatch) ext = extMatch[1];
                } catch (e) {
                    // Ignore error and fallback to jpg
                }
                const zipFileName = `${paddedIndex}.${ext}`;

                folder.file(zipFileName, blob);

                loadedImages++;
                if (onProgress) {
                    onProgress({ loaded: loadedImages, total: totalImages, percent: Math.round((loadedImages / totalImages) * 100) });
                }
            };

            for (let i = 0; i < chData.imageUrls.length; i += concurrencyLimit) {
                const chunk = chData.imageUrls.slice(i, i + concurrencyLimit);
                const promises = chunk.map((url, chunkIndex) => fetchImage(url, i + chunkIndex));
                await Promise.all(promises);
            }
        }

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Trigger download
        const safeComicName = comicName.replace(/[<>:"/\\|?*]+/g, '_');
        saveAs(zipBlob, `${safeComicName} - All Chapters.zip`);

    } catch (error) {
        console.error('Failed to download comic as single zip:', error);
        throw error;
    }
};

/**
 * Downloads multiple novel chapters and compiles them into a single TXT file.
 */
export const downloadNovelAsTxt = async (
    novelName: string,
    sourceId: string,
    host: string,
    bookId: string,
    chapters: { chapterName: string, chapterId: string, chapterApiData?: string }[],
    onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
    try {
        const totalToDownload = chapters.length;
        if (totalToDownload === 0) throw new Error('No chapters to download');

        if (onProgress) {
            onProgress({ loaded: 0, total: totalToDownload, percent: 0 });
        }

        const compiledText: string[] = [`${novelName}\n\n`];
        
        const htmlToText = (html: string) => {
            const temp = document.createElement('div');
            temp.innerHTML = html.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
            return temp.textContent || temp.innerText || "";
        };

        const concurrencyLimit = 3;
        let currentIndex = 0;
        let downloadedCount = 0;

        const worker = async () => {
            while (currentIndex < chapters.length) {
                const idx = currentIndex++;
                const chapter = chapters[idx];
                const cId = chapter.chapterApiData || chapter.chapterId;
                
                try {
                    const res = sourceId === 'metruyenchu' 
                        ? await MTCService.fetchNovelChapterContent(bookId, cId)
                        : await STVService.fetchNovelChapterContent(host, bookId, cId);
                    
                    const data = sourceId === 'metruyenchu' ? res.data : res.data;
                    const chapterNameStr = data?.name || chapter.chapterName || `Chương ${idx + 1}`;
                    const content = data?.content || '';
                    
                    compiledText[idx + 1] = `\n\n${chapterNameStr}\n\n${htmlToText(content)}`;
                } catch (error) {
                    compiledText[idx + 1] = `\n\n${chapter.chapterName || 'Chương lỗi'}\n\n(Lỗi tải chương này)`;
                }

                downloadedCount++;
                if (onProgress) {
                    onProgress({ loaded: downloadedCount, total: totalToDownload, percent: Math.round((downloadedCount / totalToDownload) * 100) });
                }
            }
        };

        const workers = Array.from({ length: concurrencyLimit }, () => worker());
        await Promise.all(workers);

        // Download Blob
        const finalContent = compiledText.join('');
        const blob = new Blob([finalContent], { type: 'text/plain;charset=utf-8' });
        
        const safeNovelName = novelName.replace(/[<>:"/\\|?*]+/g, '_');
        saveAs(blob, `${safeNovelName}_${chapters[0].chapterName}-${chapters[chapters.length-1].chapterName}.txt`);

    } catch (error) {
        console.error('Failed to download novel:', error);
        throw error;
    }
};
