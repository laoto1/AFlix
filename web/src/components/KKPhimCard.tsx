import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as KKPhimService from '../services/kkphim';
import { useSettings } from '../contexts/SettingsContext';
import { getProxiedImageUrl } from '../utils/imageProxy';

interface KKPhimCardProps {
    movie: any;
    sourceId: string;
}

export const KKPhimCard: React.FC<KKPhimCardProps> = ({ movie: initialMovie, sourceId }) => {
    const { t } = useSettings();
    // If the movie lacks episode_current (e.g. from phim-moi-cap-nhat API), fetch full details
    const needsDetail = !initialMovie.episode_current;
    
    const { data } = useQuery({
        queryKey: ['movie-detail-mini', initialMovie.slug],
        queryFn: () => KKPhimService.fetchDetail(initialMovie.slug),
        enabled: needsDetail,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const movie = (needsDetail && data?.data?.movie) 
        ? { ...initialMovie, ...data.data.movie } 
        : initialMovie;

    const domain = 'https://phimimg.com'; // Ophim image CDN
    const rawThumb = movie.thumb_url || movie.poster_url;
    const thumbUrl = (rawThumb && rawThumb.startsWith('http')) ? rawThumb : `${domain}/${rawThumb}`;
    
    // For Search page, some categories might be in different format
    const categories = movie.category || movie.categories || [];
    const countries = movie.country || [];

    return (
        <Link
            to={`/movie/${sourceId}/${movie.slug}`}
            className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
        >
            <img
                src={getProxiedImageUrl(thumbUrl)}
                alt={movie.name}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
            />
            
            {/* Top badges (Quality, Lang) */}
            <div className="absolute top-1 right-1 flex flex-col gap-1 z-20 items-end">
                {movie.quality && (
                    <div className="px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-black text-[9px] font-bold uppercase shadow-sm">
                        {movie.quality}
                    </div>
                )}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#121212] via-[#121212]/90 to-transparent p-2 pt-12 flex flex-col justify-end z-10">
                {/* Tags: Country & Categories */}
                <div className="mb-1.5 flex flex-wrap gap-1.5 drop-shadow-md">
                    {countries[0] && (
                        <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/20 text-white text-[9px] md:text-[10px] font-medium whitespace-nowrap shadow-sm">
                            {countries[0].slug ? (t(`kkphim.country.${countries[0].slug}`) === `kkphim.country.${countries[0].slug}` ? countries[0].name : t(`kkphim.country.${countries[0].slug}`)) : countries[0].name}
                        </span>
                    )}
                    {categories.slice(0, 2).map((cat: any, i: number) => {
                        const catName = cat.slug ? (t(`kkphim.category.${cat.slug}`) === `kkphim.category.${cat.slug}` ? cat.name : t(`kkphim.category.${cat.slug}`)) : (cat.name || cat);
                        return (
                            <span 
                                key={`${catName}-${i}`} 
                                className="px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-black text-[9px] md:text-[10px] font-bold whitespace-nowrap shadow-sm"
                            >
                                {catName}
                            </span>
                        );
                    })}
                </div>

                {/* Episode Count & Lang & IMDB */}
                <div className="mb-1 flex items-center gap-1.5 flex-wrap drop-shadow-md">
                    {movie.episode_current && (
                        <div 
                            className="w-max px-1.5 py-0.5 rounded text-[10px] md:text-[12px] font-bold shadow-sm"
                            style={{ backgroundColor: '#E50914', color: '#ffffff' }}
                        >
                            {(() => {
                                const ep = movie.episode_current;
                                const fracMatch = ep.match(/(\d+\s*\/\s*\d+)/);
                                if (fracMatch) return fracMatch[1].replace(/\s/g, '');
                                if (ep.toLowerCase().includes('hoàn tất') && !ep.match(/\d/)) return 'Full';
                                return ep;
                            })()}
                        </div>
                    )}
                    {movie.lang && (
                        <div className="w-max px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/20 text-[10px] md:text-[12px] text-white font-bold shadow-sm">
                            {movie.lang}
                        </div>
                    )}
                    {(movie.tmdb?.vote_average || movie.imdb?.vote_average) ? (
                        <div 
                            className="w-max px-1.5 py-0.5 rounded text-[10px] md:text-[12px] font-extrabold font-mono flex items-center gap-0.5 shadow-md"
                            style={{ backgroundColor: '#F5C518', color: '#000000' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            {Number(movie.tmdb?.vote_average || movie.imdb?.vote_average).toFixed(1)}
                        </div>
                    ) : null}
                    
                    {movie.view !== undefined && (
                        <div className="w-max px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/20 text-[10px] md:text-[11px] text-white font-medium shadow-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            {movie.view > 1000 ? (movie.view/1000).toFixed(1) + 'k' : movie.view}
                        </div>
                    )}
                    
                    {movie.update_time && (
                        <div className="w-max px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/20 text-[9px] md:text-[10px] text-white/90 shadow-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {movie.update_time}
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-[var(--color-text)] text-xs md:text-sm font-medium line-clamp-2 drop-shadow-md">
                    {movie.name}
                </h3>
                {movie.author && (
                    <div className="text-[10px] text-[var(--color-text-muted)] line-clamp-1 mt-0.5">
                        👤 {movie.author}
                    </div>
                )}
            </div>
        </Link>
    );
};
