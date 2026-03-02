import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Loader2, ChevronDown, ChevronUp, User, Tag } from 'lucide-react';
import { fetchNovelDetail, fetchNovelChapters } from '../services/sangtacviet';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { useSettings } from '../contexts/SettingsContext';

const NovelDetail = () => {
    const { sourceId, host, bookId } = useParams();
    const navigate = useNavigate();
    const { t } = useSettings();
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [chapterOrder, setChapterOrder] = useState<'asc' | 'desc'>('asc');

    const { data: detailData, isLoading: detailLoading } = useQuery({
        queryKey: ['novel-detail', sourceId, host, bookId],
        queryFn: () => fetchNovelDetail(host!, bookId!),
        enabled: !!host && !!bookId,
    });

    const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
        queryKey: ['novel-chapters', sourceId, host, bookId],
        queryFn: () => fetchNovelChapters(host!, bookId!),
        enabled: !!host && !!bookId,
    });

    const novel = detailData?.data?.item;
    const chapters = chaptersData?.data?.items || [];
    const sortedChapters = chapterOrder === 'desc' ? [...chapters].reverse() : chapters;

    if (detailLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
                <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
            </div>
        );
    }

    if (!novel) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                <p>Không tìm thấy truyện.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-[var(--color-primary)]">Quay lại</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
                <div className="flex items-center h-14 px-4 gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-base font-medium text-[var(--color-text)] truncate flex-1">{novel.name}</h1>
                </div>
            </header>

            {/* Novel Info */}
            <div className="p-4">
                <div className="flex gap-4">
                    {/* Cover */}
                    <div className="w-28 h-40 rounded-lg overflow-hidden bg-[var(--color-surface)] shrink-0 shadow-lg">
                        {novel.thumb_url ? (
                            <img
                                src={getProxiedImageUrl(novel.thumb_url)}
                                alt={novel.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                                <BookOpen size={32} />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--color-text)] leading-tight">{novel.name}</h2>
                        {novel.origin_name && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">{novel.origin_name}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-[var(--color-text-muted)]">
                            <User size={14} />
                            <span>{novel.author || 'Không rõ'}</span>
                        </div>
                        <div className="mt-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                novel.status === 'ongoing'
                                    ? 'bg-green-900/30 text-green-400'
                                    : novel.status === 'completed'
                                    ? 'bg-blue-900/30 text-blue-400'
                                    : 'bg-gray-700/30 text-gray-400'
                            }`}>
                                {novel.status === 'ongoing' ? t('comic.status.ongoing') :
                                 novel.status === 'completed' ? t('comic.status.completed') :
                                 novel.status || 'N/A'}
                            </span>
                        </div>
                        {novel.updatedAt && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                Cập nhật: {novel.updatedAt}
                            </p>
                        )}
                    </div>
                </div>

                {/* Categories */}
                {novel.category?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {novel.category.map((cat: any) => (
                            <span key={cat.slug} className="px-2 py-0.5 bg-[var(--color-surface)] text-[var(--color-text-muted)] rounded-full text-xs flex items-center gap-1">
                                <Tag size={10} />
                                {cat.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                {novel.content && (
                    <div className="mt-4">
                        <div className={`text-sm text-[var(--color-text-muted)] leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>
                            {novel.content}
                        </div>
                        <button
                            onClick={() => setShowFullDesc(!showFullDesc)}
                            className="text-xs text-[var(--color-primary)] mt-1"
                        >
                            {showFullDesc ? 'Thu gọn' : 'Xem thêm'}
                        </button>
                    </div>
                )}

                {/* Start Reading */}
                {chapters.length > 0 && (
                    <Link
                        to={`/novel-read/${sourceId}/${host}/${bookId}/${chapters[0]._id}`}
                        className="flex items-center justify-center gap-2 w-full mt-4 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        <BookOpen size={18} />
                        {t('comic.start_reading')}
                    </Link>
                )}
            </div>

            {/* Chapter List */}
            <div className="px-4 pb-20">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-medium text-[var(--color-text)]">
                        Danh sách chương ({chapters.length})
                    </h3>
                    <button
                        onClick={() => setChapterOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs"
                    >
                        {chapterOrder === 'asc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        {chapterOrder === 'asc' ? 'Cũ → Mới' : 'Mới → Cũ'}
                    </button>
                </div>

                {chaptersLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
                    </div>
                ) : chapters.length === 0 ? (
                    <p className="text-center text-[var(--color-text-muted)] py-8">Chưa có chương</p>
                ) : (
                    <div className="space-y-0.5">
                        {sortedChapters.map((ch: any) => (
                            <Link
                                key={ch._id}
                                to={`/novel-read/${sourceId}/${host}/${bookId}/${ch._id}`}
                                className="flex items-center px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] text-sm transition-colors"
                            >
                                <span className="truncate">{ch.name}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NovelDetail;
