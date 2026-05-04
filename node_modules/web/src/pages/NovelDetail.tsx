import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, BookOpen, Loader2, ChevronDown, ChevronUp, Globe, Share2 } from 'lucide-react';
import * as STVService from '../services/sangtacviet';
import * as MTCService from '../services/metruyenchu';
import { getProxiedImageUrl } from '../utils/imageProxy';

const NovelDetail = () => {
    const { sourceId, host, bookId } = useParams();
    const navigate = useNavigate();
    const [sortAsc, setSortAsc] = useState(true);
    const [activeHost, setActiveHost] = useState(host || '');
    const [activeBookId, setActiveBookId] = useState(bookId || '');
    const [isCopied, setIsCopied] = useState(false);


    // Fetch novel detail
    const { data: detailData, isLoading: detailLoading } = useQuery({
        queryKey: ['novel-detail', sourceId, host, bookId],
        queryFn: () => sourceId === 'metruyenchu' ? MTCService.fetchNovelDetail(bookId!) : STVService.fetchNovelDetail(host!, bookId!),
        enabled: !!host && !!bookId,
    });

    // Fetch chapters for the active host
    const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
        queryKey: ['novel-chapters', sourceId, activeHost, activeBookId],
        queryFn: () => sourceId === 'metruyenchu' ? MTCService.fetchNovelChapters(activeBookId) : STVService.fetchNovelChapters(activeHost, activeBookId),
        enabled: !!activeHost && !!activeBookId,
    });

    // Fetch history to get resume reading point
    const { data: historyRes } = useQuery({
        queryKey: ['history', sourceId === 'metruyenchu' ? bookId : `${host}|${bookId}`],
        queryFn: async () => {
            const slug = sourceId === 'metruyenchu' ? bookId : `${host}|${bookId}`;
            const res = await axios.get(`/api/history?comicSlug=${slug}`);
            return res.data;
        },
        enabled: !!bookId,
    });
    const historyData = historyRes;

    const novel = sourceId === 'metruyenchu' ? detailData?.data : detailData?.data?.item;
    const chapters = sourceId === 'metruyenchu' ? (chaptersData?.data?.chapters || []) : (chaptersData?.data?.items || []);
    const availableHosts: any[] = novel?.available_hosts || [];
    const sortedChapters = sortAsc ? chapters : [...chapters].reverse();

    // Update active host when novel data loads
    useEffect(() => {
        if (novel && host && bookId) {
            setActiveHost(host);
            setActiveBookId(bookId);
        }
    }, [novel, host, bookId]);

    const handleHostChange = (h: any) => {
        setActiveHost(h.host);
        setActiveBookId(h.bookid);
    };

    const handleShare = () => {
        const shareUrl = `https://share.laoto.workers.dev/novel/${sourceId}/${activeHost}/${activeBookId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const continueReadingInfo = historyData?.history?.[0];

    if (detailLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
                <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
                <div className="flex items-center h-14 px-4 gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-medium text-[var(--color-text)] truncate flex-1">{novel?.name || 'Chi tiết'}</h1>
                    <button
                        onClick={handleShare}
                        className={`p-2 rounded-full transition-colors ${isCopied ? 'text-green-500 bg-green-500/10' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'}`}
                        title="Chia sẻ"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            {/* Novel Info */}
            {novel && (
                <div className="p-4">
                    <div className="flex gap-4 mb-4">
                        <div className="w-28 h-40 rounded-lg overflow-hidden bg-[var(--color-surface)] shrink-0">
                            {novel.thumb_url ? (
                                <img src={getProxiedImageUrl(novel.thumb_url)} alt={novel.name}
                                    className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                                    <Globe size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">{novel.name}</h2>
                            {novel.origin_name && (
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">{novel.origin_name}</p>
                            )}
                            <p className="text-sm text-[var(--color-primary)] mb-1">{novel.author}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {(novel.category || novel.categories)?.map((c: any, index: number) => {
                                    const catName = c.name || c;
                                    const slugify = (text: string) => {
                                        return text.toString().toLowerCase()
                                            .replace(/đ/g, 'd')
                                            .normalize('NFD')
                                            .replace(/[\u0300-\u036f]/g, '')
                                            .replace(/\s+/g, '-')
                                            .replace(/[^\w\-]+/g, '')
                                            .replace(/\-\-+/g, '-')
                                            .replace(/^-+/, '')
                                            .replace(/-+$/, '');
                                    };
                                    return (
                                        <button 
                                            key={`${c.slug || slugify(catName)}-${index}`} 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                navigate(`/search/${sourceId}?genre=${slugify(catName)}`);
                                            }}
                                            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                        >
                                            {catName}
                                        </button>
                                    );
                                })}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                novel.status === 'ongoing' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'
                            }`}>
                                {novel.status === 'ongoing' ? 'Còn tiếp' : novel.status === 'completed' ? 'Hoàn thành' : novel.status}
                            </span>
                        </div>
                    </div>

                    {/* Synopsis */}
                    {novel.content && (
                        <div className="mb-4 p-3 rounded-lg bg-[var(--color-surface)]">
                            <p className="text-sm text-[var(--color-text-muted)] line-clamp-4">{novel.content}</p>
                        </div>
                    )}

                    {/* Start Reading Button */}
                    {chapters.length > 0 && (
                        <button
                            onClick={() => {
                                const targetChapter = continueReadingInfo ? continueReadingInfo.chapter_id : (chapters[0]._id || chapters[0].id);
                                navigate(`/novel-read/${sourceId}/${activeHost}/${activeBookId}/${targetChapter}`, {
                                    state: { 
                                        thumbUrl: novel.thumb_url,
                                        initialScroll: continueReadingInfo?.chapter_id === targetChapter ? continueReadingInfo?.page_number : 0
                                    }
                                });
                            }}
                            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition-opacity"
                        >
                            <BookOpen size={18} />
                            {continueReadingInfo ? `Đọc tiếp ${chapters.find((c: any) => (c._id || c.id) === continueReadingInfo.chapter_id)?.name || continueReadingInfo.chapter_id.replace(/^chuong-/i, 'Chương ').replace(/-[a-zA-Z0-9]+$/, '')}` : 'Bắt đầu đọc'}
                        </button>
                    )}

                    {/* Available Hosts */}
                    {availableHosts.length > 1 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">Nguồn truyện</h3>
                            <div className="flex flex-wrap gap-2">
                                {availableHosts.map((h: any) => (
                                    <button
                                        key={`${h.host}-${h.bookid}`}
                                        onClick={() => handleHostChange(h)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                            activeHost === h.host && activeBookId === h.bookid
                                                ? 'bg-[var(--color-primary)] text-white'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                                        }`}
                                    >
                                        {h.name} {h.chapters_count > 0 ? `(${h.chapters_count})` : ''}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chapter List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-[var(--color-text)]">
                                Danh sách chương ({chapters.length})
                                {activeHost !== host && (
                                    <span className="text-xs text-[var(--color-primary)] ml-2">• {activeHost}</span>
                                )}
                            </h3>
                            <button
                                onClick={() => setSortAsc(!sortAsc)}
                                className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                {sortAsc ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                {sortAsc ? 'Cũ → Mới' : 'Mới → Cũ'}
                            </button>
                        </div>

                        {chaptersLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
                            </div>
                        ) : chapters.length === 0 ? (
                            <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                                Không tìm thấy chương nào. Thử chọn nguồn khác.
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {sortedChapters.map((ch: any) => (
                                    <Link
                                        key={ch._id || ch.id}
                                        to={`/novel-read/${sourceId}/${activeHost}/${activeBookId}/${ch._id || ch.id}`}
                                        className="block px-3 py-2.5 rounded-lg text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors truncate"
                                    >
                                        {ch.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NovelDetail;
