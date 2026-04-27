import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useSettings } from '../contexts/SettingsContext';
import * as KKPhimService from '../services/kkphim';
import * as ThePYService from '../services/thepy';
import { KKPhimCard } from '../components/KKPhimCard';

const MovieSourceDetail = () => {
    const { t } = useSettings();
    const { sourceId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Filters state
    const activeTab = searchParams.get('tab') || 'phim-moi-cap-nhat';
    const sortField = searchParams.get('sort_field') || 'modified.time';
    const category = searchParams.get('category') || '';
    const country = searchParams.get('country') || '';
    const year = searchParams.get('year') || '';

    const updateFilter = (key: string, value: string) => {
        if (value) searchParams.set(key, value);
        else searchParams.delete(key);
        setSearchParams(searchParams, { replace: true });
    };

    const setActiveTab = (tab: string) => {
        searchParams.set('tab', tab);
        // Reset filters on tab change
        searchParams.delete('sort_field');
        searchParams.delete('category');
        searchParams.delete('country');
        searchParams.delete('year');
        setSearchParams(searchParams, { replace: true });
    };

    const { data: homeData, isLoading: isHomeLoading } = useQuery({
        queryKey: ['movie-home', sourceId],
        queryFn: () => {
            if (sourceId === 'thepy') return ThePYService.fetchHome();
            return KKPhimService.fetchHome();
        },
    });

    const categories = homeData?.data?.categories || [];

    const {
        data: listData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ['movie-list', sourceId, activeTab, sortField, category, country, year],
        queryFn: ({ pageParam = 1 }) => {
            if (sourceId === 'thepy') {
                return ThePYService.fetchList(activeTab, pageParam as number);
            }
            return KKPhimService.fetchList(activeTab, pageParam as number, {
                sort_field: sortField,
                category,
                country,
                year
            });
        },
        getNextPageParam: (lastPage: any) => {
            if (!lastPage?.data?.pagination) return undefined;
            const { currentPage, totalPages } = lastPage.data.pagination;
            return currentPage < totalPages ? currentPage + 1 : undefined;
        },
        initialPageParam: 1,
    });

    const movies = listData?.pages?.flatMap((p: any) => p?.data?.items || []) || [];

    const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)]">
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] border-b border-[var(--color-border)] shadow-sm">
                <div className="flex items-center h-14 px-4 gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-medium text-[var(--color-text)] flex-1 truncate">
                        {sourceId === 'thepy' ? 'thePY' : 'PhimKK'}
                    </h1>
                    <button onClick={() => navigate(`/search/${sourceId}`)} className="p-2 -mr-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]">
                        <Search size={24} />
                    </button>
                </div>
                
                {/* Tabs */}
                {!isHomeLoading && categories.length > 0 && (
                    <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 pb-3">
                        {categories.map((cat: any) => (
                            <button
                                key={cat.slug}
                                onClick={() => setActiveTab(cat.slug)}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === cat.slug
                                    ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[#3c3c3c]'
                                    }`}
                            >
                                {cat.slug === 'phim-moi-cap-nhat' ? `${t('mtc.tabs.latest')}${cat.title.replace('Mới nhất', '')}` : t(`kkphim.type.${cat.slug.replace('-', '')}`) === `kkphim.type.${cat.slug.replace('-', '')}` ? cat.title : t(`kkphim.type.${cat.slug.replace('-', '')}`)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters */}
                {activeTab !== 'phim-moi-cap-nhat' && sourceId !== 'thepy' && (
                    <div className="flex flex-wrap gap-2 px-4 pb-3 border-t border-[var(--color-border)] pt-3 bg-[var(--color-surface)]">
                        <select 
                            className="bg-[var(--color-bg)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-2 py-1 outline-none"
                            value={sortField} onChange={(e) => updateFilter('sort_field', e.target.value)}
                        >
                            <option value="">{t('kkphim.filter.sort')}</option>
                            {KKPhimService.SORT_FIELDS.map(c => <option key={c.value} value={c.value}>{t(`kkphim.sort.${c.value === 'modified.time' ? 'update' : c.value === 'year' ? 'year' : 'new'}`)}</option>)}
                        </select>
                        
                        <select 
                            className="bg-[var(--color-bg)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-2 py-1 outline-none"
                            value={category} onChange={(e) => updateFilter('category', e.target.value)}
                        >
                            <option value="">{t('kkphim.filter.all_genres')}</option>
                            {KKPhimService.CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{t(`kkphim.category.${c.slug}`) === `kkphim.category.${c.slug}` ? c.name : t(`kkphim.category.${c.slug}`)}</option>)}
                        </select>

                        <select 
                            className="bg-[var(--color-bg)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-2 py-1 outline-none"
                            value={country} onChange={(e) => updateFilter('country', e.target.value)}
                        >
                            <option value="">{t('kkphim.filter.all_countries')}</option>
                            {KKPhimService.COUNTRIES.map(c => <option key={c.slug} value={c.slug}>{t(`kkphim.country.${c.slug}`) === `kkphim.country.${c.slug}` ? c.name : t(`kkphim.country.${c.slug}`)}</option>)}
                        </select>

                        <select 
                            className="bg-[var(--color-bg)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-2 py-1 outline-none"
                            value={year} onChange={(e) => updateFilter('year', e.target.value)}
                        >
                            <option value="">{t('kkphim.filter.all_years')}</option>
                            {KKPhimService.YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {status === 'pending' ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                    </div>
                ) : status === 'error' ? (
                    <div className="text-center text-red-500 py-8">
                        {t('error.load_data')}
                    </div>
                ) : movies.length === 0 ? (
                    <div className="text-center text-[var(--color-text-muted)] py-8">
                        {t('search.no_results')}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {movies.map((movie: any, idx: number) => (
                            <KKPhimCard key={`${movie._id}-${idx}`} movie={movie} sourceId={sourceId || 'kkphim'} />
                        ))}
                    </div>
                )}
                
                <div ref={ref} className="py-4 flex justify-center">
                    {isFetchingNextPage && <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />}
                </div>
            </div>
        </div>
    );
};

export default MovieSourceDetail;
