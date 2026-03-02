import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Settings, Minus, Plus } from 'lucide-react';
import { fetchNovelChapters } from '../services/sangtacviet';
import axios from 'axios';

const STV_PROXY_BASE = '/api/stv-proxy';

// Client-side chapter content fetcher via STV proxy
async function fetchChapterContentViaProxy(host: string, bookId: string, chapterId: string): Promise<any> {
    // Step 1: Visit the chapter page through proxy to establish session
    const chapterPageUrl = `${STV_PROXY_BASE}/truyen/${host}/1/${bookId}/${chapterId}/`;
    const pageRes = await axios.get(chapterPageUrl, { timeout: 20000 });
    const pageHtml = pageRes.data;

    // Extract _acx cookie from inline JS
    const acxMatch = pageHtml.match(/_acx=([^;'"]+)/);
    const acx = acxMatch ? acxMatch[1] : '';

    // Extract set-cookie header if forwarded
    const setCookieHeader = pageRes.headers['x-stv-set-cookie'] || '';

    // Build cookie string
    let cookies = `cookieenabled=true; _acx=${acx}`;
    if (setCookieHeader) {
        const parts = setCookieHeader.split(',').map((s: string) => s.split(';')[0].trim());
        cookies += '; ' + parts.join('; ');
    }

    // Step 2: Call readchapter AJAX via proxy
    const readUrl = `${STV_PROXY_BASE}/index.php?bookid=${bookId}&h=${host}&c=${chapterId}&ngmar=readc&sajax=readchapter&sty=1&exts=`;

    // Try up to 3 times (code 7 = retry after delay)
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await axios.post(readUrl, 'sajax=readchapter', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-STV-Cookie': cookies,
                },
                timeout: 15000,
            });

            const data = res.data;

            // Parse the response
            let parsed = data;
            if (typeof data === 'string') {
                try {
                    const jsonStart = data.indexOf('{"');
                    parsed = JSON.parse(jsonStart > 0 ? data.substring(jsonStart) : data);
                } catch {
                    parsed = { code: '-1' };
                }
            }

            if (parsed.code === '0' || parsed.code === 0) {
                return {
                    _id: chapterId,
                    name: parsed.chaptername || `Chương ${chapterId}`,
                    book_name: parsed.bookname || '',
                    content: parsed.content || parsed.c || '',
                    prev: parsed.prev,
                    next: parsed.next,
                };
            }

            // Code 7 = retry after delay
            if (parsed.code === '7' || parsed.code === 7) {
                const waitTime = parsed.time || 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime + 500));

                // Re-visit page (simulating location.reload())
                const pageRes2 = await axios.get(chapterPageUrl, { timeout: 20000 });
                const acxMatch2 = pageRes2.data.match(/_acx=([^;'"]+)/);
                if (acxMatch2) {
                    cookies = cookies.replace(/_acx=[^;]*/, `_acx=${acxMatch2[1]}`);
                }
                const sc2 = pageRes2.headers['x-stv-set-cookie'] || '';
                if (sc2) {
                    const parts2 = sc2.split(',').map((s: string) => s.split(';')[0].trim());
                    cookies += '; ' + parts2.join('; ');
                }
                continue;
            }

            // Other error codes
            return { _id: chapterId, name: `Chương ${chapterId}`, content: '', error: `Lỗi: code ${parsed.code}` };

        } catch (err: any) {
            if (attempt === 2) {
                return { _id: chapterId, name: `Chương ${chapterId}`, content: '', error: err.message };
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return { _id: chapterId, name: `Chương ${chapterId}`, content: '' };
}

const NovelReader = () => {
    const { sourceId, host, bookId, chapterId } = useParams();
    const navigate = useNavigate();
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('novel-font-size') || '18'));
    const [showSettings, setShowSettings] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Fetch chapter content via client-side proxy
    const { data: chapter, isLoading, error } = useQuery({
        queryKey: ['novel-chapter-proxy', sourceId, host, bookId, chapterId],
        queryFn: () => fetchChapterContentViaProxy(host!, bookId!, chapterId!),
        enabled: !!host && !!bookId && !!chapterId,
        retry: 1,
        staleTime: 5 * 60 * 1000,
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

    // Also use prev/next from the chapter response data (more reliable)
    const prevFromResponse = chapter?.prev;
    const nextFromResponse = chapter?.next;

    // Save font size
    useEffect(() => {
        localStorage.setItem('novel-font-size', String(fontSize));
    }, [fontSize]);

    // Scroll to top when chapter changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [chapterId]);

    const navigateChapter = useCallback((ch: any) => {
        if (ch) navigate(`/novel-read/${sourceId}/${host}/${bookId}/${ch._id || ch}`, { replace: true });
    }, [navigate, sourceId, host, bookId]);

    const goBack = useCallback(() => {
        navigate(`/novel/${sourceId}/${host}/${bookId}`);
    }, [navigate, sourceId, host, bookId]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)]">
                <Loader2 className="animate-spin text-[var(--color-primary)] mb-4" size={32} />
                <p className="text-sm text-[var(--color-text-muted)]">Đang tải nội dung chương...</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Có thể mất vài giây</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
                <div className="flex items-center h-12 px-3 gap-2">
                    <button onClick={goBack} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-sm font-medium text-[var(--color-text)] truncate flex-1">
                        {chapter?.name || `Chương ${chapterId}`}
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
            <div ref={contentRef} className="px-4 py-6 max-w-3xl mx-auto">
                {/* Chapter Title */}
                <h2 className="text-xl font-bold text-[var(--color-primary)] text-center mb-6">
                    {chapter?.name || `Chương ${chapterId}`}
                </h2>

                {/* Error State */}
                {(error || chapter?.error) && (
                    <div className="text-center py-8">
                        <p className="text-[var(--color-text-muted)] mb-4">
                            {chapter?.error || 'Không thể tải nội dung chương.'}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mb-4">
                            Sangtacviet yêu cầu xác minh trình duyệt. Hãy thử lại sau vài giây.
                        </p>
                    </div>
                )}

                {/* Content */}
                {chapter?.content ? (
                    <div
                        className="text-[var(--color-text)] leading-relaxed"
                        style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                        dangerouslySetInnerHTML={{ __html: chapter.content }}
                    />
                ) : !error && !chapter?.error ? (
                    <p className="text-center text-[var(--color-text-muted)]">Không có nội dung</p>
                ) : null}
            </div>

            {/* Bottom Navigation */}
            <div className="sticky bottom-0 bg-[var(--color-bg)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-4 py-3">
                <div className="flex items-center justify-between max-w-3xl mx-auto">
                    <button
                        onClick={() => {
                            const prev = prevChapter || (prevFromResponse ? { _id: prevFromResponse } : null);
                            if (prev) navigateChapter(prev);
                        }}
                        disabled={!prevChapter && !prevFromResponse}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                        <ChevronLeft size={16} />
                        Trước
                    </button>

                    <button
                        onClick={goBack}
                        className="px-4 py-2 rounded-lg text-sm bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                        Mục lục
                    </button>

                    <button
                        onClick={() => {
                            const next = nextChapter || (nextFromResponse ? { _id: nextFromResponse } : null);
                            if (next) navigateChapter(next);
                        }}
                        disabled={!nextChapter && !nextFromResponse}
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
