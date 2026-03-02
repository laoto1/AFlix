import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Settings, Minus, Plus } from 'lucide-react';
import { fetchNovelChapterContent, fetchNovelChapters } from '../services/sangtacviet';
import { useSettings } from '../contexts/SettingsContext';

const NovelReader = () => {
    const { sourceId, host, bookId, chapterId } = useParams();
    const navigate = useNavigate();
    const { t } = useSettings();
    const [fontSize, setFontSize] = useState(() => {
        return parseInt(localStorage.getItem('novel-font-size') || '18');
    });
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Fetch chapter content
    const { data: chapterData, isLoading } = useQuery({
        queryKey: ['novel-chapter', sourceId, host, bookId, chapterId],
        queryFn: () => fetchNovelChapterContent(host!, bookId!, chapterId!),
        enabled: !!host && !!bookId && !!chapterId,
    });

    // Fetch chapter list for prev/next navigation
    const { data: chaptersData } = useQuery({
        queryKey: ['novel-chapters', sourceId, host, bookId],
        queryFn: () => fetchNovelChapters(host!, bookId!),
        enabled: !!host && !!bookId,
    });

    const chapter = chapterData?.data?.item;
    const chapters = chaptersData?.data?.items || [];
    const currentIdx = chapters.findIndex((ch: any) => String(ch._id) === String(chapterId));
    const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
    const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

    // Save font size
    useEffect(() => {
        localStorage.setItem('novel-font-size', String(fontSize));
    }, [fontSize]);

    // Scroll to top when chapter changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [chapterId]);

    const navigateChapter = (ch: any) => {
        if (ch) navigate(`/novel-read/${sourceId}/${host}/${bookId}/${ch._id}`, { replace: true });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
                <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg)]" onClick={() => setShowControls(s => !s)}>
            {/* Top Bar */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)] transition-transform duration-300 ${
                    showControls ? 'translate-y-0' : '-translate-y-full'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center h-14 px-4 gap-3">
                    <button
                        onClick={() => navigate(`/novel/${sourceId}/${host}/${bookId}`)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">
                            {chapter?.book_name || ''}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {chapter?.name || `Chương ${chapterId}`}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSettings(s => !s)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="px-4 pb-3 border-t border-[var(--color-border)]">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-[var(--color-text)]">Cỡ chữ</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFontSize(s => Math.max(12, s - 2))}
                                    className="p-1.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="text-sm text-[var(--color-text)] w-8 text-center">{fontSize}</span>
                                <button
                                    onClick={() => setFontSize(s => Math.min(32, s + 2))}
                                    className="p-1.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Content */}
            <div className="px-4 py-20 max-w-2xl mx-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-6 text-center">
                    {chapter?.name || `Chương ${chapterId}`}
                </h2>
                <div
                    className="text-[var(--color-text)] leading-[1.8] whitespace-pre-wrap"
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: chapter?.content || '<p style="text-align:center;color:gray;">Không có nội dung</p>' }}
                />
            </div>

            {/* Bottom Navigation */}
            <nav
                className={`fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-md border-t border-[var(--color-border)] transition-transform duration-300 ${
                    showControls ? 'translate-y-0' : 'translate-y-full'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between h-14 px-4">
                    <button
                        onClick={() => navigateChapter(prevChapter)}
                        disabled={!prevChapter}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            prevChapter
                                ? 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                                : 'opacity-30 text-[var(--color-text-muted)] cursor-not-allowed'
                        }`}
                    >
                        <ChevronLeft size={16} />
                        Trước
                    </button>

                    <span className="text-xs text-[var(--color-text-muted)]">
                        {currentIdx >= 0 ? `${currentIdx + 1}/${chapters.length}` : ''}
                    </span>

                    <button
                        onClick={() => navigateChapter(nextChapter)}
                        disabled={!nextChapter}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            nextChapter
                                ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                                : 'opacity-30 text-[var(--color-text-muted)] cursor-not-allowed'
                        }`}
                    >
                        Sau
                        <ChevronRight size={16} />
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default NovelReader;
