import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, ArrowLeft, Loader2, X, SlidersHorizontal } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { fetchSearchComics, fetchComicsByCategory, getImageUrl, fetchCategories } from '../services/otruyen';
import { fetchNhentaiSearch } from '../services/nhentai';
import { fetchNettruyenSearch, fetchNettruyenCategories, fetchNettruyenComicsByCategory } from '../services/nettruyen';
import { fetchNovelSearch as fetchMTCSearch, fetchNovelListing as fetchMTCListing, fetchMetruyenchuCategories } from '../services/metruyenchu';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';
import { useSettings } from '../contexts/SettingsContext';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { KKPhimCard } from '../components/KKPhimCard';
import { fetchList as fetchKKPhimList, fetchSearch as fetchKKPhimSearch, CATEGORIES as KKPHIM_CATEGORIES, COUNTRIES as KKPHIM_COUNTRIES, TYPES as KKPHIM_TYPES, SORT_FIELDS as KKPHIM_SORT_FIELDS, YEARS as KKPHIM_YEARS } from '../services/kkphim';

const Search = () => {
    const { sourceId } = useParams();
    const navigate = useNavigate();
    const { t } = useSettings();
    const isNhentai = sourceId === 'nhentai';
    const isNettruyen = sourceId === 'nettruyen';
    const isKkphim = sourceId === 'kkphim';
    const isMetruyenchu = sourceId === 'metruyenchu';
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsGenre = searchParams.get('genre');
    const selectedGenres = searchParamsGenre ? searchParamsGenre.split(',') : [];

    const [showFilterModal, setShowFilterModal] = useState(false);
    const [activeNhentaiTab, setActiveNhentaiTab] = useState('tags');
    const kkphimCategory = searchParams.get('category') || '';
    const kkphimCountry = searchParams.get('country') || '';
    const kkphimYear = searchParams.get('year') || '';
    const kkphimSortField = searchParams.get('sort_field') || '';
    const kkphimType = searchParams.get('type') || '';
    
    const updateKKPhimFilter = (key: string, value: string) => {
        if (value) searchParams.set(key, value);
        else searchParams.delete(key);
        searchParams.delete('genre');
        setSearchParams(searchParams, { replace: true });
    };
    const [nhentaiTagQuery, setNhentaiTagQuery] = useState('');

    // User text input query
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 500);

    const isTextSearch = debouncedQuery.length > 2;
    const isGenreSearch = selectedGenres.length > 0 && !isTextSearch;
    const isKkphimSearch = isKkphim && (kkphimCategory || kkphimCountry || kkphimYear || kkphimSortField || kkphimType);
    const isSearchEnabled = Boolean(isTextSearch || isGenreSearch || isKkphimSearch);

    // queryKey param should bundle both to trigger refetches correctly
    const queryKeyParam = isNhentai
        ? `${debouncedQuery} ${selectedGenres.join(' ')}`.trim()
        : isKkphim 
        ? `${debouncedQuery}-${kkphimCategory}-${kkphimCountry}-${kkphimYear}-${kkphimSortField}-${kkphimType}`
        : `${debouncedQuery}-${selectedGenres.join(',')}`;

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        refetch
    } = useInfiniteQuery({
        queryKey: ['search', sourceId || 'otruyen', queryKeyParam],
        queryFn: ({ pageParam = 1 }) => {
            if (isNhentai) {
                return fetchNhentaiSearch(queryKeyParam, pageParam as number);
            }
            if (isKkphim) {
                const filters = {
                    category: kkphimCategory,
                    country: kkphimCountry,
                    year: kkphimYear,
                    sort_field: kkphimSortField,
                    type: kkphimType
                };
                if (debouncedQuery) {
                    return fetchKKPhimSearch(debouncedQuery, pageParam as number);
                } else {
                    return fetchKKPhimList('advanced-search', pageParam as number, filters);
                }
            }
            if (isNettruyen) {
                if (isTextSearch) {
                    return fetchNettruyenSearch(debouncedQuery, pageParam as number);
                } else if (isGenreSearch) {
                    return fetchNettruyenComicsByCategory(selectedGenres[0], pageParam as number);
                }
            }

            if (isMetruyenchu) {
                if (isTextSearch) {
                    return fetchMTCSearch(debouncedQuery); // MTC search might not support pagination
                } else if (isGenreSearch) {
                    return fetchMTCListing(pageParam as number, undefined, selectedGenres[0]);
                }
            }

            // Fallback for Otruyen
            if (isTextSearch) {
                return fetchSearchComics(debouncedQuery, pageParam as number);
            } else if (isGenreSearch) {
                // Fetch using the primary genre, we filter the rest client-side
                return fetchComicsByCategory(selectedGenres[0], pageParam as number);
            }
            return Promise.reject("Invalid Search");
        },
        getNextPageParam: (lastPage) => {
            if (isMetruyenchu) {
                if (!lastPage?.data?.pagination || !lastPage?.data?.items || lastPage.data.items.length === 0) return undefined;
                const { currentPage } = lastPage.data.pagination;
                return currentPage < 50 ? currentPage + 1 : undefined; // MTC roughly 50 pages limit
            }
            const pagination = lastPage.data?.pagination || lastPage.data?.params?.pagination;
            if (!pagination) return undefined;
            const { currentPage, totalItems, totalItemsPerPage, totalPages: apiTotalPages } = pagination;
            const totalPages = apiTotalPages || Math.ceil(totalItems / totalItemsPerPage);
            return currentPage < totalPages ? currentPage + 1 : undefined;
        },
        initialPageParam: 1,
        enabled: isSearchEnabled,
    });

    // Reset and refetch when query changes
    useEffect(() => {
        if (isSearchEnabled) {
            refetch();
        }
    }, [debouncedQuery, searchParamsGenre, refetch]);

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

    // Categories for filter modal
    const { data: categoriesData } = useQuery({
        queryKey: [sourceId || 'otruyen', 'categories'],
        queryFn: async () => {
            if (isNhentai) {
                // Check localStorage cache (24h TTL)
                const CACHE_KEY = 'nhentai_tags_cache';
                const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
                try {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL) {
                            return parsed.data;
                        }
                    }
                } catch { /* ignore parse errors */ }

                // Fetch tags by harvesting metadata from popular galleries
                const res = await axios.get('/api/nhentai-tags?pages=10');
                const responseData = res.data;

                // Cache in localStorage
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: responseData }));
                } catch { /* quota exceeded — ignore */ }

                return responseData;
            }
            if (isNettruyen) {
                return fetchNettruyenCategories();
            }
            if (isMetruyenchu) {
                return fetchMetruyenchuCategories();
            }
            return fetchCategories();
        },
        enabled: showFilterModal,
        staleTime: 1000 * 60 * 60, // 1h React Query cache
    });

    // Otruyen returns an array of items. Nhentai tags endpoint returns { items: { tags: [], artists: [] ...} }
    const isNhentaiTags = isNhentai && categoriesData?.data?.items && !Array.isArray(categoriesData.data.items);
    const categories = isNhentaiTags ? [] : (Array.isArray(categoriesData?.data?.items) ? categoriesData.data.items : []);
    const nhentaiCategoryGroups = isNhentaiTags ? categoriesData.data.items : null;

    let items = (data?.pages.flatMap((page) => page.data?.items || page.data || []) || []).filter(Boolean);

    // Client-side filtering for multiple genres (Otruyen only)
    if (selectedGenres.length > 0 && !isNhentai && !isNettruyen && !isMetruyenchu) {
        items = items.filter(item => {
            if (!item.category) return false;
            // Item must contain ALL selected genres
            return selectedGenres.every(genreSlug =>
                item.category!.some((c: any) => c.slug === genreSlug)
            );
        });
    }

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            {/* Search Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex items-center h-14 px-2 shadow-sm border-b border-[var(--color-border)] gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-[var(--color-surface)] transition-colors"
                >
                    <ArrowLeft className="text-[var(--color-text)]" size={24} />
                </button>
                <div className="flex-1 relative">
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('search.placeholder')}
                        className="w-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-full px-4 py-2 pl-10 pr-10 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                    <SearchIcon className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" size={18} />
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className="absolute right-3 top-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                </div>
            </header>

            {/* Results Area */}
            <div className="p-2">
                {(selectedGenres.length > 0 || isKkphimSearch) && (
                    <div className="mb-4 flex items-center gap-2 px-2 flex-wrap">
                        <span className="text-sm text-[var(--color-text-muted)]">{t('search.genres')}:</span>
                        {selectedGenres.map(genre => {
                            let catName = genre;
                            if (isNhentaiTags && nhentaiCategoryGroups) {
                                for (const group of Object.values(nhentaiCategoryGroups)) {
                                    const found = (group as any[]).find(c => c.slug === genre);
                                    if (found) { catName = found.name; break; }
                                }
                            } else {
                                catName = categories.find((c: any) => c.slug === genre)?.name || genre;
                            }

                            return (
                                <div key={genre} className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                    {catName}
                                    <button
                                        onClick={() => {
                                            const newGenres = selectedGenres.filter(g => g !== genre);
                                            if (newGenres.length > 0) {
                                                searchParams.set('genre', newGenres.join(','));
                                            } else {
                                                searchParams.delete('genre');
                                            }
                                            setSearchParams(searchParams, { replace: true });
                                        }}
                                        className="ml-1 hover:text-[var(--color-text)] transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                        
                        {isKkphim && (
                            <>
                                {kkphimType && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(`kkphim.type.${kkphimType.replace('-', '')}`)}
                                        <button onClick={() => updateKKPhimFilter('type', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimSortField && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(`kkphim.sort.${kkphimSortField === 'modified.time' ? 'update' : kkphimSortField === 'year' ? 'year' : 'new'}`)}
                                        <button onClick={() => updateKKPhimFilter('sort_field', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimCategory && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(`kkphim.category.${kkphimCategory}`) === `kkphim.category.${kkphimCategory}` ? KKPHIM_CATEGORIES.find(c => c.slug === kkphimCategory)?.name || kkphimCategory : t(`kkphim.category.${kkphimCategory}`)}
                                        <button onClick={() => updateKKPhimFilter('category', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimCountry && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(`kkphim.country.${kkphimCountry}`) === `kkphim.country.${kkphimCountry}` ? KKPHIM_COUNTRIES.find(c => c.slug === kkphimCountry)?.name || kkphimCountry : t(`kkphim.country.${kkphimCountry}`)}
                                        <button onClick={() => updateKKPhimFilter('country', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimYear && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {kkphimYear}
                                        <button onClick={() => updateKKPhimFilter('year', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {!isSearchEnabled && debouncedQuery.length <= 2 ? (
                    <div className="text-center p-10 text-[var(--color-text-muted)]">
                        {t('search.type_more')}
                    </div>
                ) : status === 'pending' ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
                    </div>
                ) : status === 'error' ? (
                    <div className="text-center p-10 text-red-500">{t('search.error')}</div>
                ) : items.length === 0 ? (
                    <div className="text-center p-10 text-[var(--color-text-muted)]">{t('search.no_results', { query: debouncedQuery })}</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 xs:gap-3 md:gap-4">
                        {items.map((item, idx) => (
                            isKkphim ? (
                                <KKPhimCard key={`${item._id || item.slug}-${idx}`} movie={item} sourceId={sourceId || 'kkphim'} />
                            ) : (
                                <div
                                    key={`${item._id || item.slug || item.id}-${idx}`}
                                    onClick={() => isMetruyenchu ? navigate(`/novel/metruyenchu/metruyenchu/${item.id}`) : navigate(`/comic/${sourceId || 'otruyen'}/${item.slug}`)}
                                    className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                                >
                                    <img
                                        src={(isNhentai || isNettruyen || isMetruyenchu) ? item.thumb_url : getImageUrl(item.thumb_url)}
                                        alt={item.name}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {isMetruyenchu ? (
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent p-2 pt-12 flex flex-col justify-end">
                                            {item.categories && item.categories.length > 0 && (
                                                <div className="mb-1 flex flex-wrap gap-1">
                                                    {item.categories.slice(0, 2).map((cat: string, i: number) => (
                                                        <span 
                                                            key={`${cat}-${i}`} 
                                                            className="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[8px] md:text-[10px] font-medium whitespace-nowrap z-10"
                                                        >
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                                                {item.chapters_count && (
                                                    <div className="w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[9px] md:text-[11px] text-[#8C8CFF] font-medium font-mono">
                                                        {item.chapters_count} chương
                                                    </div>
                                                )}
                                                {item.view_count && (
                                                    <div className="w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[9px] md:text-[11px] text-gray-300 font-medium font-mono flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                                        {item.view_count}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-[var(--color-text)] text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md relative z-20">
                                                {item.name}
                                            </h3>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent p-2 pt-12 flex flex-col justify-end">
                                            {item.category && item.category.length > 0 && (
                                                <div className="mb-1 flex flex-wrap gap-1">
                                                    {item.category.slice(0, 2).map((cat: any, i: number) => (
                                                        <span 
                                                            key={`${cat.slug || cat}-${i}`} 
                                                            className="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[8px] md:text-[10px] font-medium whitespace-nowrap z-10"
                                                        >
                                                            {cat.name || cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                                                {item.chaptersLatest && item.chaptersLatest.length > 0 && (
                                                    <div className="w-max px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/10 text-[9px] md:text-[11px] text-[#8C8CFF] font-medium font-mono">
                                                        Chương {item.chaptersLatest[0].chapter_name || item.chaptersLatest[0].filename}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-[var(--color-text)] text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md relative z-20">
                                                {item.name}
                                            </h3>
                                        </div>
                                    )}
                                </div>
                            )
                        ))}
                    </div>
                )}

                {hasNextPage && (
                    <div ref={ref} className="flex justify-center p-4 mt-2 h-20">
                        {isFetchingNextPage && <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />}
                    </div>
                )}
            </div>

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}>
                    <div
                        className="bg-[var(--color-surface)] w-full max-w-screen-md rounded-t-2xl overflow-hidden flex flex-col h-[70vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
                            <h2 className="text-[var(--color-text)] font-medium text-lg">{t('search.genres')}</h2>
                            <button onClick={() => setShowFilterModal(false)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 flex-1">
                            {!categoriesData ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
                                </div>
                            ) : (
                                <div className="flex flex-col h-full bg-[var(--color-surface)]">
                                    {isNhentaiTags && nhentaiCategoryGroups && (
                                        <div className="flex flex-col h-full">
                                            {/* Scrollable Horizontal Tabs */}
                                            <div className="flex overflow-x-auto gap-2 px-1 pb-2 border-b border-[var(--color-border)] no-scrollbar">
                                                {['tags', 'artists', 'characters', 'parodies', 'groups'].map((groupKey) => (
                                                    <button
                                                        key={groupKey}
                                                        onClick={() => {
                                                            setActiveNhentaiTab(groupKey);
                                                            setNhentaiTagQuery('');
                                                        }}
                                                        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeNhentaiTab === groupKey
                                                            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                                                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] hover:bg-[#3c3c3c]'
                                                            }`}
                                                    >
                                                        {t(`search.nhentai.${groupKey}`)}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Search Input for Active Tab */}
                                            <div className="mt-3 relative shrink-0">
                                                <input
                                                    type="text"
                                                    value={nhentaiTagQuery}
                                                    onChange={(e) => setNhentaiTagQuery(e.target.value)}
                                                    placeholder={`${t(`search.nhentai.${activeNhentaiTab}`)}...`}
                                                    className="w-full bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)] rounded-full px-4 py-2 pl-9 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                                                />
                                                <SearchIcon className="absolute left-3 top-2.5 text-[var(--color-text-muted)] w-4 h-4" />
                                            </div>

                                            {/* Tag Grid for Active Tab */}
                                            <div className="mt-4 flex-1 overflow-y-auto min-h-0 flex-wrap gap-2 flex content-start">
                                                {nhentaiCategoryGroups[activeNhentaiTab]
                                                    ?.filter((cat: any) =>
                                                        !nhentaiTagQuery || cat.name.toLowerCase().includes(nhentaiTagQuery.toLowerCase())
                                                    )
                                                    .map((cat: any) => {
                                                        const isSelected = selectedGenres.includes(cat.slug);
                                                        return (
                                                            <button
                                                                key={cat.slug}
                                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected
                                                                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                    : 'bg-[var(--color-bg)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                    }`}
                                                                onClick={() => {
                                                                    let newGenres = [...selectedGenres];
                                                                    if (isSelected) newGenres = newGenres.filter(g => g !== cat.slug);
                                                                    else newGenres.push(cat.slug);

                                                                    if (newGenres.length > 0) searchParams.set('genre', newGenres.join(','));
                                                                    else searchParams.delete('genre');
                                                                    setSearchParams(searchParams, { replace: true });
                                                                }}
                                                            >
                                                                {cat.name} <span className="text-xs opacity-50 ml-1">{cat.count}</span>
                                                            </button>
                                                        );
                                                    })}
                                                {nhentaiCategoryGroups[activeNhentaiTab]?.length > 0 && nhentaiCategoryGroups[activeNhentaiTab].filter((cat: any) =>
                                                    !nhentaiTagQuery || cat.name.toLowerCase().includes(nhentaiTagQuery.toLowerCase())
                                                ).length === 0 && (
                                                        <div className="text-sm text-[var(--color-text-muted)] p-2">
                                                            No matches found.
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {isKkphim && (
                                        <div className="flex flex-col gap-6">
                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.type')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_TYPES.map(tOption => (
                                                        <button
                                                            key={tOption.slug}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${kkphimType === tOption.slug
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }`}
                                                            onClick={() => updateKKPhimFilter('type', kkphimType === tOption.slug ? '' : tOption.slug)}
                                                        >
                                                            {t(`kkphim.type.${tOption.slug.replace('-', '')}`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.sort')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_SORT_FIELDS.map(sort => (
                                                        <button
                                                            key={sort.value}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${kkphimSortField === sort.value
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }`}
                                                            onClick={() => updateKKPhimFilter('sort_field', kkphimSortField === sort.value ? '' : sort.value)}
                                                        >
                                                            {t(`kkphim.sort.${sort.value === 'modified.time' ? 'update' : sort.value === 'year' ? 'year' : 'new'}`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('search.genres')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat.slug}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${kkphimCategory === cat.slug
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }`}
                                                            onClick={() => updateKKPhimFilter('category', kkphimCategory === cat.slug ? '' : cat.slug)}
                                                        >
                                                            {t(`kkphim.category.${cat.slug}`) === `kkphim.category.${cat.slug}` ? cat.name : t(`kkphim.category.${cat.slug}`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.country')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_COUNTRIES.map(country => (
                                                        <button
                                                            key={country.slug}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${kkphimCountry === country.slug
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }`}
                                                            onClick={() => updateKKPhimFilter('country', kkphimCountry === country.slug ? '' : country.slug)}
                                                        >
                                                            {t(`kkphim.country.${country.slug}`) === `kkphim.country.${country.slug}` ? country.name : t(`kkphim.country.${country.slug}`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.release_year')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_YEARS.map(y => (
                                                        <button
                                                            key={y}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${kkphimYear === y
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }`}
                                                            onClick={() => updateKKPhimFilter('year', kkphimYear === y ? '' : y)}
                                                        >
                                                            {y}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!isNhentaiTags && !isKkphim && (
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((cat: any) => {
                                                const isSelected = selectedGenres.includes(cat.slug);
                                                return (
                                                    <button
                                                        key={cat._id}
                                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isSelected
                                                            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                            }`}
                                                        onClick={() => {
                                                            let newGenres = [...selectedGenres];
                                                            if (isSelected) {
                                                                newGenres = newGenres.filter(g => g !== cat.slug);
                                                            } else {
                                                                if (isNettruyen || isMetruyenchu) {
                                                                    newGenres = [cat.slug];
                                                                } else {
                                                                    newGenres.push(cat.slug);
                                                                }
                                                            }

                                                            if (newGenres.length > 0) {
                                                                searchParams.set('genre', newGenres.join(','));
                                                            } else {
                                                                searchParams.delete('genre');
                                                            }
                                                            setSearchParams(searchParams, { replace: true });
                                                        }}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;
