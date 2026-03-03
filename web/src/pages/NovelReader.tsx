import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Settings, Minus, Plus } from 'lucide-react';
import { fetchNovelChapters } from '../services/sangtacviet';

// Get the first worker URL for iframe src (stv-proxy)
function getStvProxyBase(): string {
    const workersStr = import.meta.env.VITE_CLOUDFLARE_WORKERS || '';
    const workers = workersStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    return workers.length > 0 ? workers[0] : '';
}

const NovelReader = () => {
    const { sourceId, host, bookId, chapterId } = useParams();
    const navigate = useNavigate();
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('novel-font-size') || '18'));
    const [showSettings, setShowSettings] = useState(false);

    // Build the iframe URL through the stv-proxy (HTTPS, no mixed content)
    const chapterUrl = useMemo(() => {
        const proxyBase = getStvProxyBase();
        if (!proxyBase || !host || !bookId || !chapterId) return '';
        // Route through /api/stv-proxy which proxies to http://14.225.254.182
        return `${proxyBase}/api/stv-proxy/truyen/${host}/1/${bookId}/${chapterId}/`;
    }, [host, bookId, chapterId]);

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

    const chapterName = currentChapter?.name || `Chương ${chapterId}`;

    // Save font size
    useEffect(() => {
        localStorage.setItem('novel-font-size', String(fontSize));
    }, [fontSize]);

    // Apply font size to iframe content
    useEffect(() => {
        const iframe = document.getElementById('stv-reader-iframe') as HTMLIFrameElement;
        if (!iframe) return;

        const applyFontSize = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc) {
                    const mainContent = doc.getElementById('maincontent') || doc.querySelector('.contentbox');
                    if (mainContent) {
                        (mainContent as HTMLElement).style.fontSize = `${fontSize}px`;
                    }
                }
            } catch (e) {
                // Cross-origin - can't access iframe content
            }
        };

        iframe.addEventListener('load', applyFontSize);
        applyFontSize();
        return () => iframe.removeEventListener('load', applyFontSize);
    }, [fontSize, chapterUrl]);

    // Scroll to top when chapter changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [chapterId]);

    const navigateChapter = useCallback((ch: any) => {
        if (ch) navigate(`/novel-read/${sourceId}/${host}/${bookId}/${ch._id}`, { replace: true });
    }, [navigate, sourceId, host, bookId]);

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)] border-b border-[var(--color-border)] shrink-0">
                <div className="flex items-center h-12 px-3 gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-sm font-medium text-[var(--color-text)] truncate flex-1">
                        {chapterName}
                    </h1>
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

            {/* Chapter Content via iframe through stv-proxy (HTTPS) */}
            <div className="flex-1">
                {chapterUrl ? (
                    <iframe
                        id="stv-reader-iframe"
                        src={chapterUrl}
                        className="w-full border-none"
                        style={{ minHeight: 'calc(100vh - 120px)', height: '100%' }}
                        title={chapterName}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm text-[var(--color-text-muted)]">Không thể tải nội dung chương.</p>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 py-3 shrink-0 sticky bottom-0">
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
