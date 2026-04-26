import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Settings, Minus, Plus, Loader2, Headphones, Lock } from 'lucide-react';
import axios from 'axios';
import * as STVService from '../services/sangtacviet';
import * as MTCService from '../services/metruyenchu';
import { TTSPanel } from '../components/TTSPanel';

const NovelReader = () => {
    const { sourceId, host, bookId, chapterId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('novel-font-size') || '18'));
    const [lineHeight, setLineHeight] = useState(() => parseFloat(localStorage.getItem('novel-line-height') || '1.5'));
    const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('novel-font-family') || 'system-ui, sans-serif');
    const [theme, setTheme] = useState(() => localStorage.getItem('novel-theme') || 'default');
    const [showSettings, setShowSettings] = useState(false);
    const [showTTS, setShowTTS] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    
    const [playingBlocks, setPlayingBlocks] = useState<number[]>([]);
    
    // Auto-scroll state
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [isTTSAutoScrollSync, setIsTTSAutoScrollSync] = useState(true);
    const [userScrolling, setUserScrolling] = useState(false);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(() => parseInt(localStorage.getItem('novel-scroll-speed') || '1'));
    
    const scrollRafRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number | null>(null);
    const userScrollTimeoutRef = useRef<number | null>(null);


    // Fetch chapter content from scraper API
    const { data: chapterContent, isLoading: isLoadingContent, error: contentError } = useQuery({
        queryKey: ['novel-chapter-content', host, bookId, chapterId],
        queryFn: () => sourceId === 'metruyenchu' ? MTCService.fetchNovelChapterContent(bookId!, chapterId!) : STVService.fetchNovelChapterContent(host!, bookId!, chapterId!),
        enabled: !!host && !!bookId && !!chapterId,
        staleTime: 1000 * 60 * 30, // 30 minutes cache
        retry: 2,
    });

    // Fetch chapter list for prev/next navigation  
    const { data: chaptersData } = useQuery({
        queryKey: ['novel-chapters', sourceId, host, bookId],
        queryFn: () => sourceId === 'metruyenchu' ? MTCService.fetchNovelChapters(bookId!) : STVService.fetchNovelChapters(host!, bookId!),
        enabled: !!host && !!bookId,
    });

    const chapters = sourceId === 'metruyenchu' ? (chaptersData?.data?.chapters || []) : (chaptersData?.data?.items || []);
    const currentIdx = chapters.findIndex((ch: any) => String(ch._id || ch.id) === String(chapterId));
    const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
    const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
    const currentChapter = currentIdx >= 0 ? chapters[currentIdx] : null;

    // Use chapter name from content response first, then from chapter list
    // Use chapter name from content response first, then from chapter list
    const item = sourceId === 'metruyenchu' ? chapterContent?.data : chapterContent?.data?.item;
    const chapterName = item?.name || currentChapter?.name || `Chương ${chapterId}`;
    const bookName = item?.book_name || item?.bookName || '';
    const content = item?.content || '';

    // Parse content into blocks for rendering and TTS sync
    const blocks = useMemo(() => {
        if (!content) return [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textNodes = Array.from(tempDiv.childNodes).map(n => n.textContent?.trim()).filter(Boolean) as string[];
        return textNodes.flatMap(text => text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean));
    }, [content]);

    // Prefetch next 2 chapters text silently in the background
    useEffect(() => {
        if (!chapters.length || currentIdx < 0 || !showTTS) return;
        
        // Only prefetch if TTS is open
        for (let i = 1; i <= 2; i++) {
            const nextCh = chapters[currentIdx + i];
            if (nextCh) {
                const cId = nextCh._id || nextCh.id;
                queryClient.prefetchQuery({
                    queryKey: ['novel-chapter-content', host, bookId, cId],
                    queryFn: () => sourceId === 'metruyenchu' ? MTCService.fetchNovelChapterContent(bookId!, cId) : STVService.fetchNovelChapterContent(host!, bookId!, cId),
                    staleTime: 1000 * 60 * 30,
                });
            }
        }
    }, [currentIdx, chapters, showTTS, host, bookId]);

    // Save settings
    useEffect(() => {
        localStorage.setItem('novel-font-size', String(fontSize));
        localStorage.setItem('novel-line-height', String(lineHeight));
        localStorage.setItem('novel-font-family', fontFamily);
        localStorage.setItem('novel-theme', theme);
        localStorage.setItem('novel-scroll-speed', String(autoScrollSpeed));
    }, [fontSize, lineHeight, fontFamily, theme, autoScrollSpeed]);

    const handleResetSettings = () => {
        setFontSize(18);
        setLineHeight(1.5);
        setFontFamily('system-ui, sans-serif');
        setTheme('default');
        setAutoScrollSpeed(1);
    };

    // History tracking debounce
    const observerTimeout = useRef<number | null>(null);

    useEffect(() => {
        if (!bookName || !sourceId || !bookId || !chapterId || !content) return;

        if (observerTimeout.current) window.clearTimeout(observerTimeout.current);

        observerTimeout.current = window.setTimeout(() => {
            axios.post('/api/history', {
                sourceId: sourceId === 'metruyenchu' ? 'metruyenchu' : 'sangtacviet',
                comicSlug: bookId,
                comicName: bookName,
                chapterId: chapterId,
                pageNumber: 1,
                totalPages: 1,
                thumbUrl: item?.cover || '' // Use novel cover if available
            }).catch(console.error);
        }, 1500);

        return () => {
            if (observerTimeout.current) window.clearTimeout(observerTimeout.current);
        };
    }, [bookName, sourceId, bookId, chapterId, content, item]);

    // Scroll to top when chapter changes
    useEffect(() => {
        window.scrollTo(0, 0);
        // Pause auto-scrolling when navigating to a new chapter
        setIsAutoScrolling(false);
    }, [chapterId]);

    // Disable native auto-scrolling when TTS is active or playing to avoid conflict
    useEffect(() => {
        if (showTTS || playingBlocks.length > 0) {
            setIsAutoScrolling(false);
        }
    }, [showTTS, playingBlocks]);

    // Auto-Scroll Loop
    useEffect(() => {
        if (!isAutoScrolling || userScrolling || showSettings) {
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

            const speedMultiplier = [0.03, 0.06, 0.1, 0.16, 0.25][autoScrollSpeed - 1] || 0.06;
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
    }, [isAutoScrolling, userScrolling, autoScrollSpeed, showSettings]);

    // Pause auto-scroll on manual interaction
    useEffect(() => {
        const handleManualInteraction = () => {
            if (!isAutoScrolling) return;
            setUserScrolling(true);
            if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
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

    const navigateChapter = useCallback((ch: any) => {
        if (ch) navigate(`/novel-read/${sourceId}/${host}/${bookId}/${ch._id || ch.id}`, { replace: true });
    }, [navigate, sourceId, host, bookId]);

    // Theme styles
    const getThemeStyles = () => {
        switch (theme) {
            case 'light': return { bg: '#f9f9f9', text: '#333333' };
            case 'sepia': return { bg: '#f4ecd8', text: '#5b4636' };
            case 'dark': return { bg: '#121212', text: '#e0e0e0' };
            case 'oled': return { bg: '#000000', text: '#d1d1d1' };
            default: return {}; // Use system CSS variables
        }
    };
    const themeStyles = getThemeStyles();

    return (
        <div className="flex flex-col min-h-screen" style={theme !== 'default' ? { backgroundColor: themeStyles.bg } : { backgroundColor: 'var(--color-bg)' }}>
            {/* Screen Lock Overlay */}
            {isScreenLocked && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white/50 touch-none select-none cursor-pointer"
                    onDoubleClick={() => setIsScreenLocked(false)}
                    title="Bấm đúp để mở khóa"
                >
                    <Lock size={48} className="mb-4 opacity-50" />
                    <p className="text-sm tracking-widest uppercase font-medium">Chế độ bỏ túi</p>
                    <p className="text-xs mt-2 opacity-40">Chạm đúp màn hình để mở khóa</p>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 border-b shrink-0" style={theme !== 'default' ? { backgroundColor: themeStyles.bg, borderColor: themeStyles.text + '20' } : { backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center h-12 px-3 gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-medium truncate" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                            {chapterName}
                        </h1>
                        {bookName && (
                            <p className="text-xs truncate opacity-70" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>{bookName}</p>
                        )}
                    </div>
                    <button
                        onClick={() => { setShowTTS(!showTTS); setShowSettings(false); }}
                        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}
                    >
                        <Headphones size={18} />
                    </button>
                    <button
                        onClick={() => { setShowSettings(!showSettings); setShowTTS(false); }}
                        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}
                    >
                        <Settings size={18} />
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="px-4 pb-4 pt-2 border-t absolute top-full left-0 w-full shadow-lg max-h-[80vh] overflow-y-auto" style={theme !== 'default' ? { backgroundColor: themeStyles.bg, borderColor: themeStyles.text + '20' } : { backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {/* Font Size */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>Cỡ chữ</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setFontSize(s => Math.max(12, s - 2))} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                                        <Minus size={16} />
                                    </button>
                                    <span className="text-sm w-8 text-center" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>{fontSize}</span>
                                    <button onClick={() => setFontSize(s => Math.min(36, s + 2))} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Line Height */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>Khoảng cách dòng</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setLineHeight(s => Math.max(1.0, parseFloat((s - 0.1).toFixed(1))))} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                                        <Minus size={16} />
                                    </button>
                                    <span className="text-sm w-8 text-center" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>{lineHeight.toFixed(1)}</span>
                                    <button onClick={() => setLineHeight(s => Math.min(3.0, parseFloat((s + 0.1).toFixed(1))))} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Auto Scroll Speed */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>Tốc độ cuộn</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setAutoScrollSpeed(s => Math.max(1, s - 1))} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                                        <Minus size={16} />
                                    </button>
                                    <span className="text-sm w-8 text-center" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>{autoScrollSpeed}</span>
                                    <button onClick={() => setAutoScrollSpeed(s => Math.min(5, s + 1))} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Font Family */}
                            <div className="flex flex-col gap-2 pt-2 border-t" style={theme !== 'default' ? { borderColor: themeStyles.text + '20' } : { borderColor: 'var(--color-border)' }}>
                                <span className="text-sm" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>Phông chữ</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { name: 'Mặc định', value: 'system-ui, sans-serif' },
                                        { name: 'Arial', value: 'Arial, sans-serif' },
                                        { name: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
                                        { name: 'Times New Roman', value: '"Times New Roman", Times, serif' }
                                    ].map(f => (
                                        <button
                                            key={f.name}
                                            onClick={() => setFontFamily(f.value)}
                                            className={`py-1.5 px-2 rounded border text-xs text-center transition-colors ${fontFamily === f.value ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-transparent hover:bg-black/10 dark:hover:bg-white/10'}`}
                                            style={{ fontFamily: f.value, ...(fontFamily !== f.value ? (theme !== 'default' ? { color: themeStyles.text, borderColor: themeStyles.text + '40' } : { color: 'var(--color-text)', borderColor: 'var(--color-border)' }) : {}) }}
                                        >
                                            {f.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Themes */}
                            <div className="flex flex-col gap-2 pt-2 border-t" style={theme !== 'default' ? { borderColor: themeStyles.text + '20' } : { borderColor: 'var(--color-border)' }}>
                                <span className="text-sm" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' }}>Màu nền</span>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { id: 'default', name: 'Giao diện app', bg: 'var(--color-bg)', text: 'var(--color-text)' },
                                        { id: 'light', name: 'Sáng', bg: '#f9f9f9', text: '#333333' },
                                        { id: 'sepia', name: 'Sepia', bg: '#f4ecd8', text: '#5b4636' },
                                        { id: 'dark', name: 'Tối', bg: '#121212', text: '#e0e0e0' },
                                        { id: 'oled', name: 'OLED', bg: '#000000', text: '#d1d1d1' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={`h-10 rounded-full border-2 transition-transform ${theme === t.id ? 'scale-110 border-[var(--color-primary)]' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: t.bg, color: t.text }}
                                            title={t.name}
                                        >
                                            <span className="text-xs font-medium">Aa</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reset Button */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={handleResetSettings}
                                    className="px-6 py-2 rounded-full text-sm font-medium transition-colors border"
                                    style={theme !== 'default' ? { borderColor: themeStyles.text + '40', color: themeStyles.text } : { borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                                >
                                    Khôi phục mặc định
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TTS Panel */}
                <div style={{ display: showTTS && blocks.length > 0 ? 'block' : 'none' }}>
                    <TTSPanel 
                        blocks={blocks} 
                        themeStyles={themeStyles} 
                        isAutoScrollSync={isTTSAutoScrollSync}
                        setIsAutoScrollSync={setIsTTSAutoScrollSync}
                        onPlayingBlocksChange={setPlayingBlocks}
                        onTTSComplete={() => {
                            if (nextChapter) {
                                navigateChapter(nextChapter);
                            }
                        }}
                        onLockScreen={() => setIsScreenLocked(true)}
                    />
                </div>
            </header>

            {/* Chapter Content */}
            <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
                {isLoadingContent ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[var(--color-primary)] mb-4" size={36} />
                        <p className="text-sm text-[var(--color-text-muted)]">Đang tải nội dung chương...</p>
                    </div>
                ) : contentError ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm text-red-500">Lỗi tải nội dung. Vui lòng thử lại.</p>
                    </div>
                ) : blocks.length > 0 ? (
                    <div
                        className="novel-content leading-relaxed px-2"
                        style={{ 
                            fontSize: `${fontSize}px`, 
                            lineHeight: `${lineHeight}`,
                            fontFamily: fontFamily,
                            ...(theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text)' })
                        }}
                    >
                        {blocks.map((block, idx) => {
                            const isPlaying = playingBlocks.includes(idx);
                            return (
                                <p 
                                    key={idx} 
                                    id={`text-block-${idx}`}
                                    className={`mb-4 transition-colors duration-300 relative ${isPlaying ? 'text-[var(--color-primary)] drop-shadow-md' : ''}`}
                                >
                                    {isPlaying && (
                                        <span className="absolute -left-6 top-1.5 flex gap-0.5 items-end h-3 w-4">
                                            <span className="w-0.5 bg-[var(--color-primary)] animate-[bounce_1s_infinite_100ms] h-full"></span>
                                            <span className="w-0.5 bg-[var(--color-primary)] animate-[bounce_1s_infinite_300ms] h-2/3"></span>
                                            <span className="w-0.5 bg-[var(--color-primary)] animate-[bounce_1s_infinite_200ms] h-4/5"></span>
                                        </span>
                                    )}
                                    {block}
                                </p>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm opacity-70" style={theme !== 'default' ? { color: themeStyles.text } : { color: 'var(--color-text-muted)' }}>Không có nội dung chương.</p>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="border-t px-4 py-3 shrink-0 sticky bottom-0 z-40" style={theme !== 'default' ? { backgroundColor: themeStyles.bg, borderColor: themeStyles.text + '20' } : { backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between max-w-3xl mx-auto">
                    <button
                        onClick={() => prevChapter && navigateChapter(prevChapter)}
                        disabled={!prevChapter}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed border"
                        style={theme !== 'default' ? { backgroundColor: themeStyles.bg, color: themeStyles.text, borderColor: themeStyles.text + '40' } : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                    >
                        <ChevronLeft size={16} />
                        Trước
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(`/novel/${sourceId}/${host}/${bookId}`)}
                            className="px-4 py-2 rounded-lg text-sm transition-colors border"
                            style={theme !== 'default' ? { backgroundColor: themeStyles.bg, color: themeStyles.text, borderColor: themeStyles.text + '40' } : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                        >
                            Mục lục
                        </button>
                        {!(showTTS || playingBlocks.length > 0) && (
                            <button
                                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                                className={`p-2 rounded-lg transition-colors border ${isAutoScrolling ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : ''}`}
                                style={!isAutoScrolling ? (theme !== 'default' ? { backgroundColor: themeStyles.bg, color: themeStyles.text, borderColor: themeStyles.text + '40' } : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }) : {}}
                                title="Tự động cuộn"
                            >
                                {isAutoScrolling ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                )}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => nextChapter && navigateChapter(nextChapter)}
                        disabled={!nextChapter}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed border"
                        style={theme !== 'default' ? { backgroundColor: themeStyles.bg, color: themeStyles.text, borderColor: themeStyles.text + '40' } : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                    >
                        Sau
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NovelReader;
