import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Globe, Loader2 } from 'lucide-react';
import { fetchNovelLatest, fetchNovelSearch } from '../services/sangtacviet';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { useSettings } from '../contexts/SettingsContext';

const NovelSourceDetail = () => {
    const { sourceId } = useParams();
    const navigate = useNavigate();
    const { t } = useSettings();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const {
        data: latestData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['novel-latest', sourceId],
        queryFn: async ({ pageParam = 1 }) => fetchNovelLatest(pageParam as number),
        getNextPageParam: (lastPage: any, allPages: any[]) => {
            if (lastPage?.data?.items?.length > 0) return allPages.length + 1;
            return undefined;
        },
        initialPageParam: 1,
        enabled: !isSearching,
    });

    const { data: searchData, isLoading: isSearchLoading } = useQuery({
        queryKey: ['novel-search', sourceId, searchQuery],
        queryFn: () => fetchNovelSearch(searchQuery),
        enabled: isSearching && searchQuery.length > 1,
    });

    const novels = isSearching
        ? searchData?.data?.items || []
        : latestData?.pages?.flatMap((p: any) => p?.data?.items || []) || [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setIsSearching(true);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <div className="flex items-center h-14 px-4 gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-medium text-[var(--color-text)] flex-1">Sáng Tác Việt</h1>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!e.target.value) clearSearch();
                            }}
                            placeholder={t('search.placeholder') || 'Tìm truyện...'}
                            className="w-full bg-[var(--color-surface)] text-[var(--color-text)] rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                    </div>
                </form>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {(isLoading || isSearchLoading) && novels.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                    </div>
                ) : novels.length === 0 ? (
                    <div className="text-center text-[var(--color-text-muted)] py-12">
                        {isSearching ? 'Không tìm thấy truyện.' : 'Chưa có truyện.'}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {novels.map((novel: any, idx: number) => (
                                <Link
                                    key={`${novel._id}-${idx}`}
                                    to={`/novel/${sourceId}/${novel.host}/${novel.bookid}`}
                                    className="flex flex-col group"
                                >
                                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[var(--color-surface)] relative">
                                        {novel.thumb_url ? (
                                            <img
                                                src={getProxiedImageUrl(novel.thumb_url)}
                                                alt={novel.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                                                <Globe size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-xs text-[var(--color-text)] line-clamp-2 font-medium leading-tight">
                                        {novel.name}
                                    </p>
                                </Link>
                            ))}
                        </div>

                        {/* Load More */}
                        {!isSearching && hasNextPage && (
                            <div className="flex justify-center py-6">
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="px-6 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-full text-sm hover:bg-[var(--color-surface-hover)] transition-colors"
                                >
                                    {isFetchingNextPage ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        'Tải thêm'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NovelSourceDetail;
