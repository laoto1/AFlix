import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BellRing, Bell, Bookmark, Play } from 'lucide-react';
import { getImageUrl } from '../services/otruyen';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';

interface BookmarkItem {
    id: number;
    source_id: string;
    comic_slug: string;
    comic_name: string;
    thumb_url: string;
    created_at: string;
    last_read_chapter_id?: string;
}

const fetchBookmarks = async (): Promise<BookmarkItem[]> => {
    const { data } = await axios.get('/api/bookmarks');
    return data.bookmarks;
};

const Library = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manga' | 'novel' | 'movie'>('manga');
    const { t } = useSettings();
    const { notifications, unreadCount } = useNotifications();

    const { data: bookmarks = [], isLoading, error } = useQuery({
        queryKey: ['bookmarks'],
        queryFn: fetchBookmarks,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
            </div>
        );
    }

    const filteredBookmarks = bookmarks.filter((item) => {
        if (activeTab === 'manga') return ['otruyen', 'nettruyen', 'nhentai'].includes(item.source_id);
        if (activeTab === 'novel') return ['sangtacviet', 'metruyenchu'].includes(item.source_id);
        if (activeTab === 'movie') return ['kkphim', 'thepy', 'phimapi'].includes(item.source_id);
        return false;
    });

    return (
        <div className="flex flex-col min-h-full bg-[var(--color-bg)] text-[var(--color-text)]">
            {/* App Bar / Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex flex-col shadow-sm border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between h-14 px-4">
                    <h1 className="text-xl font-medium text-[var(--color-text)]">{t('nav.library') || 'Thư viện'}</h1>
                    <Link to="/notifications" className="relative p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]">
                        <Bell size={24} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--color-bg)]"></span>
                        )}
                    </Link>
                </div>
                {/* Mode Tabs */}
                <div className="flex px-4 gap-4">
                    {(['manga', 'novel', 'movie'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                        >
                            {t(`nav.${tab}`)}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <div className="p-4 flex-1">
                {isLoading ? (
                    <div className="flex justify-center p-10">
                            <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                        </div>
                    ) : error ? (
                        <div className="text-center p-10 text-red-500">{t('library.failed')}</div>
                    ) : filteredBookmarks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-[var(--color-text-muted)]">
                            <Bookmark size={48} className="mb-4 opacity-50" />
                            <p>{t('library.empty')}</p>
                            <button
                                onClick={() => navigate('/home')}
                                className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-full text-sm font-medium"
                            >
                                {t('library.browse')}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {filteredBookmarks.map((item) => {
                                const thumbSource = item.thumb_url?.startsWith('http')
                                    ? item.thumb_url
                                    : getImageUrl(item.thumb_url);

                                // Count unread notifications for this specific comic
                                const unreadForComic = notifications.filter(
                                    n => !n.isRead && n.type === 'chapter' && n.id.startsWith(`ch-${item.comic_slug}-`)
                                );
                                const hasNew = unreadForComic.length > 0;

                                return (
                                    <div
                                        key={`${item.source_id}-${item.comic_slug}`}
                                        onClick={() => {
                                            if (activeTab === 'manga') navigate(`/comic/${item.source_id}/${item.comic_slug}`);
                                            else if (activeTab === 'novel') {
                                                if (item.source_id === 'metruyenchu') {
                                                    navigate(`/novel/metruyenchu/metruyenchu/${item.comic_slug}`);
                                                } else {
                                                    const parts = item.comic_slug.split('|');
                                                    const host = parts.length > 1 ? parts[0] : 'truyenfull';
                                                    const bookId = parts.length > 1 ? parts[1] : item.comic_slug;
                                                    navigate(`/novel/${item.source_id}/${host}/${bookId}`);
                                                }
                                            }
                                            else if (activeTab === 'movie') navigate(`/movie/${item.source_id}/${item.comic_slug}`);
                                        }}
                                        className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                                    >
                                        <img
                                            src={thumbSource}
                                            alt={item.comic_name}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                        />

                                        {/* Notification Bell */}
                                        {hasNew && (
                                            <div className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg" title="Có chương mới">
                                                <div className="relative animate-pulse">
                                                    <BellRing size={16} />
                                                    <span className="absolute -top-3 -right-3 bg-white text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                        {unreadForComic.length}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-12 flex flex-col justify-end">
                                            {item.last_read_chapter_id && (
                                                <div className="mb-1 text-[10px] text-gray-300">
                                                    Đã đọc: {item.last_read_chapter_id}
                                                </div>
                                            )}
                                            <h3 className="text-[var(--color-text)] text-xs font-medium line-clamp-2 w-full drop-shadow-md">
                                                {item.comic_name}
                                            </h3>
                                        </div>
                                        {/* overlay play button on hover */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="p-3 bg-[var(--color-primary)] rounded-full text-white">
                                                <Play size={20} fill="currentColor" className="ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default Library;
