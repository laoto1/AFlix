import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Globe, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { fetchNovelListing, fetchNovelSearch } from '../services/sangtacviet';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { useSettings } from '../contexts/SettingsContext';

const NovelSourceDetail = () => {
    const { sourceId } = useParams();
    const navigate = useNavigate();
    const { t: _ } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as string) || 'latest';
    const popularSort = searchParams.get('sort') || 'viewday';
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const setActiveTab = (tab: string) => {
        searchParams.set('tab', tab);
        setSearchParams(searchParams, { replace: true });
        setIsSearching(false);
        setSearchQuery('');
    };

    const setPopularSort = (sort: string) => {
        searchParams.set('sort', sort);
        setSearchParams(searchParams, { replace: true });
    };

    // Determine sort & step from active tab
    const getListingParams = () => {
        switch (activeTab) {
            case 'latest': return { sort: 'update' };
            case 'random': return { sort: 'new' };
            case 'completed': return { sort: 'update', step: '3' };
            case 'popular': return { sort: popularSort };
            default: return { sort: 'update' };
        }
    };

    const {
        data: listData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['novel-listing', sourceId, activeTab, activeTab === 'popular' ? popularSort : ''],
        queryFn: ({ pageParam = 1 }) => {
            const params = getListingParams();
            return fetchNovelListing(pageParam as number, params.sort, (params as any).step);
        },
        getNextPageParam: (lastPage: any) => {
            if (!lastPage?.data?.params?.pagination) return undefined;
            const { currentPage, totalItems, totalItemsPerPage } = lastPage.data.params.pagination;
            const totalPages = Math.ceil(totalItems / totalItemsPerPage);
            return currentPage < totalPages ? currentPage + 1 : undefined;
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
        : listData?.pages?.flatMap((p: any) => p?.data?.items || []) || [];

    const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage && !isSearching) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, isSearching]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) setIsSearching(true);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
    };

    const TABS = [
        { id: 'latest', label: 'Mới nhất' },
        { id: 'random', label: 'Ngẫu nhiên' },
        { id: 'completed', label: 'Hoàn thành' },
        { id: 'popular', label: 'Phổ biến' },
    ];

    const POPULAR_SORTS = [
        { sort: 'viewday', label: 'Hiện tại' },
        { sort: 'viewweek', label: 'Trong tuần' },
        { sort: 'view', label: 'Toàn bộ' },
        { sort: 'like', label: 'Lượt thích' },
        { sort: 'following', label: 'Theo dõi' },
        { sort: 'bookmarked', label: 'Đánh dấu' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <div className="flex items-center h-14 px-4 gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-medium text-[var(--color-text)] flex-1">Sáng Tác Việt</h1>
                    <button
                        onClick={() => navigate(`/search/${sourceId}`)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                    >
                        <Search size={20} />
                    </button>
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
                            placeholder="Tìm truyện..."
                            className="w-full bg-[var(--color-surface)] text-[var(--color-text)] rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                        />
                    </div>
                </form>
            </header>

            {/* Tabs */}
            <div className="bg-[var(--color-bg)] sticky top-14 z-30 px-2 py-3 border-b border-[var(--color-border)] flex gap-2">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[#3c3c3c]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Popular Sub-pills */}
            {activeTab === 'popular' && (
                <div className="bg-[var(--color-bg)] sticky top-[6.25rem] z-[29] px-3 py-2 border-b border-[var(--color-border)] flex gap-1.5 overflow-x-auto no-scrollbar">
                    {POPULAR_SORTS.map(item => (
                        <button
                            key={item.sort}
                            onClick={() => setPopularSort(item.sort)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                popularSort === item.sort
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:bg-[#3c3c3c]'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="p-2 flex-1">
                {status === 'pending' || (isSearching && isSearchLoading) ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                    </div>
                ) : novels.length === 0 ? (
                    <div className="text-center text-[var(--color-text-muted)] py-12">
                        {isSearching ? 'Không tìm thấy truyện.' : 'Chưa có truyện.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 xs:gap-3 md:gap-4">
                        {novels.map((novel: any, idx: number) => (
                            <Link
                                key={`${novel._id}-${idx}`}
                                to={`/novel/${sourceId}/${novel.host}/${novel.bookid}`}
                                className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                            >
                                {novel.thumb_url ? (
                                    <img
                                        src={getProxiedImageUrl(novel.thumb_url)}
                                        alt={novel.name}
                                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                                        <Globe size={24} />
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent p-2 pt-12 flex flex-col justify-end">
                                    {novel.chapters_count && (
                                        <div className="mb-1 w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[10px] md:text-xs text-[#8C8CFF] font-medium font-mono">
                                            {novel.chapters_count} chương
                                        </div>
                                    )}
                                    <h3 className="text-[var(--color-text)] text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md">
                                        {novel.name}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Load More Trigger */}
                {!isSearching && hasNextPage && (
                    <div ref={ref} className="flex justify-center p-4 mt-2 h-20">
                        {isFetchingNextPage && <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NovelSourceDetail;
