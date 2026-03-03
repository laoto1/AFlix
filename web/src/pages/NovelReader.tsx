import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Settings, Minus, Plus } from 'lucide-react';
import { fetchNovelChapters, fetchNovelChapterContent } from '../services/sangtacviet';

const NovelReader = () => {
    const { sourceId, host, bookId, chapterId } = useParams();
    const navigate = useNavigate();
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('novel-font-size') || '18'));
    const [showSettings, setShowSettings] = useState(false);

    // Fetch chapter content via the server-side API (no mixed content issue)
    const { data: chapterData, isLoading, isError } = useQuery({
        queryKey: ['novel-chapter-content', sourceId, host, bookId, chapterId],
        queryFn: () => fetchNovelChapterContent(host!, bookId!, chapterId!),
        enabled: !!host && !!bookId && !!chapterId,
    });

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

    const chapterContent = chapterData?.data?.item?.content || '';
    const chapterName = chapterData?.data?.item?.name || currentChapter?.name || `Chương ${chapterId}`;

    // Save font size
    useEffect(() => {
        localStorage.setItem('novel-font-size', String(fontSize));
    }, [fontSize]);

    // Scroll to top when chapter changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [chapterId]);

    const navigateChapter = useCallback((ch: any) => {
        if (ch) navigate(`/novel-read/${sourceId}/${host}/${bookId}/${ch._id}`, { replace: true });
    }, [navigate, sourceId, host, bookId]);

    // Convert plain text content to HTML paragraphs
    const renderContent = (text: string) => {
        if (!text) return '';
        return text
            .split(/\n/)
            .map(line => line.replace(/^\t+/, '').trim())
            .filter(line => line.length > 0)
            .map(line => `<p>${line}</p>`)
            .join('');
    };

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

            {/* Chapter Content */}
            <div className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[var(--color-primary)] mb-4" size={32} />
                        <p className="text-sm text-[var(--color-text-muted)]">Đang tải nội dung chương...</p>
                    </div>
                )}

                {isError && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm text-red-400 mb-2">Không thể tải nội dung chương.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 rounded-lg text-sm bg-[var(--color-primary)] text-white hover:opacity-90"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {!isLoading && !isError && chapterContent && (
                    <div
                        className="novel-content text-[var(--color-text)]"
                        style={{
                            fontSize: `${fontSize}px`,
                            lineHeight: '1.9',
                        }}
                        dangerouslySetInnerHTML={{ __html: renderContent(chapterContent) }}
                    />
                )}

                {!isLoading && !isError && !chapterContent && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm text-[var(--color-text-muted)]">Không có nội dung cho chương này.</p>
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
