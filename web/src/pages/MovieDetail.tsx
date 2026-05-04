import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, Info, Calendar, Clock, Star, Layers, Activity, Share2, Check } from 'lucide-react';
import axios from 'axios';
import * as KKPhimService from '../services/kkphim';
import * as ThePYService from '../services/thepy';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { NetflixPlayer } from '../components/NetflixPlayer';
import { useSettings } from '../contexts/SettingsContext';

export default function MovieDetail() {
    const { t } = useSettings();
    const { sourceId, slug } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [selectedServer, setSelectedServer] = useState<number>(0);
    const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
    const [isWatching, setIsWatching] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);
    const [initialTime, setInitialTime] = useState<number>(0);
    const currentTimeRef = useRef<number>(0);
    
    const playerRef = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    const { data: detailData, isLoading, error } = useQuery({
        queryKey: ['movie-detail', sourceId, slug],
        queryFn: () => {
            if (sourceId === 'thepy') return ThePYService.fetchDetail(slug!);
            if (sourceId === 'kkphim') return KKPhimService.fetchDetail(slug!);
            throw new Error('Unsupported source');
        },
        enabled: !!slug
    });

    const { data: historyRes } = useQuery({
        queryKey: ['history', slug],
        queryFn: async () => {
            const res = await axios.get(`/api/history?comicSlug=${slug}`);
            return res.data;
        },
        enabled: !!slug,
    });
    const historyData = historyRes;

    const continueWatchingInfo = historyData?.history?.[0];

    const handleWatchNow = () => {
        setIsWatching(true);
        if (!selectedEpisode && detailData?.data?.episodes?.length > 0) {
            const firstServer = detailData?.data?.episodes?.[0];
            if (firstServer?.server_data?.length > 0) {
                setSelectedServer(0);
                
                // If there is history, try to find the matching episode in the server data
                let targetEp = firstServer.server_data[0];
                const epQuery = searchParams.get('ep');
                
                if (epQuery) {
                    const match = firstServer.server_data.find((e: any) => e.slug === epQuery || e.name === epQuery);
                    if (match) targetEp = match;
                } else if (continueWatchingInfo) {
                    const match = firstServer.server_data.find((e: any) => e.slug === continueWatchingInfo.chapter_id || e.name === continueWatchingInfo.chapter_id);
                    if (match) {
                        targetEp = match;
                        setInitialTime(continueWatchingInfo.page_number || 0);
                    }
                }
                setSelectedEpisode(targetEp);
                if (!epQuery) {
                    setSearchParams({ ep: targetEp.slug }, { replace: true });
                }
            }
        }
        setTimeout(() => {
            playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleSelectServer = (serverIdx: number) => {
        setSelectedServer(serverIdx);
        // Sync selected episode with the new server's episodes
        const currentEpisodes = detailData?.data?.episodes;
        if (selectedEpisode && currentEpisodes && currentEpisodes[serverIdx]?.server_data) {
            const match = currentEpisodes[serverIdx].server_data.find(
                (e: any) => e.slug === selectedEpisode.slug || e.name === selectedEpisode.name
            );
            if (match) {
                setSelectedEpisode(match);
                setInitialTime(0);
                setSearchParams({ ep: match.slug }, { replace: true });
            } else {
                setSelectedEpisode(currentEpisodes[serverIdx].server_data[0]);
                setInitialTime(0);
                setSearchParams({ ep: currentEpisodes[serverIdx].server_data[0].slug }, { replace: true });
            }
        }
    };

    const handleSelectEpisode = (ep: any) => {
        setSelectedEpisode(ep);
        setInitialTime(0);
        currentTimeRef.current = 0;
        setSearchParams({ ep: ep.slug }, { replace: true });
    };

    const handleShare = () => {
        const epSlug = selectedEpisode?.slug || searchParams.get('ep');
        const shareUrl = `https://backend-worker.laoto.workers.dev/movie/${sourceId}/${slug}${epSlug ? `?ep=${epSlug}` : ''}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    // Sync episode from URL on initial load or URL change
    useEffect(() => {
        if (!detailData?.data?.episodes || detailData.data.episodes.length === 0) return;
        
        const epQuery = searchParams.get('ep');
        if (epQuery) {
            setIsWatching(true);
            const firstServer = detailData.data.episodes[0];
            if (firstServer?.server_data) {
                const match = firstServer.server_data.find((e: any) => e.slug === epQuery || e.name === epQuery);
                if (match && (!selectedEpisode || selectedEpisode.slug !== match.slug)) {
                    setSelectedEpisode(match);
                    setTimeout(() => {
                        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            }
        }
    }, [detailData, searchParams.get('ep')]);

    // Intelligent History Tracking
    useEffect(() => {
        if (!selectedEpisode || !detailData?.data?.movie || !sourceId || !slug || !isWatching) return;

        const saveHistory = () => {
            if (currentTimeRef.current <= 0) return; // Don't save if haven't watched anything yet
            const movie = detailData.data.movie;
            const domain = 'https://phimimg.com';
            const posterUrl = movie.thumb_url?.startsWith('http') ? movie.thumb_url : `${domain}/${movie.thumb_url}`;
            
            // Use axios, it will auto-attach token via interceptor
            axios.post('/api/history', {
                sourceId,
                comicSlug: slug,
                comicName: movie.name,
                chapterId: selectedEpisode.slug || selectedEpisode.name,
                pageNumber: Math.floor(currentTimeRef.current),
                totalPages: 1,
                thumbUrl: posterUrl
            }).catch(console.error);
        };
        
        // Save initially when episode loads
        saveHistory();

        // Save when user switches tabs or minimizes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') saveHistory();
        };

        // Save when user closes the tab
        const handleBeforeUnload = () => {
            saveHistory();
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            saveHistory(); // Save on unmount (navigation)
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [selectedEpisode, detailData, sourceId, slug, isWatching]);

    // SEO & OpenGraph Update
    useEffect(() => {
        if (!detailData?.data?.movie) return;

        const movie = detailData.data.movie;
        const domain = 'https://phimimg.com';
        const posterUrl = movie.poster_url?.startsWith('http') ? movie.poster_url : `${domain}/${movie.poster_url}`;
        const finalPosterUrl = getProxiedImageUrl(posterUrl);
        
        const url = window.location.href;
        let pageTitle = movie.name;
        if (movie.origin_name && movie.origin_name !== movie.name) {
            pageTitle += ` (${movie.origin_name})`;
        }
        if (isWatching && selectedEpisode) {
            pageTitle = `Đang xem ${selectedEpisode.name} - ${pageTitle}`;
        }
        
        let description = movie.content?.replace(/<[^>]*>?/gm, '').substring(0, 200) || '';
        if (description.length === 200) description += '...';

        document.title = pageTitle;

        const setMeta = (name: string, content: string, property = false) => {
            const attr = property ? 'property' : 'name';
            let meta = document.head.querySelector(`meta[${attr}="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(attr, name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        setMeta('description', description);
        setMeta('og:title', pageTitle, true);
        setMeta('og:description', description, true);
        setMeta('og:image', finalPosterUrl, true);
        setMeta('og:url', url, true);
        setMeta('og:type', 'video.movie', true);
        
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', pageTitle);
        setMeta('twitter:description', description);
        setMeta('twitter:image', finalPosterUrl);

        return () => {
            document.title = 'FLIX';
        };
    }, [detailData, isWatching, selectedEpisode]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212]">
            <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    if (error || !detailData?.data?.movie) return <div className="p-10 text-center text-red-500">Error loading movie.</div>;

    const movie = detailData.data.movie;
    const episodes = detailData.data.episodes || [];
    
    const domain = 'https://phimimg.com';
    const posterUrl = movie.poster_url?.startsWith('http') ? movie.poster_url : `${domain}/${movie.poster_url}`;

    // Convert youtube watch URL to embed URL
    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'youtube.com/embed/');
        }
        return url;
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white pb-20">
            {/* Navigation Bar */}
            <div className="fixed top-0 inset-x-0 h-14 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center px-4">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 transition"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Full-width Hero Section */}
            <div className="w-full relative h-[60vh] md:h-[80vh]">
                <div className="absolute inset-0">
                    <img 
                        src={getProxiedImageUrl(posterUrl)} 
                        alt="Poster" 
                        className="w-full h-full object-cover"
                    />
                    {/* Gradients to blend with background and text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 md:via-[#0f0f0f]/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f]/90 via-[#0f0f0f]/60 to-transparent hidden md:block"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-4 md:p-12 z-10 flex flex-col justify-end h-full">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="md:w-2/3">
                            <h1 className="text-4xl md:text-6xl font-extrabold mb-2 drop-shadow-lg leading-tight text-white">{movie.origin_name && t('nav.home') !== 'Trang chủ' ? movie.origin_name : movie.name}</h1>
                            <h2 className="text-lg md:text-xl text-gray-300 font-medium mb-6 drop-shadow-md">{movie.origin_name && t('nav.home') !== 'Trang chủ' ? movie.name : movie.origin_name}</h2>
                            
                            <div className="flex flex-wrap items-center gap-3 mb-8">
                                {movie.quality && <span className="px-2.5 py-1 bg-[var(--color-primary)] text-black text-xs md:text-sm font-bold rounded-md shadow-sm">{movie.quality}</span>}
                                {movie.lang && <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs md:text-sm font-bold rounded-md shadow-sm">{movie.lang}</span>}
                                {(movie.tmdb?.vote_average || movie.imdb?.vote_average) && (
                                    <span className="px-2.5 py-1 bg-[#F5C518] text-black text-xs md:text-sm font-bold flex items-center gap-1 rounded-md shadow-sm">
                                        <Star size={14} fill="currentColor" />
                                        {Number(movie.tmdb?.vote_average || movie.imdb?.vote_average).toFixed(1)}
                                    </span>
                                )}
                                <span className="text-gray-300 text-sm md:text-base font-medium flex items-center gap-1"><Calendar size={16} /> {movie.year}</span>
                                {movie.time && <span className="text-gray-300 text-sm md:text-base font-medium flex items-center gap-1"><Clock size={16} /> {movie.time}</span>}
                                <span className="text-[var(--color-primary)] text-sm md:text-base font-bold flex items-center gap-1"><Layers size={16} /> {movie.episode_current}</span>
                            </div>

                            {!isWatching && (
                                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                    <button 
                                        onClick={handleWatchNow}
                                        className="flex items-center justify-center gap-2 px-8 py-3 md:py-4 rounded-full bg-[var(--color-primary)] text-black text-lg font-bold hover:scale-105 transition shadow-lg shadow-[var(--color-primary)]/30"
                                    >
                                        <Play size={24} fill="currentColor" /> {continueWatchingInfo ? `Xem tiếp ${continueWatchingInfo.chapter_id.replace(/^tap-/i, 'Tập ')}` : t('movie.watch_now')}
                                    </button>
                                    {movie.trailer_url && (
                                        <button 
                                            onClick={() => setShowTrailer(true)}
                                            className="flex items-center justify-center gap-2 px-8 py-3 md:py-4 rounded-full bg-white/20 backdrop-blur-md text-white text-lg font-bold hover:bg-white/30 transition shadow-lg border border-white/10"
                                        >
                                            <Play size={24} /> {t('movie.watch_trailer')}
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleShare}
                                        className="flex items-center justify-center gap-2 px-6 py-3 md:py-4 rounded-full bg-white/10 backdrop-blur-md text-white text-lg font-bold hover:bg-white/20 transition shadow-lg border border-white/10"
                                    >
                                        {isCopied ? <Check size={24} className="text-green-400" /> : <Share2 size={24} />} {isCopied ? 'Đã Copy' : 'Chia sẻ'}
                                    </button>
                                </div>
                            )}
                            
                            {isWatching && (
                                <div className="flex mb-6">
                                    <button 
                                        onClick={handleShare}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white font-bold hover:bg-white/20 transition border border-white/10"
                                    >
                                        {isCopied ? <Check size={20} className="text-green-400" /> : <Share2 size={20} />} {isCopied ? 'Đã Copy Link Chia Sẻ' : 'Copy Link Discord'}
                                    </button>
                                </div>
                            )}
                            
                            {/* Short Synopsis on Desktop */}
                            <div 
                                className="hidden md:block text-base text-gray-200 leading-relaxed max-w-3xl line-clamp-4 drop-shadow-md font-medium"
                                dangerouslySetInnerHTML={{ __html: movie.content }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Below Hero: Extra Info for Mobile, and Categories */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 mt-6 space-y-6 relative z-20">
                {/* On mobile, show the full synopsis here */}
                <div className="md:hidden space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Info size={16} /> {t('movie.synopsis')}
                    </h3>
                    <div 
                        className="text-sm text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: movie.content }}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {movie.category?.map((c: any) => (
                        <span key={c.id || c.slug || c.name} className="text-sm px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                            {c.slug ? (t(`kkphim.category.${c.slug}`) === `kkphim.category.${c.slug}` ? c.name : t(`kkphim.category.${c.slug}`)) : c.name}
                        </span>
                    ))}
                    {movie.country?.map((c: any) => (
                        <span key={c.id || c.slug || c.name} className="text-sm px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                            {c.slug ? (t(`kkphim.country.${c.slug}`) === `kkphim.country.${c.slug}` ? c.name : t(`kkphim.country.${c.slug}`)) : c.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Player & Episodes Section (Only visible when watching) */}
            {isWatching && (
                <div ref={playerRef} className="max-w-6xl mx-auto px-4 md:px-8 mt-10">
                    
                    {/* The Player */}
                    <div className="w-full aspect-video bg-black relative shadow-2xl rounded-xl overflow-hidden mb-8 border border-white/10 group/player">
                        {selectedEpisode && (
                            <NetflixPlayer 
                                src={selectedEpisode.link_m3u8}
                                poster={getProxiedImageUrl(posterUrl)}
                                title={movie.name}
                                episodeName={selectedEpisode.name}
                                hasNext={episodes[selectedServer]?.server_data?.findIndex((e: any) => e.slug === selectedEpisode.slug) < episodes[selectedServer]?.server_data?.length - 1}
                                onNext={() => {
                                    const currentIdx = episodes[selectedServer].server_data.findIndex((e: any) => e.slug === selectedEpisode.slug);
                                    if (currentIdx < episodes[selectedServer].server_data.length - 1) {
                                        handleSelectEpisode(episodes[selectedServer].server_data[currentIdx + 1]);
                                    }
                                }}
                                episodesList={episodes}
                                selectedServer={selectedServer}
                                onSelectServer={handleSelectServer}
                                episodes={episodes[selectedServer]?.server_data}
                                currentEpisodeSlug={selectedEpisode.slug}
                                onSelectEpisode={handleSelectEpisode}
                                imdbId={movie.imdb?.id || movie.tmdb?.id || ''}
                                tmdbId={movie.tmdb?.id || ''}
                                tmdbType={movie.tmdb?.type || 'movie'}
                                season={movie.origin_name?.match(/Season (\d+)/i) ? parseInt(movie.origin_name.match(/Season (\d+)/i)[1], 10) : movie.name?.match(/Phần (\d+)/i) ? parseInt(movie.name.match(/Phần (\d+)/i)[1], 10) : 1}
                                episodeNumber={selectedEpisode.name.match(/\d+/) ? parseInt(selectedEpisode.name.match(/\d+/)[0], 10) : 1}
                                movieOverview={movie.content}
                                initialTime={initialTime}
                                onTimeUpdate={(time) => { currentTimeRef.current = time; }}
                            />
                        )}
                    </div>

                    {episodes.length > 0 && (
                        <div className="bg-[#1a1a1a] p-4 md:p-6 rounded-2xl border border-white/5 shadow-inner">
                            <div className="flex items-center gap-2 mb-6">
                                <Activity className="text-[var(--color-primary)]" size={24} />
                                <h2 className="text-2xl font-bold">{t('movie.episode_list')}</h2>
                            </div>

                            {episodes.length > 1 && (
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                    {episodes.map((server: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectServer(idx)}
                                            className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                                                selectedServer === idx 
                                                ? 'bg-[var(--color-primary)] text-black' 
                                                : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            {server.server_name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {episodes[selectedServer]?.server_data?.map((ep: any) => {
                                    const isPlaying = selectedEpisode?.slug === ep.slug;
                                    return (
                                        <button
                                            key={ep.slug}
                                            onClick={() => {
                                                handleSelectEpisode(ep);
                                                playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }}
                                            className={`relative p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all overflow-hidden group ${
                                                isPlaying 
                                                ? 'bg-[var(--color-primary)] text-black font-bold ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[#1a1a1a]' 
                                                : 'bg-black/40 hover:bg-white/10 text-gray-300 border border-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="text-sm truncate w-full text-center">{ep.name}</span>
                                            {isPlaying && (
                                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-black animate-ping"></div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Trailer Modal */}
            {showTrailer && movie.trailer_url && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
                        <button 
                            onClick={() => setShowTrailer(false)}
                            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-[var(--color-primary)] hover:text-black rounded-full flex items-center justify-center z-10 transition-colors text-white"
                        >
                            ✕
                        </button>
                        <div className="w-full aspect-video">
                            <iframe 
                                src={getEmbedUrl(movie.trailer_url)} 
                                className="w-full h-full"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
