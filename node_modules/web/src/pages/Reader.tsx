import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Loader2, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchComicDetails } from '../services/otruyen';
import { fetchNettruyenDetail } from '../services/nettruyen';
import { ChapterView } from './ChapterView';
import { useSettings } from '../contexts/SettingsContext';
import { parseChapterNumber } from '../utils/math';

// Hooks
const useReaderSettings = () => {
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('reader_settings');
        return saved ? JSON.parse(saved) : {
            bgColor: 'black', // black, gray, white
            showPageNum: true,
            readingMode: 'Mặc định',
            tapZoneMode: 'Mặc định', // Mặc định, Dạng chữ L, Dạng giống Kindle, Tắt
            invertTapZones: 'Không', // Không, Ngang, Dọc, Cả hai
            sidePadding: 0, // 0 to 100
            customBrightness: 100,
            customGrayscale: false,
            customInvert: false,
            // Auto-scroll
            autoScrollSpeed: 1, // 1 through 5
        };
    });

    const updateSetting = (key: string, value: any) => {
        setSettings((prev: any) => {
            const next = { ...prev, [key]: value };
            localStorage.setItem('reader_settings', JSON.stringify(next));
            return next;
        });
    };

    return { settings, updateSetting };
};

const Reader = () => {
    const { sourceId, slug, chapterId = '1' } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { settings, updateSetting } = useReaderSettings();
    const { t } = useSettings();

    // Store initialPage in a ref so it's stable across renders
    const initialPageRef = useRef(parseInt(searchParams.get('page') || '1'));

    // UI State
    const [showOverlay, setShowOverlay] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState<'mode' | 'general' | 'filters'>('general');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Reading State
    const [activeChapterId, setActiveChapterId] = useState(chapterId);
    const [loadedChapters, setLoadedChapters] = useState([chapterId]);
    const [activePage, setActivePage] = useState(initialPageRef.current);
    const [activeTotalPages, setActiveTotalPages] = useState(1);

    // Auto-scroll to saved page (polls DOM for up to 5s then stops)
    useEffect(() => {
        const startPage = initialPageRef.current;
        if (settings.readingMode === 'Trang sách' || startPage <= 1) return;

        let attempts = 0;
        const interval = setInterval(() => {
            const el = document.querySelector(
                `.reader-page-${chapterId!.replace(/[^a-zA-Z0-9-]/g, '-')}[data-page="${startPage}"]`
            );
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'start' });
                clearInterval(interval);
            } else if (++attempts > 50) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [chapterId, settings.readingMode]);

    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [userScrolling, setUserScrolling] = useState(false);

    const tapTimer = useRef<number | null>(null);
    const observerTimeout = useRef<any>(null);
    const scrollRafRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number | null>(null);
    const userScrollTimeoutRef = useRef<number | null>(null);
    const visiblePagesRef = useRef(new Map<string, { chapterId: string, page: number, total: number, ratio: number }>());

    const pageUpdateTimeoutRef = useRef<number | null>(null);

    const handlePageIntersecting = useCallback((chId: string, page: number, total: number, ratio: number) => {
        const key = `${chId}-${page}`;
        if (ratio === 0) {
            visiblePagesRef.current.delete(key);
        } else {
            visiblePagesRef.current.set(key, { chapterId: chId, page, total, ratio });
        }

        if (pageUpdateTimeoutRef.current) {
            window.clearTimeout(pageUpdateTimeoutRef.current);
        }

        pageUpdateTimeoutRef.current = window.setTimeout(() => {
            // Group visible pages by chapter and aggregate visibility
            const chapterAgg = new Map<string, { totalRatio: number; bestPage: number; bestRatio: number; total: number }>();

            visiblePagesRef.current.forEach(val => {
                const existing = chapterAgg.get(val.chapterId);
                if (!existing) {
                    chapterAgg.set(val.chapterId, {
                        totalRatio: val.ratio,
                        bestPage: val.page,
                        bestRatio: val.ratio,
                        total: val.total,
                    });
                } else {
                    existing.totalRatio += val.ratio;
                    if (val.ratio > existing.bestRatio) {
                        existing.bestRatio = val.ratio;
                        existing.bestPage = val.page;
                        existing.total = val.total;
                    }
                }
            });

            // Find chapter with highest aggregate visibility
            let bestChId: string | null = null;
            let bestTotal = -1;
            chapterAgg.forEach((data, ch) => {
                if (data.totalRatio > bestTotal) {
                    bestTotal = data.totalRatio;
                    bestChId = ch;
                }
            });

            if (bestChId) {
                const winner = chapterAgg.get(bestChId)!;
                setActiveChapterId(prev => (prev !== bestChId ? bestChId! : prev));
                setActivePage(prev => (prev !== winner.bestPage ? winner.bestPage : prev));
                setActiveTotalPages(prev => (prev !== winner.total ? winner.total : prev));

                // Purge entries from OTHER chapters to prevent future oscillation
                const keysToRemove: string[] = [];
                visiblePagesRef.current.forEach((val, k) => {
                    if (val.chapterId !== bestChId) keysToRemove.push(k);
                });
                keysToRemove.forEach(k => visiblePagesRef.current.delete(k));
            }
        }, 150);
    }, []);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (pageUpdateTimeoutRef.current) window.clearTimeout(pageUpdateTimeoutRef.current);
        };
    }, []);

    // Auto hide overlay
    useEffect(() => {
        let timeout: number;
        if (showOverlay && !showSettings) {
            timeout = window.setTimeout(() => setShowOverlay(false), 4000);
        }
        return () => window.clearTimeout(timeout);
    }, [showOverlay, showSettings]);

    // Auto-Scroll Loop
    useEffect(() => {
        if (!isAutoScrolling || userScrolling || showSettings || showOverlay) {
            if (scrollRafRef.current) {
                cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            lastScrollTimeRef.current = null;
            return;
        }

        const scrollStep = (timestamp: number) => {
            if (!lastScrollTimeRef.current) lastScrollTimeRef.current = timestamp;
            const delta = timestamp - lastScrollTimeRef.current;
            lastScrollTimeRef.current = timestamp;

            // Base speed multipliers mapped to speed levels (1-5)
            // Need a tiny constant to match 60fps frame increments
            const speedMultiplier = [0.03, 0.06, 0.1, 0.16, 0.25][settings.autoScrollSpeed - 1] || 0.06;

            // Amount to scroll this exact frame based on time since last frame
            const scrollAmount = delta * speedMultiplier;

            if (scrollAmount > 0) {
                window.scrollBy({ top: scrollAmount, behavior: 'instant' });
            }

            scrollRafRef.current = requestAnimationFrame(scrollStep);
        };

        scrollRafRef.current = requestAnimationFrame(scrollStep);

        return () => {
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        };
    }, [isAutoScrolling, userScrolling, settings.autoScrollSpeed, showSettings, showOverlay]);

    // Listen for manual user interactions to temporarily pause autoscroll
    useEffect(() => {
        const handleManualInteraction = () => {
            if (!isAutoScrolling) return;
            setUserScrolling(true);
            if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
            // Resume 1.5s after user stops dragging touching
            userScrollTimeoutRef.current = window.setTimeout(() => {
                setUserScrolling(false);
            }, 1500);
        };

        window.addEventListener('wheel', handleManualInteraction, { passive: true });
        window.addEventListener('touchmove', handleManualInteraction, { passive: true });
        window.addEventListener('keydown', handleManualInteraction, { passive: true });

        return () => {
            window.removeEventListener('wheel', handleManualInteraction);
            window.removeEventListener('touchmove', handleManualInteraction);
            window.removeEventListener('keydown', handleManualInteraction);
            if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
        };
    }, [isAutoScrolling]);

    // Fetch comic to get chapters list
    const { data: comicData, isLoading: isComicLoading } = useQuery({
        queryKey: ['comic', sourceId, slug],
        queryFn: () => {
            if (sourceId === 'nettruyen') return fetchNettruyenDetail(slug as string);
            return fetchComicDetails(slug as string);
        },
        enabled: (sourceId === 'otruyen' || sourceId === 'nettruyen') && !!slug,
        staleTime: 1000 * 60 * 60,
    });

    const comicDetail = comicData?.data?.item;
    const chaptersList = comicData?.data?.item?.chapters?.[0]?.server_data || comicData?.data?.item?.chapters || comicData?.data?.item?.server_data || [];

    const getNextChapterInfo = useCallback((currentChId: string) => {
        if (!chaptersList.length) return null;
        const sorted = [...chaptersList].sort((a, b) => parseChapterNumber(a.chapter_name) - parseChapterNumber(b.chapter_name));
        const currentIndex = sorted.findIndex((c: any) => c.chapter_name === currentChId);

        if (currentIndex !== -1 && currentIndex + 1 < sorted.length) {
            return sorted[currentIndex + 1];
        }
        return null;
    }, [chaptersList]);

    const getPrevChapterInfo = useCallback((currentChId: string) => {
        if (!chaptersList.length) return null;
        const sorted = [...chaptersList].sort((a, b) => parseChapterNumber(a.chapter_name) - parseChapterNumber(b.chapter_name));
        const currentIndex = sorted.findIndex((c: any) => c.chapter_name === currentChId);

        if (currentIndex > 0) {
            return sorted[currentIndex - 1];
        }
        return null;
    }, [chaptersList]);

    // Reset pagination cleanly when scrolling cross active boundaries
    useEffect(() => {
        if (activeChapterId && sourceId && slug) {
            window.history.replaceState(null, '', `#/read/${sourceId}/${slug}/${activeChapterId}`);
        }
    }, [activeChapterId, sourceId, slug]);

    // History tracking debounce
    useEffect(() => {
        if (!comicDetail || !sourceId || !slug || !activeChapterId) return;

        if (observerTimeout.current) clearTimeout(observerTimeout.current);

        observerTimeout.current = setTimeout(() => {
            axios.post('/api/history', {
                sourceId,
                comicSlug: slug,
                comicName: comicDetail.name,
                chapterId: activeChapterId,
                pageNumber: activePage,
                totalPages: activeTotalPages,
                thumbUrl: comicDetail.thumb_url
            }).catch(console.error);
        }, 1500);

        return () => clearTimeout(observerTimeout.current);
    }, [comicDetail, sourceId, slug, activeChapterId, activePage, activeTotalPages]);

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setActivePage(val);
        const targetPage = document.querySelector(`.reader-page-${activeChapterId.replace(/[^a-zA-Z0-9-]/g, '-')}[data-page="${val}"]`);
        if (targetPage) {
            targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleScreenTap = (e: React.MouseEvent) => {
        if (showSettings) {
            setShowSettings(false);
            return;
        }

        // Block if clicking on floating controls
        if ((e.target as HTMLElement).closest('header') || (e.target as HTMLElement).closest('.bottom-0')) {
            return;
        }

        const handleTapAction = () => {
            if (settings.tapZoneMode === 'Tắt') {
                setShowOverlay(!showOverlay);
                return;
            }

            const width = window.innerWidth;
            const height = window.innerHeight;
            const x = e.clientX;
            const y = e.clientY;

            const isLeft = x < width * 0.3;
            const isRight = x > width * 0.7;
            const isTop = y < height * 0.3;
            const isBottom = y > height * 0.7;

            let action = 'toggle_ui';

            if (settings.tapZoneMode === 'Mặc định') {
                if (isLeft) action = 'prev';
                else if (isRight) action = 'next';
            } else if (settings.tapZoneMode === 'Dạng chữ L') {
                if (isLeft || isTop) action = 'prev';
                else if (isRight || isBottom) action = 'next';
            } else if (settings.tapZoneMode === 'Dạng giống Kindle') {
                if (x < width * 0.2) action = 'prev';
                else if (x > width * 0.2 && x < width * 0.8 && y > height * 0.2 && y < height * 0.8) action = 'toggle_ui';
                else action = 'next';
            }

            const invertHoriz = settings.invertTapZones === 'Ngang' || settings.invertTapZones === 'Cả hai';
            const invertVert = settings.invertTapZones === 'Dọc' || settings.invertTapZones === 'Cả hai';

            // Additional handling for 'Dạng chữ L' vertical inversion. Let's incorporate it for up/down taps
            if (settings.tapZoneMode === 'Dạng chữ L') {
                if (isLeft || (isTop && !invertVert) || (isBottom && invertVert)) action = 'prev';
                else if (isRight || (isBottom && !invertVert) || (isTop && invertVert)) action = 'next';
            }

            if (action === 'prev' || action === 'next') {
                if ((action === 'prev' && invertHoriz) || (action === 'next' && invertHoriz)) {
                    action = action === 'prev' ? 'next' : 'prev';
                }
            }

            if (action === 'toggle_ui') {
                setShowOverlay(!showOverlay);
            } else if (action === 'next') {
                if (settings.readingMode === 'Trang sách') {
                    if (activePage < activeTotalPages) {
                        setActivePage(prev => prev + 1);
                    } else if (nextCh) {
                        setLoadedChapters([nextCh.chapter_name]);
                        setActiveChapterId(nextCh.chapter_name);
                        setActiveTotalPages(1);
                        setActivePage(1);
                        window.scrollTo(0, 0);
                    }
                } else {
                    window.scrollBy({ top: height * 0.8, behavior: 'smooth' });
                }
            } else if (action === 'prev') {
                if (settings.readingMode === 'Trang sách') {
                    if (activePage > 1) {
                        setActivePage(prev => prev - 1);
                    } else if (prevCh) {
                        setLoadedChapters([prevCh.chapter_name]);
                        setActiveChapterId(prevCh.chapter_name);
                        setActiveTotalPages(1);
                        setActivePage(1);
                        window.scrollTo(0, 0);
                    }
                } else {
                    window.scrollBy({ top: -height * 0.8, behavior: 'smooth' });
                }
            }
        };

        if (settings.doubleTapZoom) {
            if (tapTimer.current) {
                window.clearTimeout(tapTimer.current);
                tapTimer.current = null;
                // It's a double tap, let browser handle zoom
            } else {
                tapTimer.current = window.setTimeout(() => {
                    handleTapAction();
                    tapTimer.current = null;
                }, 300);
            }
        } else {
            handleTapAction();
        }
    };

    if (isComicLoading || !chaptersList.length) {
        return (
            <div className={`flex justify-center items-center h-screen ${settings.bgColor === 'white' ? 'bg-white' : settings.bgColor === 'gray' ? 'bg-[#1e1e1e]' : 'bg-black'}`}>
                <Loader2 className="animate-spin text-[var(--color-primary)]" size={40} />
            </div>
        );
    }

    const prevCh = getPrevChapterInfo(activeChapterId);
    const nextCh = getNextChapterInfo(activeChapterId);

    const bgClass = settings.bgColor === 'white' ? 'bg-white text-gray-900' :
        settings.bgColor === 'gray' ? 'bg-[#1e1e1e] text-gray-200' :
            'bg-black text-white';

    // Style configuration based on settings
    const readerStyle: React.CSSProperties = {
        paddingLeft: `${settings.sidePadding / 2}%`,
        paddingRight: `${settings.sidePadding / 2}%`,
        // Mapping double tap zoom via css touch-action
        touchAction: settings.doubleTapZoom ? 'pan-x pan-y pinch-zoom' : 'pan-x pan-y',
    };

    const renderSettingsTabContent = () => {
        if (activeTab === 'mode') {
            return (
                <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-200 pb-20">
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-semibold text-[#F57C00] uppercase tracking-wider">{t('reader.settings.reading_mode')}</span>
                        <div className="grid grid-cols-3 gap-2">
                            {[{ id: 'Mặc định', t: 'reader.mode.default' }, { id: 'Trang sách', t: 'reader.mode.paged' }, { id: 'Cuộn dọc', t: 'reader.mode.webtoon' }].map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => updateSetting('readingMode', b.id)}
                                    className={`py-2 px-2 border rounded-md text-[13px] text-center transition-all ${settings.readingMode === b.id ? 'bg-transparent border-[#F57C00] text-[#F57C00]' : 'border-gray-700/50 bg-[#2a2a2a] hover:bg-[#333] text-gray-300'}`}
                                >
                                    {t(b.t)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-semibold text-[#F57C00] uppercase tracking-wider">{t('reader.settings.tap_zone')}</span>
                        <div className="grid grid-cols-2 gap-2">
                            {[{ id: 'Mặc định', t: 'reader.tap.default' }, { id: 'Dạng chữ L', t: 'reader.tap.l_shape' }, { id: 'Dạng giống Kindle', t: 'reader.tap.kindle' }, { id: 'Tắt', t: 'reader.tap.off' }].map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => updateSetting('tapZoneMode', b.id)}
                                    className={`py-2 px-2 border rounded-md text-[13px] text-center transition-all ${settings.tapZoneMode === b.id ? 'bg-transparent border-[#F57C00] text-[#F57C00]' : 'border-gray-700/50 bg-[#2a2a2a] hover:bg-[#333] text-gray-300'}`}
                                >
                                    {t(b.t)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-semibold text-[#F57C00] uppercase tracking-wider">{t('reader.settings.invert_tap')}</span>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[{ id: 'Không', t: 'reader.invert.none' }, { id: 'Ngang', t: 'reader.invert.horizontal' }, { id: 'Dọc', t: 'reader.invert.vertical' }, { id: 'Cả hai', t: 'reader.invert.both' }].map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => updateSetting('invertTapZones', b.id)}
                                    className={`py-2 px-1 border rounded-md text-[12px] text-center transition-all ${settings.invertTapZones === b.id ? 'bg-transparent border-[#F57C00] text-[#F57C00]' : 'border-gray-700/50 bg-[#2a2a2a] hover:bg-[#333] text-gray-300'}`}
                                >
                                    {t(b.t)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5 mb-2 mt-1">
                        <span className="text-[11px] font-semibold text-[#F57C00] uppercase tracking-wider flex justify-between">{t('reader.settings.side_padding')} <span className="text-gray-400 font-normal">{settings.sidePadding}%</span></span>
                        <input
                            type="range"
                            min="0" max="60" step="5"
                            value={settings.sidePadding}
                            onChange={(e) => updateSetting('sidePadding', parseInt(e.target.value))}
                            className="w-full accent-[#F57C00]"
                        />
                    </div>


                    <div className="flex flex-col gap-0 border-t border-[#2a2a2a] mt-2 pt-2">
                        {[
                            { id: '1', label: t('reader.settings.crop_borders') },
                            { id: '2', label: t('reader.settings.split_double_pages') },
                        ].map((m) => (
                            <label key={m.id} className="flex flex-row-reverse justify-between items-center py-3 cursor-pointer">
                                <div className={`w-11 h-6 rounded-full transition-colors relative bg-[#1e1e1e] border border-gray-600`}>
                                    <span className={`absolute top-0.5 left-0.5 bg-gray-400 w-4 h-4 rounded-full transition-transform`} />
                                </div>
                                <span className="text-[14px] text-gray-200">{m.label}</span>
                            </label>
                        ))}
                        <label className="flex flex-row-reverse justify-between items-center py-3 cursor-pointer border-t border-[#2a2a2a]">
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${settings.doubleTapZoom ? 'bg-[#F57C00]' : 'bg-[#1e1e1e] border border-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${settings.doubleTapZoom ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.doubleTapZoom}
                                onChange={(e) => updateSetting('doubleTapZoom', e.target.checked)}
                                className="hidden"
                            />
                            <span className="text-[14px] text-gray-200">{t('reader.settings.double_tap_zoom')}</span>
                        </label>
                    </div>
                </div>
            );
        }

        if (activeTab === 'general') {
            return (
                <div className="flex flex-col gap-6 animate-in slide-in-from-left-4 duration-200">
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-semibold text-[#F57C00] uppercase tracking-wider flex justify-between">{t('reader.settings.auto_scroll')} <span className="text-gray-400 font-normal">{t('reader.settings.auto_scroll_level', { level: settings.autoScrollSpeed })}</span></span>
                        <input
                            type="range"
                            min="1" max="5" step="1"
                            value={settings.autoScrollSpeed}
                            onChange={(e) => updateSetting('autoScrollSpeed', parseInt(e.target.value))}
                            className="w-full accent-[#F57C00]"
                        />
                    </div>

                    {/* Background Color */}
                    <div className="flex flex-col gap-3">
                        <span className="text-[11px] font-semibold text-[#F57C00] uppercase tracking-wider">{t('reader.settings.bg_color')}</span>
                        <div className="flex gap-2">
                            {[
                                { id: 'black', t: 'reader.bg.black', class: 'bg-black border-[#2a2a2a]' },
                                { id: 'gray', t: 'reader.bg.gray', class: 'bg-[#1e1e1e] border-[#2a2a2a]' },
                                { id: 'white', t: 'reader.bg.white', class: 'bg-white border-[#2a2a2a] text-black' }
                            ].map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => updateSetting('bgColor', c.id)}
                                    className={`flex-1 py-1.5 border rounded flex items-center justify-center text-[13px] transition-all ${c.class} ${settings.bgColor === c.id ? 'ring-1 ring-[#F57C00] border-[#F57C00] text-[#F57C00]' : ''}`}
                                >
                                    {t(c.t)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-0 border-t border-[#2a2a2a]">
                        {/* Show Page Number Toggle */}
                        <label className="flex items-center justify-between py-4 border-b border-[#2a2a2a] cursor-pointer" onClick={(e) => { e.preventDefault(); updateSetting('showPageNum', !settings.showPageNum); }}>
                            <div className="text-[14px] text-gray-200">{t('reader.settings.show_page')}</div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${settings.showPageNum ? 'bg-[#F57C00]' : 'bg-[#1e1e1e] border border-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${settings.showPageNum ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-400'}`} />
                            </div>
                        </label>

                        {/* Fullscreen Toggle */}
                        <label className="flex items-center justify-between py-4 border-b border-[#2a2a2a] cursor-pointer" onClick={(e) => { e.preventDefault(); handleFullscreen(); }}>
                            <div className="text-[14px] text-gray-200">{t('reader.settings.fullscreen')}</div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${isFullscreen ? 'bg-[#F57C00]' : 'bg-[#1e1e1e] border border-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${isFullscreen ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-400'}`} />
                            </div>
                        </label>
                    </div>
                </div>
            );
        }

        if (activeTab === 'filters') {
            return (
                <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-200">
                    <div className="flex flex-col gap-2 border-b border-[#2a2a2a] pb-4">
                        <label className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] text-gray-200">{t('reader.settings.custom_brightness')}</span>
                                <div className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settings.customBrightness !== 100 ? 'bg-[#F57C00]' : 'bg-[#1e1e1e] border border-gray-600'}`} onClick={() => updateSetting('customBrightness', settings.customBrightness !== 100 ? 100 : 80)}>
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${settings.customBrightness !== 100 ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-400'}`} />
                                </div>
                            </div>
                            {settings.customBrightness !== 100 && (
                                <input
                                    type="range"
                                    min="20" max="150"
                                    value={settings.customBrightness}
                                    onChange={(e) => updateSetting('customBrightness', parseInt(e.target.value))}
                                    className="w-full accent-[#F57C00]"
                                />
                            )}
                        </label>
                    </div>

                    <div className="flex flex-col gap-0">
                        <label className="flex items-center justify-between py-4 cursor-pointer border-b border-[#2a2a2a]" onClick={(e) => { e.preventDefault(); updateSetting('customGrayscale', !settings.customGrayscale); }}>
                            <span className="text-[14px] text-gray-200">{t('reader.settings.grayscale')}</span>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${settings.customGrayscale ? 'bg-[#F57C00]' : 'bg-[#1e1e1e] border border-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${settings.customGrayscale ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-400'}`} />
                            </div>
                        </label>

                        <label className="flex items-center justify-between py-4 cursor-pointer border-b border-[#2a2a2a]" onClick={(e) => { e.preventDefault(); updateSetting('customInvert', !settings.customInvert); }}>
                            <span className="text-[14px] text-gray-200">{t('reader.settings.invert_colors')}</span>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${settings.customInvert ? 'bg-[#F57C00]' : 'bg-[#1e1e1e] border border-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${settings.customInvert ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-400'}`} />
                            </div>
                        </label>
                    </div>
                </div>
            );
        }
    };

    return (
        <div
            className={`relative flex flex-col min-h-[100dvh] ${bgClass}`}
        >
            {/* Top Header */}
            <header
                className={`fixed top-0 inset-x-0 z-40 bg-black/80 backdrop-blur-sm transition-transform duration-300 ${showOverlay ? 'translate-y-0' : '-translate-y-full'} flex items-center h-14 px-2 shadow-sm text-white`}
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="ml-2 flex-1 min-w-0 flex flex-col justify-center">
                    <h1 className="text-sm font-medium truncate leading-tight">{comicDetail?.name}</h1>
                    <p className="text-xs text-gray-400 leading-tight">{t('reader.chapter', { number: activeChapterId })}</p>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-white/20' : 'hover:bg-white/10'}`}
                >
                    <Settings2 size={24} />
                </button>
            </header>

            {/* Seamless Chapters Container */}
            <main
                className="flex-1 w-full max-w-screen-md mx-auto relative flex flex-col transition-all cursor-pointer select-none"
                style={readerStyle}
                onClick={handleScreenTap}
            >
                {loadedChapters.map((chId) => {
                    const chapterInfo = chaptersList.find((c: any) => c.chapter_name === chId);
                    if (!chapterInfo) return null;

                    return (
                        <ChapterView
                            key={chId}
                            sourceId={sourceId as string}
                            slug={slug as string}
                            chapterId={chId}
                            chapterApiUrl={chapterInfo.chapter_api_data}
                            bgColor={settings.bgColor}
                            readingMode={settings.readingMode}
                            activePage={activePage}
                            customFilters={{
                                brightness: settings.customBrightness,
                                grayscale: settings.customGrayscale,
                                invert: settings.customInvert
                            }}
                            onPageIntersecting={handlePageIntersecting}
                            onEndReached={() => {
                                if (settings.readingMode !== 'Trang sách') {
                                    const nextInfo = getNextChapterInfo(chId);
                                    if (nextInfo && !loadedChapters.includes(nextInfo.chapter_name)) {
                                        setLoadedChapters(prev => [...prev, nextInfo.chapter_name]);
                                    }
                                }
                            }}
                        />
                    );
                })}
            </main>

            {/* Floating Page Number */}
            {!showOverlay && settings.showPageNum && activeTotalPages > 1 && (
                <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1 text-[11px] font-medium text-white z-20 pointer-events-none backdrop-blur-sm shadow border border-white/5 tracking-widest">
                    {activePage} / {activeTotalPages}
                </div>
            )}

            {/* Bottom Seekbar & Controls */}
            <div
                className={`fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${showOverlay && !showSettings ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {/* Seekbar separated above the bottom bar */}
                <div className="w-full max-w-screen-md mx-auto px-1.5 pb-2.5">
                    <div className="flex items-center gap-4 bg-[#141414]/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-xl border border-white/5">
                        <span className="text-[12px] font-medium text-gray-300 min-w-[28px] text-right">{activePage}</span>
                        <input
                            type="range"
                            min="1"
                            max={activeTotalPages || 1}
                            value={activePage}
                            onChange={handleSeek}
                            className="flex-1 accent-white h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[12px] font-medium text-gray-300 min-w-[28px]">{activeTotalPages}</span>
                    </div>
                </div>

                {/* Bottom solid bar */}
                <div className="bg-[#141414] border-t border-white/5 pb-2">
                    <div className="flex items-center justify-between text-white w-full max-w-screen-md mx-auto px-6 h-14">
                        <button
                            disabled={!prevCh}
                            onClick={() => {
                                if (prevCh) {
                                    setLoadedChapters([prevCh.chapter_name]);
                                    setActiveChapterId(prevCh.chapter_name);
                                    setActiveTotalPages(1);
                                    setActivePage(1);
                                    window.scrollTo(0, 0);
                                }
                            }}
                            className="text-gray-400 hover:text-white disabled:opacity-20 transition-colors p-2 -ml-2"
                        >
                            <ChevronLeft size={28} />
                        </button>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                                className={`p-2 transition-colors ${isAutoScrolling ? 'text-[#F57C00]' : 'text-gray-400 hover:text-white'}`}
                            >
                                {isAutoScrolling ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[#F57C00]"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                )}
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="text-gray-400 hover:text-white transition-colors p-2"
                            >
                                <Settings2 size={24} />
                            </button>
                        </div>

                        <button
                            disabled={!nextCh}
                            onClick={() => {
                                if (nextCh) {
                                    setLoadedChapters([nextCh.chapter_name]);
                                    setActiveChapterId(nextCh.chapter_name);
                                    setActiveTotalPages(1);
                                    setActivePage(1);
                                    window.scrollTo(0, 0);
                                }
                            }}
                            className="text-gray-400 hover:text-white disabled:opacity-20 transition-colors p-2 -mr-2"
                        >
                            <ChevronRight size={28} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Settings Modal (BottomSheet style) */}
            <div
                className={`fixed bottom-0 inset-x-0 z-50 bg-[#161616] transition-transform duration-300 text-gray-200 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] ${showSettings ? 'translate-y-0' : 'translate-y-full'} rounded-t-xl overflow-hidden`}
                style={{ maxHeight: '70vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Tabs Header */}
                <div className="flex w-full justify-center px-6 pt-3 pb-0 border-b border-[#2a2a2a]">
                    {[
                        { id: 'mode', t: 'reader.settings.reading_mode' },
                        { id: 'general', t: 'reader.settings.general' },
                        { id: 'filters', t: 'reader.settings.filters' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 text-[13px] font-medium transition-colors relative ${activeTab === tab.id ? 'text-[#F57C00]' : 'text-gray-400'}`}
                        >
                            <span className="uppercase">{t(tab.t)}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 inset-x-4 h-0.5 bg-[#F57C00]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex flex-col w-full max-w-screen-md mx-auto px-5 py-4 overflow-y-auto" style={{ height: '380px' }}>
                    {renderSettingsTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Reader;
