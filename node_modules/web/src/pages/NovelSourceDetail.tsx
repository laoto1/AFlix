import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Globe, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import * as STVService from '../services/sangtacviet';
import * as MTCService from '../services/metruyenchu';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { useSettings } from '../contexts/SettingsContext';

const NovelSourceDetail = () => {
    const { sourceId } = useParams();
    const navigate = useNavigate();
    const { t } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as string) || 'latest';
    const popularSort = searchParams.get('sort') || 'viewday';
    const curatedSort = searchParams.get('list') || 'truyen-ngon-tinh-ngan';
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

    const setCuratedSort = (list: string) => {
        searchParams.set('list', list);
        setSearchParams(searchParams, { replace: true });
    };

    // Determine sort & step from active tab
    const getListingParams = () => {
        switch (activeTab) {
            case 'latest': return { sort: 'update' };
            case 'random': return { sort: 'new' };
            case 'completed': return { sort: 'update', step: '3' };
            case 'popular': return { sort: popularSort };
            case 'curated': return { sort: curatedSort };
            default: return { sort: 'update' };
        }
    };

    const getService = () => {
        if (sourceId === 'metruyenchu') return MTCService;
        return STVService;
    };

    const {
        data: listData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['novel-listing', sourceId, activeTab, activeTab === 'popular' ? popularSort : activeTab === 'curated' ? curatedSort : ''],
        queryFn: ({ pageParam = 1 }) => {
            const params = getListingParams();
            const service = getService();
            if (sourceId === 'metruyenchu') {
                return service.fetchNovelListing(pageParam as number, activeTab === 'curated' ? curatedSort : activeTab); 
            }
            return (service as typeof STVService).fetchNovelListing(pageParam as number, params.sort, (params as any).step);
        },
        getNextPageParam: (lastPage: any) => {
            if (sourceId === 'metruyenchu') {
                if (!lastPage?.data?.pagination || !lastPage?.data?.items || lastPage.data.items.length === 0) return undefined;
                if (activeTab === 'latest') return undefined; // No infinite scroll for latest tab
                const { currentPage } = lastPage.data.pagination;
                return currentPage < 50 ? currentPage + 1 : undefined; // MTC roughly 50 pages limit
            }
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
        queryFn: () => getService().fetchNovelSearch(searchQuery),
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

    const TABS = sourceId === 'metruyenchu' ? [
        { id: 'latest', label: t('mtc.tabs.latest') },
        { id: 'random', label: t('mtc.tabs.hot') },
        { id: 'completed', label: t('mtc.tabs.completed') },
        { id: 'curated', label: t('mtc.tabs.curated') }
    ] : [
        { id: 'latest', label: t('mtc.tabs.latest') },
        { id: 'random', label: t('mtc.tabs.random') },
        { id: 'completed', label: t('mtc.tabs.completed') },
        { id: 'popular', label: t('mtc.tabs.popular') },
    ];

    const POPULAR_SORTS = [
        { sort: 'viewday', label: t('mtc.sort.viewday') },
        { sort: 'viewweek', label: t('mtc.sort.viewweek') },
        { sort: 'view', label: t('mtc.sort.view') },
        { sort: 'like', label: t('mtc.sort.like') },
        { sort: 'following', label: t('mtc.sort.following') },
        { sort: 'bookmarked', label: t('mtc.sort.bookmarked') },
    ];

    const CURATED_LISTS = [
        { id: 'truyen-ngon-tinh-ngan', label: 'Ngôn Tình Ngắn' },
        { id: 'truyen-ngon-tinh-hay', label: 'Ngôn Tình Hay' },
        { id: 'truyen-ngon-tinh-18', label: 'Ngôn Tình 18+' },
        { id: 'truyen-ngon-tinh-hoan', label: 'Ngôn Tình Hoàn Thành' },
        { id: 'truyen-ngon-tinh-hai-huoc', label: 'Ngôn Tình Hài' },
        { id: 'truyen-tien-hiep-hay', label: 'Tiên Hiệp Hay' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <div className="flex items-center h-14 px-4 gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-medium text-[var(--color-text)] flex-1">{sourceId === 'metruyenchu' ? 'Mê Truyện Chữ' : 'Sáng Tác Việt'}</h1>
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
                            placeholder={t('search.placeholder')}
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

            {/* Curated Sub-pills */}
            {activeTab === 'curated' && (
                <div className="bg-[var(--color-bg)] sticky top-[6.25rem] z-[29] px-3 py-2 border-b border-[var(--color-border)] flex gap-1.5 overflow-x-auto no-scrollbar">
                    {CURATED_LISTS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCuratedSort(item.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                curatedSort === item.id
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
                        {isSearching ? t('search.no_results').replace('"{query}"', '') : t('history.empty')}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 xs:gap-3 md:gap-4">
                        {novels.map((novel: any, idx: number) => {
                            const bookId = sourceId === 'metruyenchu' ? novel.id : novel.bookid;
                            const host = sourceId === 'metruyenchu' ? 'metruyenchu' : novel.host;
                            
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
                                <Link
                                    key={`${novel._id || novel.id}-${idx}`}
                                    to={`/novel/${sourceId}/${host}/${bookId}`}
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
                                    {novel.categories && novel.categories.length > 0 && (
                                        <div className="mb-1 flex flex-wrap gap-1">
                                            {novel.categories.slice(0, 2).map((cat: string, i: number) => (
                                                <button 
                                                    key={`${cat}-${i}`} 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        navigate(`/search/${sourceId}?genre=${slugify(cat)}`);
                                                    }}
                                                    className="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[8px] md:text-[10px] font-medium whitespace-nowrap hover:bg-[var(--color-primary)]/40 transition-colors z-10"
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                                        {novel.chapters_count && (
                                            <div className="w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[9px] md:text-[11px] text-[#8C8CFF] font-medium font-mono">
                                                {novel.chapters_count} chương
                                            </div>
                                        )}
                                        {novel.view_count && (
                                            <div className="w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[9px] md:text-[11px] text-gray-300 font-medium font-mono flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                                {novel.view_count}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-[var(--color-text)] text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md">
                                        {novel.name}
                                    </h3>
                                </div>
                            </Link>
                            );
                        })}
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
