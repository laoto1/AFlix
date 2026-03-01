import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { fetchLatestComics, fetchCompletedComics, getImageUrl } from '../services/otruyen';
import { fetchNhentaiComics, fetchNhentaiPopular } from '../services/nhentai';
import { fetchNettruyenComics, fetchNettruyenPopular, fetchNettruyenCompleted } from '../services/nettruyen';
import { useSettings } from '../contexts/SettingsContext';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const SourceDetail = () => {
    const { sourceId } = useParams();
    const navigate = useNavigate();

    // For now, we only support otruyen and nhentai
    const isOtruyen = sourceId === 'otruyen';
    const isNhentai = sourceId === 'nhentai';
    const isNettruyen = sourceId === 'nettruyen';
    const isSupported = isOtruyen || isNhentai || isNettruyen;
    const { t } = useSettings();

    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as 'latest' | 'completed' | 'popular') || 'latest';
    const popularSort = searchParams.get('sort') || 'popular-today';

    const setActiveTab = (tab: string) => {
        searchParams.set('tab', tab);
        setSearchParams(searchParams, { replace: true });
    };

    const setPopularSort = (sort: string) => {
        searchParams.set('sort', sort);
        setSearchParams(searchParams, { replace: true });
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: [sourceId, activeTab, (isNhentai || isNettruyen) && activeTab === 'popular' ? popularSort : ''],
        queryFn: ({ pageParam = 1 }) => {
            if (isNhentai) {
                return activeTab === 'popular'
                    ? fetchNhentaiPopular(pageParam as number, popularSort)
                    : fetchNhentaiComics(pageParam as number);
            }
            if (isNettruyen) {
                if (activeTab === 'completed') return fetchNettruyenCompleted(pageParam as number);
                if (activeTab === 'popular') {
                    let time = 'all';
                    if (popularSort === 'popular-today') time = 'day';
                    else if (popularSort === 'popular-week') time = 'week';
                    else if (popularSort === 'popular-month') time = 'month';
                    return fetchNettruyenPopular(pageParam as number, time);
                }
                return fetchNettruyenComics(pageParam as number);
            }
            return activeTab === 'latest'
                ? fetchLatestComics(pageParam as number)
                : fetchCompletedComics(pageParam as number);
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage?.data?.params?.pagination) return undefined;
            const { currentPage, totalItems, totalItemsPerPage } = lastPage.data.params.pagination;
            const totalPages = Math.ceil(totalItems / totalItemsPerPage);
            return currentPage < totalPages ? currentPage + 1 : undefined;
        },
        initialPageParam: 1,
        enabled: isSupported,
    });

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '100px',
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    useScrollRestoration(status === 'success');

    if (!isSupported) {
        return (
            <div className="p-4 text-center mt-10 text-[var(--color-text-muted)]">
                {t('source.unsupported', { source: sourceId || '' })}
            </div>
        );
    }

    // Flatten the infinite pages into a single items array
    const items = data?.pages.flatMap((page) => page.data?.items || page.items || []) || [];

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            {/* App Bar */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex items-center h-14 px-2 shadow-sm border-b border-[var(--color-border)] justify-between">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
                    >
                        <ArrowLeft className="text-[var(--color-text)]" size={24} />
                    </button>
                    <h1 className="text-xl font-medium text-[var(--color-text)] ml-2">
                        {t('source.list_title', { source: sourceId ? sourceId.charAt(0).toUpperCase() + sourceId.slice(1) : 'Source' })}
                    </h1>
                </div>
                <button
                    onClick={() => navigate(`/search/${sourceId}`)}
                    className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors mr-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)]"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                </button>
            </header>

            <div className="bg-[var(--color-bg)] sticky top-14 z-30 px-2 py-3 border-b border-[var(--color-border)] flex gap-2">
                <button
                    onClick={() => setActiveTab('latest')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'latest' ? 'bg-[var(--color-primary)] text-[var(--color-text)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[#3c3c3c]'}`}
                >
                    {t('source.latest')}
                </button>
                {(isNhentai || isNettruyen) && (
                    <button
                        onClick={() => setActiveTab('popular')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'popular' ? 'bg-[var(--color-primary)] text-[var(--color-text)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[#3c3c3c]'}`}
                    >
                        {t('source.popular')}
                    </button>
                )}
                {!isNhentai && (
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'completed' ? 'bg-[var(--color-primary)] text-[var(--color-text)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[#3c3c3c]'}`}
                    >
                        {t('source.completed')}
                    </button>
                )}
            </div>

            {/* Popular Time Range Sub-pills */}
            {(isNhentai || isNettruyen) && activeTab === 'popular' && (() => {
                const sortOptions = [
                    { sort: 'popular-today', label: t('source.popular_current') },
                    { sort: 'popular-week', label: t('source.popular_week') },
                    { sort: 'popular-month', label: t('source.popular_month') },
                    { sort: 'popular', label: t('source.popular_all') },
                ];
                return (
                    <div className="bg-[var(--color-bg)] sticky top-[6.25rem] z-[29] px-3 py-2 border-b border-[var(--color-border)] flex gap-1.5 overflow-x-auto no-scrollbar">
                        {sortOptions.map((item) => (
                            <button
                                key={item.sort}
                                onClick={() => setPopularSort(item.sort)}
                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${popularSort === item.sort
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:bg-[#3c3c3c]'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* Grid Content */}
            <div className="p-2">
                {status === 'pending' ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                    </div>
                ) : status === 'error' ? (
                    <div className="text-center p-10 text-red-500">{t('source.error')}</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 xs:gap-3 md:gap-4">
                        {items.map((item, idx) => (
                            <div
                                key={`${item._id}-${idx}`}
                                onClick={() => navigate(`/comic/${sourceId}/${item.slug}`)}
                                className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                            >
                                <img
                                    src={(isNhentai || isNettruyen) ? item.thumb_url : getImageUrl(item.thumb_url)}
                                    alt={item.name}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent p-2 pt-12 flex flex-col justify-end">
                                    {item.chaptersLatest && item.chaptersLatest.length > 0 && (
                                        <div className="mb-1 w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[10px] md:text-xs text-[#8C8CFF] font-medium font-mono">
                                            {item.chaptersLatest[0].chapter_name}
                                        </div>
                                    )}
                                    <h3 className="text-[var(--color-text)] text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md">
                                        {item.name}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Load More Trigger Area */}
                {hasNextPage && (
                    <div ref={ref} className="flex justify-center p-4 mt-2 h-20">
                        {isFetchingNextPage && <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceDetail;
