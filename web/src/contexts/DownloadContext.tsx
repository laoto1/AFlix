import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { downloadChapterAsZip } from '../utils/downloader';

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error' | 'paused';

export interface DownloadChapter {
    chapterName: string;
    chapterId: string;
    chapterApiUrl: string;
    status: DownloadStatus;
    progress: number;
}

export interface DownloadItem {
    id: string; // usually sourceId-slug or sourceId-slug-singlezip
    comicName: string;
    sourceId: string;
    comicSlug: string;
    thumbUrl: string;
    status: DownloadStatus;
    progress: number;
    chapters: DownloadChapter[];
    isSingleZip?: boolean;
    isPaused?: boolean;
}

interface DownloadContextType {
    queue: DownloadItem[];
    addDownloads: (comicDetails: {
        comicName: string, sourceId: string, comicSlug: string, thumbUrl: string, isSingleZip?: boolean
    }, items: Omit<DownloadChapter, 'status' | 'progress'>[]) => void;
    removeDownload: (id: string) => void;
    clearAll: () => void;
    pauseQueue: () => void;
    resumeQueue: () => void;
    pauseItem: (id: string) => void;
    resumeItem: (id: string) => void;
    isDownloading: boolean;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const QUEUE_STORAGE_KEY = 'flix_download_queue';

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<DownloadItem[]>(() => {
        try {
            const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Reset any 'downloading' states to 'paused' on load
                return parsed.map((item: DownloadItem) => ({
                    ...item,
                    status: item.status === 'downloading' ? 'paused' : item.status,
                    isPaused: item.status === 'downloading' ? true : item.isPaused,
                    chapters: item.chapters.map(ch => ({
                        ...ch,
                        status: ch.status === 'downloading' ? 'pending' : ch.status // reset chapter download text
                    }))
                }));
            }
        } catch (e) {
            console.error('Failed to load queue from storage', e);
        }
        return [];
    });

    const [isDownloading, setIsDownloading] = useState(false);
    const isProcessingRef = useRef(false);

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }, [queue]);

    useEffect(() => {
        if (!isDownloading || isProcessingRef.current) return;

        const processNext = async () => {
            isProcessingRef.current = true;

            // Find next pending or downloading item that is not paused
            const nextItemIndex = queue.findIndex(q =>
                (q.status === 'pending' || q.status === 'downloading') && !q.isPaused
            );

            if (nextItemIndex === -1) {
                setIsDownloading(false);
                isProcessingRef.current = false;
                return;
            }

            const item = queue[nextItemIndex];

            // Handle Single Zip
            if (item.isSingleZip) {
                setQueue(prev => {
                    const newQ = [...prev];
                    const idx = newQ.findIndex(q => q.id === item.id);
                    if (idx !== -1) newQ[idx] = { ...newQ[idx], status: 'downloading', progress: 0 };
                    return newQ;
                });

                try {
                    import('../utils/downloader').then(async ({ downloadComicAsSingleZip }) => {
                        await downloadComicAsSingleZip(
                            item.comicName,
                            item.chapters,
                            (progress) => {
                                setQueue(prev => {
                                    const idx = prev.findIndex(q => q.id === item.id);
                                    if (idx === -1) return prev;
                                    const newQ = [...prev];
                                    newQ[idx] = { ...newQ[idx], progress: progress.percent };
                                    return newQ;
                                });
                            }
                        );

                        setQueue(prev => {
                            const idx = prev.findIndex(q => q.id === item.id);
                            if (idx === -1) return prev;
                            const newQ = [...prev];
                            newQ[idx] = {
                                ...newQ[idx],
                                status: 'completed',
                                progress: 100,
                                chapters: newQ[idx].chapters.map(c => ({ ...c, status: 'completed', progress: 100 }))
                            };
                            return newQ;
                        });
                        isProcessingRef.current = false;
                        setTimeout(() => { }, 100);
                    }).catch(error => {
                        console.error('Failed to import downloader or download single zip:', error);
                        setQueue(prev => {
                            const idx = prev.findIndex(q => q.id === item.id);
                            if (idx === -1) return prev;
                            const newQ = [...prev];
                            newQ[idx] = { ...newQ[idx], status: 'error', progress: 0 };
                            return newQ;
                        });
                        isProcessingRef.current = false;
                        setTimeout(() => { }, 100);
                    });
                } catch (e) {
                    isProcessingRef.current = false;
                    setTimeout(() => { }, 100);
                }
                return; // We exit this async frame while the import inside resolves independently. 
                // Alternatively, we could await the import directly since processNext is async. Let's do that for cleaner control flow.
            }

            // Normal Chapter-by-chapter Zip Handling
            const nextChapterIndex = item.chapters.findIndex(c => c.status === 'pending');

            if (nextChapterIndex === -1) {
                setQueue(prev => {
                    const newQ = [...prev];
                    const idx = newQ.findIndex(q => q.id === item.id);
                    if (idx !== -1) newQ[idx] = { ...newQ[idx], status: 'completed', progress: 100 };
                    return newQ;
                });
                isProcessingRef.current = false;
                setTimeout(() => { }, 100);
                return;
            }

            const chapter = item.chapters[nextChapterIndex];

            // Mark item as downloading
            setQueue(prev => {
                const newQ = [...prev];
                const idx = newQ.findIndex(q => q.id === item.id);
                if (idx !== -1) {
                    const newChapters = [...newQ[idx].chapters];
                    newChapters[nextChapterIndex] = { ...chapter, status: 'downloading', progress: 0 };
                    newQ[idx] = { ...newQ[idx], status: 'downloading', chapters: newChapters };
                }
                return newQ;
            });

            try {
                // Actually Download!
                await downloadChapterAsZip(
                    item.comicName,
                    chapter.chapterName,
                    chapter.chapterApiUrl,
                    (progress) => {
                        setQueue(prev => {
                            const idx = prev.findIndex(q => q.id === item.id);
                            if (idx === -1) return prev;
                            const newQ = [...prev];
                            const newChapters = [...newQ[idx].chapters];
                            newChapters[nextChapterIndex] = { ...newChapters[nextChapterIndex], progress: progress.percent };

                            // Calculate overall progress based on total chapters and current chapter progress
                            const totalChapters = newChapters.length;
                            const completedChapters = newChapters.filter(c => c.status === 'completed').length;
                            const currentProgressVal = progress.percent;
                            const overallProgress = Math.round(((completedChapters * 100) + currentProgressVal) / totalChapters);

                            newQ[idx] = { ...newQ[idx], chapters: newChapters, progress: overallProgress };
                            return newQ;
                        });
                    }
                );

                // Mark Chapter Completed
                setQueue(prev => {
                    const idx = prev.findIndex(q => q.id === item.id);
                    if (idx === -1) return prev;
                    const newQ = [...prev];
                    const newChapters = [...newQ[idx].chapters];
                    newChapters[nextChapterIndex] = { ...newChapters[nextChapterIndex], status: 'completed', progress: 100 };

                    const totalChapters = newChapters.length;
                    const completedChapters = newChapters.filter(c => c.status === 'completed').length;
                    const overallProgress = Math.round((completedChapters * 100) / totalChapters);

                    newQ[idx] = { ...newQ[idx], chapters: newChapters, progress: overallProgress };
                    return newQ;
                });

            } catch (error) {
                console.error('Download failed:', error);
                // Mark Error for chapter
                setQueue(prev => {
                    const idx = prev.findIndex(q => q.id === item.id);
                    if (idx === -1) return prev;
                    const newQ = [...prev];
                    const newChapters = [...newQ[idx].chapters];
                    newChapters[nextChapterIndex] = { ...newChapters[nextChapterIndex], status: 'error', progress: 0 };
                    newQ[idx] = { ...newQ[idx], chapters: newChapters };
                    return newQ;
                });
            } finally {
                isProcessingRef.current = false;
                setTimeout(() => { }, 100);
            }
        };

        processNext();

    }, [isDownloading, queue]);

    const addDownloads = (
        comicDetails: { comicName: string, sourceId: string, comicSlug: string, thumbUrl: string, isSingleZip?: boolean },
        items: Omit<DownloadChapter, 'status' | 'progress'>[]
    ) => {
        setQueue(prev => {
            const newQueue = [...prev];
            const groupId = comicDetails.isSingleZip
                ? `${comicDetails.sourceId}-${comicDetails.comicSlug}-singlezip`
                : `${comicDetails.sourceId}-${comicDetails.comicSlug}`;
            const existingGroupIndex = newQueue.findIndex(q => q.id === groupId);

            const newChapters: DownloadChapter[] = items.map(item => ({
                ...item,
                status: 'pending',
                progress: 0
            }));

            if (existingGroupIndex !== -1) {
                // Merge chapters into existing group
                const existingGroup = newQueue[existingGroupIndex];
                const mergedChapters = [...existingGroup.chapters];

                newChapters.forEach(newChapter => {
                    const existingChap = mergedChapters.find(c => c.chapterName === newChapter.chapterName);
                    if (!existingChap || existingChap.status === 'error') {
                        if (existingChap) {
                            existingChap.status = 'pending';
                            existingChap.progress = 0;
                        } else {
                            mergedChapters.push(newChapter);
                        }
                    }
                });

                // Reset group status if it was completed or error
                const newStatus = mergedChapters.some(c => c.status === 'pending' || c.status === 'downloading') ?
                    (existingGroup.status === 'downloading' ? 'downloading' : 'pending') : existingGroup.status;

                newQueue[existingGroupIndex] = {
                    ...existingGroup,
                    status: newStatus,
                    isPaused: false, // unsuspense if adding more
                    chapters: mergedChapters,
                    progress: existingGroup.progress // recalculate overall progress? we let processNext do it.
                };
            } else {
                // Create new group
                newQueue.push({
                    id: groupId,
                    comicName: comicDetails.comicName,
                    comicSlug: comicDetails.comicSlug,
                    sourceId: comicDetails.sourceId,
                    thumbUrl: comicDetails.thumbUrl,
                    status: 'pending',
                    progress: 0,
                    chapters: newChapters,
                    isSingleZip: comicDetails.isSingleZip,
                    isPaused: false
                });
            }

            return newQueue;
        });
    };

    const removeDownload = (id: string) => {
        setQueue(prev => prev.filter(q => q.id !== id));
    };

    const clearAll = () => {
        setQueue([]);
    };

    const pauseQueue = () => {
        setIsDownloading(false);
        setQueue(prev => prev.map(q => q.status === 'downloading' || q.status === 'pending' ? { ...q, isPaused: true } : q));
    };

    const resumeQueue = () => {
        setQueue(prev => prev.map(q => q.status === 'downloading' || q.status === 'pending' || q.status === 'paused' ? { ...q, isPaused: false, status: q.status === 'paused' ? 'pending' : q.status } : q));
        setIsDownloading(true);
    };

    const pauseItem = (id: string) => {
        setQueue(prev => prev.map(q => q.id === id ? { ...q, isPaused: true, status: q.status === 'downloading' ? 'paused' : q.status } : q));
    };

    const resumeItem = (id: string) => {
        setQueue(prev => prev.map(q => q.id === id ? { ...q, isPaused: false, status: q.status === 'paused' ? 'pending' : q.status } : q));
        setIsDownloading(true);
    };

    return (
        <DownloadContext.Provider value={{
            queue,
            addDownloads,
            removeDownload,
            clearAll,
            pauseQueue,
            resumeQueue,
            pauseItem,
            resumeItem,
            isDownloading
        }}>
            {children}
        </DownloadContext.Provider>
    );
};

export const useDownloadQueue = () => {
    const context = useContext(DownloadContext);
    if (context === undefined) {
        throw new Error('useDownloadQueue must be used within a DownloadProvider');
    }
    return context;
};
