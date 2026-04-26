import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, History as HistoryIcon, Clock, BookOpen, Film, Layers } from 'lucide-react';
import { getImageUrl } from '../services/otruyen'; // Fallback if thumbUrl is just the filename
import { useSettings } from '../contexts/SettingsContext';

interface HistoryItem {
    source_id: string;
    comic_slug: string;
    comic_name: string;
    chapter_id: string;
    thumb_url: string;
    last_read_at: string;
}

const fetchHistory = async (): Promise<HistoryItem[]> => {
    const { data } = await axios.get('/api/history');
    return data.history;
};

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
};

const History = () => {
    const { t } = useSettings();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manga' | 'novel' | 'movie'>('manga');

    const { data: history = [], isLoading, error } = useQuery({
        queryKey: ['history'],
        queryFn: fetchHistory,
    });

    const filteredHistory = history.filter((item) => {
        if (activeTab === 'manga') return ['otruyen', 'nettruyen', 'nhentai'].includes(item.source_id);
        if (activeTab === 'novel') return ['sangtacviet', 'metruyenchu'].includes(item.source_id);
        if (activeTab === 'movie') return ['kkphim'].includes(item.source_id);
        return false;
    });

    return (
        <div className="flex flex-col min-h-full bg-[var(--color-bg)]">
            {/* App Bar / Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex flex-col shadow-sm border-b border-[var(--color-border)]">
                <div className="flex items-center h-14 px-4">
                    <h1 className="text-xl font-medium text-[var(--color-text)] flex items-center gap-2">
                        <HistoryIcon size={20} className="text-[var(--color-primary)]" /> {t('nav.history')}
                    </h1>
                </div>
                {/* Tabs */}
                <div className="flex w-full overflow-x-auto hide-scrollbar border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                    <button
                        onClick={() => setActiveTab('manga')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === 'manga' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Layers size={16} /> Truyện tranh
                    </button>
                    <button
                        onClick={() => setActiveTab('novel')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === 'novel' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <BookOpen size={16} /> Tiểu thuyết
                    </button>
                    <button
                        onClick={() => setActiveTab('movie')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === 'movie' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Film size={16} /> Phim
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                    </div>
                ) : error ? (
                    <div className="text-center p-10 text-red-500">{t('history.failed')}</div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-[var(--color-text-muted)]">
                        <Clock size={48} className="mb-4 opacity-50" />
                        <p>{t('history.empty')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredHistory.map((item) => {
                            // Determine if thumb_url is a full URL or an Otruyen filename
                            const thumbSource = item.thumb_url?.startsWith('http')
                                ? item.thumb_url
                                : getImageUrl(item.thumb_url);

                            return (
                                <div
                                    key={`${item.source_id}-${item.comic_slug}`}
                                    onClick={() => {
                                        if (activeTab === 'manga') navigate(`/comic/${item.source_id}/${item.comic_slug}`);
                                        else if (activeTab === 'novel') navigate(`/novel/${item.source_id}/${item.comic_slug}`);
                                        else if (activeTab === 'movie') navigate(`/movie/${item.source_id}/${item.comic_slug}`);
                                    }}
                                    className="flex items-center gap-4 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer shadow-sm"
                                >
                                    <div className="w-16 h-24 rounded-md overflow-hidden bg-[#333] shrink-0">
                                        {thumbSource ? (
                                            <img src={thumbSource} alt={item.comic_name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{t('history.img_not_found')}</div>
                                        )}
                                    </div>
                                    <div className="flex-col flex-1 min-w-0">
                                        <h3 className="font-semibold text-[var(--color-text)] text-[15px] line-clamp-2">{item.comic_name}</h3>
                                        <div className="text-sm text-[var(--color-primary)] font-medium mt-1">Ch. {item.chapter_id}</div>
                                        <div className="text-xs text-[var(--color-text-muted)] mt-2 flex items-center gap-1">
                                            <Clock size={12} /> {formatTimeAgo(item.last_read_at)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
