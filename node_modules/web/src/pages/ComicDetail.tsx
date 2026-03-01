import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Bookmark, Loader2, ArrowLeft, ListPlus, DownloadCloud } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { fetchComicDetails, getImageUrl } from '../services/otruyen';
import { fetchNhentaiDetail } from '../services/nhentai';
import { fetchNettruyenDetail } from '../services/nettruyen';
import { useAuth } from '../contexts/AuthContext';
import { useDownloadQueue } from '../contexts/DownloadContext';
import { useSettings } from '../contexts/SettingsContext';
import { parseChapterNumber } from '../utils/math';

const calculateRelativeTime = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Vừa xong';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} phút trước`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} ngày trước`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} tháng trước`;

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} năm trước`;
};

const ComicDetail = () => {
    const { sourceId, slug } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const { t } = useSettings();
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 80);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filter & Sort State
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [activeFilterTab, setActiveFilterTab] = useState<'filter' | 'sort' | 'display'>('filter');

    // Sort logic
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [sortCategory, setSortCategory] = useState<'source' | 'chapter'>('chapter');

    // Filter logic
    const [filterUnread, setFilterUnread] = useState(false);
    const [filterDownloaded, setFilterDownloaded] = useState(false);
    const [filterBookmarked, setFilterBookmarked] = useState(false);

    // Display logic
    const [displaySetting, setDisplaySetting] = useState<'source' | 'chapter'>('source');

    // Multi-Selection State
    const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
    const isSelectionMode = selectedChapters.length > 0;
    const longPressTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const { addDownloads, resumeQueue } = useDownloadQueue();

    const { data: historyRes, refetch: refetchHistory } = useQuery({
        queryKey: ['history', slug],
        queryFn: async () => {
            const res = await axios.get(`/api/history?comicSlug=${slug}`);
            return res.data;
        },
        enabled: !!token && !!slug,
    });
    const historyData = historyRes;

    const justLongPressed = React.useRef(false);

    const handleChapterPointerDown = (chapterName: string) => {
        if (isSelectionMode) return; // Delegate to regular click if already in selection mode

        justLongPressed.current = false;
        longPressTimeoutRef.current = setTimeout(() => {
            if (!selectedChapters.includes(chapterName)) {
                setSelectedChapters([chapterName]);
                justLongPressed.current = true;
            }
        }, 500); // 500ms long press
    };

    const handleChapterPointerUpOrLeave = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const handleChapterClick = (chapterName: string) => {
        if (justLongPressed.current) {
            justLongPressed.current = false;
            return; // ignore the click immediately following the long press
        }

        if (isSelectionMode) {
            setSelectedChapters(prev =>
                prev.includes(chapterName)
                    ? prev.filter(c => c !== chapterName)
                    : [...prev, chapterName]
            );
        } else {
            navigate(`/read/${sourceId}/${slug}/${chapterName}`);
        }
    };

    const handleBulkAction = async (action: 'mark_read' | 'mark_unread' | 'bookmark' | 'unbookmark' | 'mark_read_down') => {
        if (selectedChapters.length === 0 || !data || !token) return;
        const comicItem = data.data.item;

        // Handle "mark_read_down" logic
        let chaptersToSubmit = [...selectedChapters];

        if (action === 'mark_read_down') {
            // Find the lowest chapter number selected
            const sortedSelected = [...selectedChapters].sort((a, b) => parseFloat(a) - parseFloat(b));
            const baseChapter = sortedSelected[0];
            const baseIndex = chapters.findIndex((c: any) => c.chapter_name === baseChapter);

            if (baseIndex !== -1) {
                // Select all chapters from baseIndex and smaller numbered chapters (which are usually later in the array if sorted desc natively, but let's check values)
                const targetChapters = chapters.filter((c: any) => parseFloat(c.chapter_name) <= parseFloat(baseChapter));
                chaptersToSubmit = targetChapters.map((c: any) => c.chapter_name);
            }
        }

        try {
            const apiAction = action === 'mark_read_down' ? 'mark_read' : action;

            await axios.post('/api/history/bulk', {
                action: apiAction,
                chapters: chaptersToSubmit,
                sourceId,
                comicSlug: slug,
                comicName: comicItem.name,
                thumbUrl: comicItem.thumb_url
            });

            await refetchHistory();
            setSelectedChapters([]); // Exit selection mode
        } catch (err) {
            console.error('Failed to perform bulk action:', err);
        }
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['comic', sourceId, slug],
        queryFn: () => {
            if (sourceId === 'nhentai') return fetchNhentaiDetail(slug as string);
            if (sourceId === 'nettruyen') return fetchNettruyenDetail(slug as string);
            return fetchComicDetails(slug as string);
        },
        enabled: (sourceId === 'otruyen' || sourceId === 'nhentai' || sourceId === 'nettruyen') && !!slug,
    });

    const comic = data?.data?.item;
    const chapters = comic?.chapters?.[0]?.server_data || data?.data?.item?.server_data || [];
    const hasChapters = chapters.length > 0;

    const sortedAndFilteredChapters = React.useMemo(() => {
        let result = [...chapters];

        // Filtering
        if (filterUnread && historyData?.history) {
            result = result.filter((ch: any) => {
                const historyRecord = historyData.history.find((h: any) => h.chapter_id === ch.chapter_name);
                const isFullyRead = historyRecord && historyRecord.page_number >= historyRecord.total_pages && historyRecord.total_pages > 0;
                return !isFullyRead;
            });
        }

        if (filterDownloaded) {
            result = []; // Mock: Nothing is downloaded yet
        }

        if (filterBookmarked && historyData?.history) {
            result = result.filter((ch: any) => {
                const historyRecord = historyData.history.find((h: any) => h.chapter_id === ch.chapter_name);
                return historyRecord && historyRecord.is_bookmarked === 1;
            });
        }

        // Sorting
        result.sort((a: any, b: any) => {
            if (sortCategory === 'chapter') {
                const numA = parseFloat(a.chapter_name) || 0;
                const numB = parseFloat(b.chapter_name) || 0;
                return sortOrder === 'asc' ? numA - numB : numB - numA;
            } else {
                // Mock sort by source (alphabetical by title in this case since source is just Otruyen)
                const nameA = a.chapter_name || '';
                const nameB = b.chapter_name || '';
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
        });

        return result;
    }, [chapters, historyData, filterUnread, filterBookmarked, filterDownloaded, sortOrder, sortCategory, isBookmarked]);

    useEffect(() => {
        // Check if bookmarked on mount
        if (token && slug) {
            axios.get(`/api/bookmarks?comicSlug=${slug}`).then(res => {
                setIsBookmarked(res.data.isBookmarked);
            }).catch(console.error);
        }
    }, [token, slug]);

    const handleBookmarkToggle = async () => {
        if (!data || !token) return;
        const comic = data.data.item;

        try {
            if (isBookmarked) {
                await axios.delete('/api/bookmarks', { data: { comicSlug: slug } });
                setIsBookmarked(false);
            } else {
                await axios.post('/api/bookmarks', {
                    sourceId,
                    comicSlug: slug,
                    comicName: comic.name,
                    thumbUrl: comic.thumb_url
                });
                setIsBookmarked(true);
            }
        } catch (err) {
            console.error('Failed to toggle bookmark', err);
        }
    };

    // Memoize the highest chapter read (mathematical comparison, not chronological)
    // MUST be above early returns to obey Rules of Hooks
    const continueReadingInfo = React.useMemo(() => {
        if (!historyData?.history || historyData.history.length === 0) return null;
        let maxVal = -1;
        let best: any = null;
        for (const h of historyData.history) {
            const val = parseChapterNumber(h.chapter_id);
            if (val > maxVal || (val === maxVal && best && new Date(h.last_read_at) > new Date(best.last_read_at))) {
                maxVal = val;
                best = h;
            }
        }
        return best;
    }, [historyData]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center flex-1 min-h-screen bg-[var(--color-bg)]">
                <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
            </div>
        );
    }

    if (error || !data || data.status !== 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
                <p className="text-red-500 mb-4">Failed to load comic details.</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-[var(--color-surface-hover)] rounded">Go Back</button>
            </div>
        );
    }

    // Clean up content HTML
    const description = comic?.content ? comic.content.replace(/<[^>]*>?/gm, '') : 'No description available.';

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)]/80 backdrop-blur-md flex items-center h-14 px-2 shadow-sm transition-colors border-b border-[var(--color-border)]/50">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors shrink-0">
                    <ArrowLeft className="text-[var(--color-text)]" size={24} />
                </button>
                <div className={`ml-2 flex-1 min-w-0 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
                    <h1 className="text-[16px] font-bold text-[var(--color-text)] truncate">{comic.name}</h1>
                </div>
            </header>

            {/* Hero Section */}
            <div className="px-4 pb-6 pt-2">
                <div className="flex gap-4">
                    <img
                        src={(sourceId === 'nhentai' || sourceId === 'nettruyen') ? comic.thumb_url : getImageUrl(comic.thumb_url)}
                        alt={comic.name}
                        referrerPolicy="no-referrer"
                        className="w-28 h-40 object-cover rounded-md shadow-md"
                    />
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold leading-tight">{comic.name}</h1>
                        <p className="text-[var(--color-text-muted)] text-sm mt-1 font-medium">{comic.author?.join(', ') || t('comic.author')}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-[var(--color-surface-hover)] px-2 py-1 rounded text-[var(--color-text)] font-medium uppercase">
                                {comic.status?.toLowerCase().includes('đang') || comic.status?.toLowerCase().includes('ongoing') 
                                    ? t('comic.status.ongoing') 
                                    : comic.status?.toLowerCase().includes('hoàn') || comic.status?.toLowerCase().includes('completed') 
                                        ? t('comic.status.completed') 
                                        : comic.status || t('comic.status.ongoing')}
                            </span>
                        </div>

                        <div className="mt-auto flex flex-wrap gap-2 pt-2">
                            <button
                                className="bg-[var(--color-primary)] text-[var(--color-text)] hover:bg-[#ea580c] py-2 px-6 rounded-full font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                disabled={!hasChapters}
                                onClick={() => {
                                    let resumeChapterName = '1';
                                    let resumePage = 1;
                                    if (continueReadingInfo) {
                                        resumeChapterName = continueReadingInfo.chapter_id;
                                        resumePage = continueReadingInfo.page_number || 1;
                                    } else if (chapters.length > 0) {
                                        const extractNum = (str: string) => {
                                            const match = str.match(/\d+(\.\d+)?/);
                                            return match ? parseFloat(match[0]) : 0;
                                        };
                                        resumeChapterName = [...chapters].sort((a, b) => extractNum(a.chapter_name) - extractNum(b.chapter_name))[0].chapter_name;
                                    }
                                    navigate(`/read/${sourceId}/${slug}/${resumeChapterName}?page=${resumePage}`);
                                }}
                            >
                                <Play size={18} fill="currentColor" /> 
                                {!hasChapters ? '...' : continueReadingInfo
                                    ? `${t('comic.continue_reading')} Ch.${continueReadingInfo.chapter_id}`
                                    : t('comic.start_reading')
                                }
                            </button>
                            <button
                                onClick={handleBookmarkToggle}
                                className={`p-2 rounded-full border transition-colors flex items-center justify-center w-10 h-10 shrink-0 ${isBookmarked
                                    ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
                                aria-label="Toggle Bookmark"
                            >
                                <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Synopsis */}
                <div className="mt-6">
                    <p className="text-sm text-[var(--color-text)] opacity-90 leading-relaxed max-h-32 overflow-y-auto">
                        {description}
                    </p>
                </div>

                {/* Genres/Categories */}
                {comic.category && comic.category.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {comic.category.map((cat: any) => (
                            <button
                                key={cat.id || cat.slug}
                                onClick={() => navigate(`/search/${sourceId}?genre=${cat.slug}`)}
                                className="px-3 py-1 bg-[var(--color-surface-hover)] hover:bg-[#3d3d3d] text-[var(--color-text)] text-xs font-medium rounded-full transition-colors"
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Chapters */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4 border-b border-[var(--color-border)] pb-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold">Chapters</h2>
                            <span className="text-sm text-[var(--color-text-muted)]">{chapters.length} total</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                className="p-2 text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-full transition-colors"
                                aria-label="Queue All"
                                title={t('comic.queue_all')}
                                onClick={() => {
                                    if (data?.data.item) {
                                        const comicItem = data.data.item;
                                        const thumbUrl = comicItem.thumb_url?.startsWith('http') ? comicItem.thumb_url : getImageUrl(comicItem.thumb_url);
                                        const items = chapters.map((c: any) => ({
                                            chapterName: c.chapter_name,
                                            chapterId: c.chapter_name,
                                            chapterApiUrl: c.chapter_api_data
                                        }));
                                        addDownloads({
                                            comicName: comicItem.name,
                                            sourceId: sourceId || '',
                                            comicSlug: slug || '',
                                            thumbUrl
                                        }, items);
                                        toast.success(t('comic.added_queue'));
                                    }
                                }}
                            >
                                <ListPlus size={20} />
                            </button>
                            <button
                                className="p-2 text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-full transition-colors"
                                aria-label="Download All"
                                title={t('comic.download_all')}
                                onClick={() => {
                                    if (data?.data.item) {
                                        const comicItem = data.data.item;
                                        const thumbUrl = comicItem.thumb_url?.startsWith('http') ? comicItem.thumb_url : getImageUrl(comicItem.thumb_url);
                                        const items = chapters.map((c: any) => ({
                                            chapterName: c.chapter_name,
                                            chapterId: c.chapter_name,
                                            chapterApiUrl: c.chapter_api_data
                                        }));
                                        addDownloads({
                                            comicName: comicItem.name,
                                            sourceId: sourceId || '',
                                            comicSlug: slug || '',
                                            thumbUrl,
                                            isSingleZip: true
                                        }, items);
                                        resumeQueue();
                                        toast.success(t('comic.added_zip_queue'));
                                    }
                                }}
                            >
                                <DownloadCloud size={20} />
                            </button>
                            <button
                                className="p-2 text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-full transition-colors"
                                aria-label="Filter/Sort"
                                onClick={() => setShowFilterModal(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M7 12h10" /><path d="M10 18h4" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        {sortedAndFilteredChapters.map((chapter: any, idx: number) => {
                            const historyRecord = historyData?.history?.find((h: any) => h.chapter_id === chapter.chapter_name);
                            const isFullyRead = historyRecord && historyRecord.page_number >= historyRecord.total_pages && historyRecord.total_pages > 0;
                            const isPartiallyRead = historyRecord && !isFullyRead;

                            const readDate = historyRecord ? new Date(historyRecord.last_read_at).toLocaleDateString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: '2-digit'
                            }) : null;

                            const isSelected = selectedChapters.includes(chapter.chapter_name);
                            
                            let displayTime = chapter.update_time || '';
                            if (!displayTime && sourceId === 'otruyen' && comic?.updatedAt) {
                                displayTime = calculateRelativeTime(comic.updatedAt);
                            }

                            return (
                                <div
                                    key={chapter.chapter_name || idx}
                                    className={`flex justify-between items-center w-full p-4 rounded-xl transition-colors group select-none ${isSelected ? 'bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                                        }`}
                                    onPointerDown={() => handleChapterPointerDown(chapter.chapter_name)}
                                    onPointerUp={handleChapterPointerUpOrLeave}
                                    onPointerLeave={handleChapterPointerUpOrLeave}
                                    onClick={() => handleChapterClick(chapter.chapter_name)}
                                >
                                    <div className={`flex flex-col flex-1 cursor-pointer transition-opacity ${isFullyRead && !isSelected ? 'opacity-50' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-2">
                                            {historyRecord?.is_bookmarked === 1 && (
                                                <Bookmark size={14} className="text-[var(--color-primary)] fill-[#f97316]" />
                                            )}
                                            <span className="font-medium text-[15px]">Chapter {chapter.chapter_name}</span>
                                        </div>
                                        {historyRecord && (
                                            <span className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                                                {readDate}
                                                {isPartiallyRead && ` • Trang: ${historyRecord.page_number}`}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {displayTime && (
                                        <div className="flex items-center text-xs text-[var(--color-text-muted)] italic mr-2 whitespace-nowrap opacity-75">
                                            {displayTime}
                                        </div>
                                    )}

                                    <div className={`flex items-center gap-1 transition-opacity ${isSelected ? 'opacity-0 pointer-events-none' : 'opacity-100'} ml-2`}>
                                        <button
                                            className="p-2 text-[var(--color-text-muted)] opacity-50 hover:text-[var(--color-primary)] hover:opacity-100 group-hover:opacity-100 lg:opacity-0 transition-colors"
                                            title={t('comic.add_queue')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (data?.data.item) {
                                                    const comicItem = data.data.item;
                                                    const thumbUrl = comicItem.thumb_url?.startsWith('http') ? comicItem.thumb_url : getImageUrl(comicItem.thumb_url);
                                                    addDownloads({
                                                        comicName: comicItem.name,
                                                        sourceId: sourceId || '',
                                                        comicSlug: slug || '',
                                                        thumbUrl
                                                    }, [{
                                                        chapterName: chapter.chapter_name,
                                                        chapterId: chapter.chapter_name,
                                                        chapterApiUrl: chapter.chapter_api_data
                                                    }]);
                                                    toast.success(t('comic.added_chapter', { number: chapter.chapter_name }));
                                                }
                                            }}
                                        >
                                            <ListPlus size={20} />
                                        </button>
                                        <button
                                            className="p-2 text-[var(--color-text-muted)] opacity-50 hover:text-[var(--color-text)] hover:opacity-100 group-hover:opacity-100 lg:opacity-0 transition-colors"
                                            title={t('comic.download_now')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (data?.data.item && chapter.chapter_api_data) {
                                                    const comicItem = data.data.item;
                                                    const thumbUrl = comicItem.thumb_url?.startsWith('http') ? comicItem.thumb_url : getImageUrl(comicItem.thumb_url);
                                                    addDownloads({
                                                        comicName: comicItem.name,
                                                        sourceId: sourceId || '',
                                                        comicSlug: slug || '',
                                                        thumbUrl
                                                    }, [{
                                                        chapterName: chapter.chapter_name,
                                                        chapterId: chapter.chapter_name,
                                                        chapterApiUrl: chapter.chapter_api_data
                                                    }]);
                                                    resumeQueue();
                                                    toast.success(t('comic.added_chapter_queue', { number: chapter.chapter_name }));
                                                }
                                            }}
                                        >
                                            <DownloadCloud size={20} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {!hasChapters && (
                            <p className="text-center text-[var(--color-text-muted)] mt-4">{t('comic.no_chapters')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}>
                    <div
                        className="bg-[var(--color-surface)] w-full max-w-screen-md rounded-t-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Tabs */}
                        <div className="flex border-b border-[var(--color-border)]">
                            <button
                                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeFilterTab === 'filter' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                                onClick={() => setActiveFilterTab('filter')}
                            >
                                {t('comic.filter')}
                            </button>
                            <button
                                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeFilterTab === 'sort' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                                onClick={() => setActiveFilterTab('sort')}
                            >
                                {t('comic.sort')}
                            </button>
                            <button
                                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeFilterTab === 'display' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                                onClick={() => setActiveFilterTab('display')}
                            >
                                {t('comic.display')}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 min-h-[40vh] bg-[var(--color-bg)]">
                            {activeFilterTab === 'filter' && (
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--color-surface)] rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 accent-[#f97316] rounded"
                                            checked={filterDownloaded}
                                            onChange={(e) => setFilterDownloaded(e.target.checked)}
                                        />
                                        <span className="text-[var(--color-text)]">{t('comic.filter.downloaded')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--color-surface)] rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 accent-[#f97316] rounded"
                                            checked={filterUnread}
                                            onChange={(e) => setFilterUnread(e.target.checked)}
                                        />
                                        <span className="text-[var(--color-text)]">{t('comic.filter.unread')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--color-surface)] rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 accent-[#f97316] rounded"
                                            checked={filterBookmarked}
                                            onChange={(e) => setFilterBookmarked(e.target.checked)}
                                        />
                                        <span className="text-[var(--color-text)]">{t('comic.filter.bookmarked')}</span>
                                    </label>
                                </div>
                            )}
                            {activeFilterTab === 'sort' && (
                                <div className="space-y-2">
                                    <button
                                        className="flex items-center gap-3 w-full text-left p-3 hover:bg-[var(--color-surface)] rounded-lg text-[var(--color-text)]"
                                        onClick={() => {
                                            setSortCategory('source');
                                            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                                        }}
                                    >
                                        <div className="w-5 flex justify-center text-[var(--color-primary)]">
                                            {sortCategory === 'source' && (sortOrder === 'desc' ? '↓' : '↑')}
                                        </div>
                                        <span>{t('comic.sort.source')}</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-3 w-full text-left p-3 hover:bg-[var(--color-surface)] rounded-lg text-[var(--color-text)]"
                                        onClick={() => {
                                            setSortCategory('chapter');
                                            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                                        }}
                                    >
                                        <div className="w-5 flex justify-center text-[var(--color-primary)]">
                                            {sortCategory === 'chapter' && (sortOrder === 'desc' ? '↓' : '↑')}
                                        </div>
                                        <span>{t('comic.sort.chapter')}</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-3 w-full text-left p-3 hover:bg-[var(--color-surface)] rounded-lg text-[var(--color-text-muted)] cursor-not-allowed"
                                        disabled
                                    >
                                        <div className="w-5 flex justify-center text-[var(--color-primary)]" />
                                        <span>{t('comic.sort.date')}</span>
                                    </button>
                                </div>
                            )}
                            {activeFilterTab === 'display' && (
                                <div className="space-y-4 text-[var(--color-text)] p-2">
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--color-surface)] rounded-lg">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${displaySetting === 'source' ? 'border-[var(--color-primary)]' : 'border-gray-500'}`}>
                                            {displaySetting === 'source' && <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full" />}
                                        </div>
                                        <input
                                            type="radio"
                                            className="hidden"
                                            checked={displaySetting === 'source'}
                                            onChange={() => setDisplaySetting('source')}
                                        />
                                        <span>{t('comic.display.source')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-[var(--color-surface)] rounded-lg">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${displaySetting === 'chapter' ? 'border-[var(--color-primary)]' : 'border-gray-500'}`}>
                                            {displaySetting === 'chapter' && <div className="w-2.5 h-2.5 bg-[var(--color-primary)] rounded-full" />}
                                        </div>
                                        <input
                                            type="radio"
                                            className="hidden"
                                            checked={displaySetting === 'chapter'}
                                            onChange={() => setDisplaySetting('chapter')}
                                        />
                                        <span>{t('comic.display.chapter')}</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Selection Bottom Bar */}
            {isSelectionMode && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] border-t border-[var(--color-border)] px-4 py-4 mx-auto max-w-[500px] flex justify-between items-center animate-slide-up">
                    <button
                        onClick={() => handleBulkAction('bookmark')}
                        className="flex flex-col items-center justify-center gap-1 text-[var(--color-text)] hover:text-[var(--color-text)] group"
                        title={t('comic.bookmark')}
                    >
                        <Bookmark size={22} className="group-hover:text-[var(--color-primary)] transition-colors" />
                    </button>
                    <button
                        onClick={() => handleBulkAction('mark_read')}
                        className="flex flex-col items-center justify-center gap-1 text-[var(--color-text)] hover:text-[var(--color-text)] group"
                        title={t('comic.mark_read')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[var(--color-primary)] transition-colors"><path d="M20 6 9 17l-5-5" /></svg>
                    </button>
                    <button
                        onClick={() => handleBulkAction('mark_unread')}
                        className="flex flex-col items-center justify-center gap-1 text-[var(--color-text)] hover:text-[var(--color-text)] group"
                        title={t('comic.mark_unread')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[var(--color-primary)] transition-colors"><path d="M13.4 9a10.8 10.8 0 0 0-3.4 3M17 14A10.8 10.8 0 0 0 16 9.5M3 12a9 9 0 0 1 18 0M3 12a9 9 0 0 0 18 0M3 12h18" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                    </button>
                    <button
                        onClick={() => handleBulkAction('mark_read_down')}
                        className="flex flex-col items-center justify-center gap-1 text-[var(--color-text)] hover:text-[var(--color-text)] group"
                        title={t('comic.mark_read_down')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[var(--color-primary)] transition-colors"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /><path d="m19 6-7 7-7-7" /></svg>
                    </button>
                    <button
                        onClick={() => {
                            if (data?.data.item) {
                                const comicItem = data.data.item;
                                const thumbUrl = comicItem.thumb_url?.startsWith('http') ? comicItem.thumb_url : getImageUrl(comicItem.thumb_url);

                                const items = selectedChapters.map(chName => {
                                    // have to find the chapter in the list to get chapter_api_data
                                    let apiData = '';
                                    data.data.item.chapters.forEach((serverGroup: any) => {
                                        const found = serverGroup.server_data.find((c: any) => c.chapter_name === chName);
                                        if (found) apiData = found.chapter_api_data;
                                    });

                                    return {
                                        chapterName: chName,
                                        chapterId: chName,
                                        chapterApiUrl: apiData
                                    }
                                });
                                addDownloads({
                                    comicName: comicItem.name,
                                    sourceId: sourceId || '',
                                    comicSlug: slug || '',
                                    thumbUrl
                                }, items);
                                setSelectedChapters([]);
                                toast.success(t('comic.added_chapter', { number: items.length.toString() }));
                            }
                        }}
                        className="flex flex-col items-center justify-center gap-1 text-[var(--color-text)] hover:text-[var(--color-text)] group"
                        title={t('comic.add_queue')}
                    >
                        <ListPlus size={22} className="group-hover:text-[var(--color-primary)] transition-colors" />
                    </button>
                    <button
                        onClick={() => {
                            if (data?.data.item) {
                                const comicItem = data.data.item;
                                const thumbUrl = comicItem.thumb_url?.startsWith('http') ? comicItem.thumb_url : getImageUrl(comicItem.thumb_url);
                                const items = selectedChapters.map(chName => {
                                    let apiData = '';
                                    data.data.item.chapters.forEach((serverGroup: any) => {
                                        const found = serverGroup.server_data.find((c: any) => c.chapter_name === chName);
                                        if (found) apiData = found.chapter_api_data;
                                    });

                                    return {
                                        chapterName: chName,
                                        chapterId: chName,
                                        chapterApiUrl: apiData
                                    }
                                });
                                addDownloads({
                                    comicName: comicItem.name,
                                    sourceId: sourceId || '',
                                    comicSlug: slug || '',
                                    thumbUrl
                                }, items);
                                resumeQueue();
                                setSelectedChapters([]);
                                toast.success(t('comic.queue_count', { count: items.length }));
                            }
                        }}
                        className="flex flex-col items-center justify-center gap-1 text-[var(--color-text)] hover:text-[var(--color-text)] group"
                        title={t('comic.download_now')}
                    >
                        <DownloadCloud size={22} className="group-hover:text-[var(--color-primary)] transition-colors" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ComicDetail;
