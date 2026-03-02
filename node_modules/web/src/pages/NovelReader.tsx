import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Settings, Minus, Plus, ExternalLink } from 'lucide-react';
import { fetchNovelChapters } from '../services/sangtacviet';

const STV_BASE = 'http://14.225.254.182';

const NovelReader = () => {
    const { sourceId, host, bookId, chapterId } = useParams();
    const navigate = useNavigate();
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('novel-font-size') || '18'));
    const [showSettings, setShowSettings] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Fetch chapter list for prev/next navigation
    const { data: chaptersData } = useQuery({
        queryKey: ['novel-chapters', sourceId, host, bookId],
        queryFn: () => fetchNovelChapters(host!, bookId!),
        enabled: !!host && !!bookId,
    });

    const chapters = chaptersData?.data?.items || [];
    const currentIdx = chapters.findIndex((ch: any) => String(ch._id) === String(chapterId));
    const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
    const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
    const currentChapter = currentIdx >= 0 ? chapters[currentIdx] : null;

    // Save font size
    useEffect(() => {
        localStorage.setItem('novel-font-size', String(fontSize));
    }, [fontSize]);

    // Reset iframe loaded state when chapter changes
    useEffect(() => {
        setIframeLoaded(false);
    }, [chapterId]);

    // Try to inject styles into iframe when loaded
    useEffect(() => {
        if (!iframeLoaded || !iframeRef.current) return;
        try {
            const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
            if (iframeDoc) {
                const style = iframeDoc.createElement('style');
                style.textContent = `
                    /* Hide site header, footer, navigation */
                    .topnav, .navbar, header, footer, .footer,
                    #topbar, .topbar, .breadcrumb, #breadcum,
                    .navbot, .navtop, .comment-area, #commentlist,
                    .fb-comments, .share-buttons, .social-share,
                    .sticky-top, .fixed-top, .book-info-top,
                    [class*="nav-"], [id*="nav"], .ad, .ads,
                    .sidebar, aside { display: none !important; }
                    
                    /* Style the content */
                    body {
                        background: #121212 !important;
                        color: #e0e0e0 !important;
                        font-size: ${fontSize}px !important;
                        line-height: 1.8 !important;
                        padding: 16px !important;
                        margin: 0 !important;
                    }
                    #maincontent, .chapter-content, .reading-content {
                        color: #e0e0e0 !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                    }
                `;
                iframeDoc.head.appendChild(style);
            }
        } catch (e) {
            // Cross-origin - can't inject styles, iframe will show as-is
        }
    }, [iframeLoaded, fontSize]);

    const navigateChapter = useCallback((ch: any) => {
        if (ch) navigate(`/novel-read/${sourceId}/${host}/${bookId}/${ch._id}`, { replace: true });
    }, [navigate, sourceId, host, bookId]);

    // Build the direct chapter URL
    const chapterUrl = `${STV_BASE}/truyen/${host}/1/${bookId}/${chapterId}/`;

    return (
        <div className="flex flex-col h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)] border-b border-[var(--color-border)] shrink-0">
                <div className="flex items-center h-12 px-3 gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-sm font-medium text-[var(--color-text)] truncate flex-1">
                        {currentChapter?.name || `Chương ${chapterId}`}
                    </h1>
                    <a
                        href={chapterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                        title="Mở trong tab mới"
                    >
                        <ExternalLink size={16} />
                    </a>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                    >
                        <Settings size={18} />
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="px-4 pb-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-[var(--color-text)]">Cỡ chữ</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setFontSize(s => Math.max(12, s - 2))}
                                    className="p-1.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]">
                                    <Minus size={16} />
                                </button>
                                <span className="text-sm text-[var(--color-text)] w-8 text-center">{fontSize}</span>
                                <button onClick={() => setFontSize(s => Math.min(32, s + 2))}
                                    className="p-1.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Iframe Content */}
            <div className="flex-1 relative overflow-hidden">
                {!iframeLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg)] z-10">
                        <Loader2 className="animate-spin text-[var(--color-primary)] mb-4" size={32} />
                        <p className="text-sm text-[var(--color-text-muted)]">Đang tải nội dung chương...</p>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={chapterUrl}
                    className="w-full h-full border-0"
                    onLoad={() => setIframeLoaded(true)}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    title={currentChapter?.name || 'Chapter Content'}
                />
            </div>

            {/* Bottom Navigation */}
            <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 py-3 shrink-0">
                <div className="flex items-center justify-between max-w-3xl mx-auto">
                    <button
                        onClick={() => prevChapter && navigateChapter(prevChapter)}
                        disabled={!prevChapter}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                        <ChevronLeft size={16} />
                        Trước
                    </button>

                    <button
                        onClick={() => navigate(`/novel/${sourceId}/${host}/${bookId}`)}
                        className="px-4 py-2 rounded-lg text-sm bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                        Mục lục
                    </button>

                    <button
                        onClick={() => nextChapter && navigateChapter(nextChapter)}
                        disabled={!nextChapter}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
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
