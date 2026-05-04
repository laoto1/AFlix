import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import { useInView } from 'react-intersection-observer';
import { 
    Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
    RotateCcw, RotateCw, Loader2, X, Lock, Unlock, SkipForward,
    Gauge, Subtitles, ListVideo, Sun, Lightbulb, Upload
} from 'lucide-react';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { useSettings } from '../contexts/SettingsContext';

interface NetflixPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    episodeName?: string;
    onBack?: () => void;
    onNext?: () => void;
    hasNext?: boolean;
    episodes?: any[];
    episodesList?: any[];
    selectedServer?: number;
    onSelectServer?: (idx: number) => void;
    currentEpisodeSlug?: string;
    onSelectEpisode?: (episode: any) => void;
    imdbId?: string;
    tmdbId?: string;
    tmdbType?: string;
    season?: number;
    episodeNumber?: number;
    movieOverview?: string;
    initialTime?: number;
    onTimeUpdate?: (time: number) => void;
}

const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    const h = Math.floor(timeInSeconds / 3600);
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
};

export const NetflixPlayer: React.FC<NetflixPlayerProps> = ({
 
    src, poster, title, episodeName, onBack, onNext, hasNext,
    episodes, episodesList, selectedServer, onSelectServer, currentEpisodeSlug, onSelectEpisode,
    imdbId, tmdbId, tmdbType, season, episodeNumber, movieOverview, initialTime, onTimeUpdate
}) => {
    const { t } = useSettings();
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showEpisodes, setShowEpisodes] = useState(false);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [brightness, setBrightness] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    
    // Animation & Feedback triggers
    const [playAnim, setPlayAnim] = useState(false);
    const [skipAnim, setSkipAnim] = useState<'forward' | 'backward' | null>(null);
    const [hudIndicator, setHudIndicator] = useState<{type: 'volume'|'brightness', val: number} | null>(null);

    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const playAnimTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSpeedLongPress = useRef(false);
    const speedPressTimer = useRef<NodeJS.Timeout | null>(null);
    const lastTimeRef = useRef(0);
    const lastEpisodeNameRef = useRef(episodeName);

    useEffect(() => {
        if (episodeName !== lastEpisodeNameRef.current) {
            lastTimeRef.current = 0;
            lastEpisodeNameRef.current = episodeName;
        }
    }, [episodeName]);

    const dragStart = useRef<{x: number, y: number, type: 'brightness'|'volume', startVal: number, active: boolean} | null>(null);
    const progressBarRef = useRef<HTMLInputElement>(null);

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [fullscreenAnim, setFullscreenAnim] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);
    const [theaterMode, setTheaterMode] = useState(false);
    
    // Speed menu state
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    // Subtitles state
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [customSubtitles, setCustomSubtitles] = useState<{label: string, url: string}[]>([]);
    const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1); // -1 = off
    const fileInputRef = useRef<HTMLInputElement>(null);

    const srt2vtt = (srt: string) => {
        let vtt = 'WEBVTT\n\n';
        const lines = srt.replace(/\r/g, '').split('\n');
        let isTimecode = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('-->')) {
                vtt += line.replace(/,/g, '.') + '\n';
                isTimecode = true;
            } else if (line === '') {
                vtt += '\n';
                isTimecode = false;
            } else if (isTimecode) {
                vtt += line + '\n';
            }
        }
        return vtt;
    };

    const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            let vttText = text;
            if (file.name.endsWith('.srt')) {
                vttText = srt2vtt(text);
            }
            const blob = new Blob([vttText], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);
            
            setCustomSubtitles(prev => {
                const newSubs = [...prev, { label: file.name, url }];
                setActiveSubtitleIndex(newSubs.length - 1);
                return newSubs;
            });
            setShowSubtitleMenu(false);
        };
        reader.readAsText(file);
        if (e.target) e.target.value = ''; // Reset input
    };

    useEffect(() => {
        if (!videoRef.current) return;
        const tracks = videoRef.current.textTracks;
        
        const activeLabel = activeSubtitleIndex >= 0 && activeSubtitleIndex < customSubtitles.length 
            ? customSubtitles[activeSubtitleIndex].label 
            : null;

        for (let i = 0; i < tracks.length; i++) {
            if (activeLabel && tracks[i].label === activeLabel) {
                tracks[i].mode = 'showing';
            } else {
                tracks[i].mode = 'hidden';
            }
        }
    }, [activeSubtitleIndex, customSubtitles]);

    // IntroDB State
    const [introData, setIntroData] = useState<{start_sec: number, end_sec: number, segment_type: string} | null>(null);
    const [tmdbSeasonData, setTmdbSeasonData] = useState<any[] | null>(null);

    const parseSec = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const parts = val.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return parseFloat(val);
        }
        return 0;
    };

    useEffect(() => {
        setIntroData(null);
        if (!imdbId) return;

        const fetchIntro = async () => {
            try {
                let actualImdbId = String(imdbId);

                // Resolve TMDB ID to IMDB ID if it doesn't start with 'tt'
                if (!actualImdbId.startsWith('tt')) {
                    const type = tmdbType === 'tv' ? 'tv' : 'movie';
                    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${imdbId}/external_ids?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb`);
                    if (tmdbRes.ok) {
                        const tmdbData = await tmdbRes.json();
                        if (tmdbData.imdb_id) {
                            actualImdbId = tmdbData.imdb_id;
                        } else {
                            return; // No IMDB ID available
                        }
                    } else {
                        return;
                    }
                }

                // Fetch from IntroDB using api.codetabs.com
                const introUrl = `https://api.introdb.app/segments?imdb_id=${actualImdbId}&season=${season || 1}&episode=${episodeNumber || 1}`;
                const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(introUrl)}`;
                const res = await fetch(proxyUrl);
                
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const introOrRecap = data.find((s: any) => s.segment_type === 'intro' || s.segment_type === 'recap');
                        if (introOrRecap) setIntroData(introOrRecap);
                    } else if (data && data.intro) {
                        setIntroData({ ...data.intro, segment_type: 'intro' });
                    } else if (data && data.recap) {
                        setIntroData({ ...data.recap, segment_type: 'recap' });
                    }
                }
            } catch (err) {
                console.log("IntroDB fetch error", err);
            }
        };
        fetchIntro();
    }, [imdbId, tmdbType, season, episodeNumber]);

    // Fetch TMDB Season Data for episodes list
    useEffect(() => {
        if (!tmdbId || tmdbType !== 'tv') return;

        const fetchTmdbSeason = async () => {
            try {
                const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season || 1}?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&language=vi`;
                // Direct fetch since user confirmed TMDB is not blocked for them
                const res = await fetch(tmdbUrl);
                
                if (res.ok) {
                    const seasonData = await res.json();
                    if (seasonData.episodes) {
                        setTmdbSeasonData(seasonData.episodes);
                    }
                }
            } catch (err) {
                console.log("TMDB season fetch error", err);
            }
        };
        fetchTmdbSeason();
    }, [tmdbId, tmdbType, season]);

    // Initialize HLS
    useEffect(() => {
        if (!videoRef.current || !src) return;
        
        // Episode transition animation
        setIsTransitioning(true);
        const t = setTimeout(() => setIsTransitioning(false), 500);

        const video = videoRef.current;
        setIsBuffering(true);

        let hls: Hls | null = null;

        if (Hls.isSupported()) {
            hls = new Hls({ maxMaxBufferLength: 30 });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (lastTimeRef.current > 0) {
                    video.currentTime = lastTimeRef.current;
                } else if (initialTime && initialTime > 0) {
                    video.currentTime = initialTime;
                    lastTimeRef.current = initialTime;
                }
                video.play().catch(() => console.log('Auto-play prevented'));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.addEventListener('loadedmetadata', () => {
                if (lastTimeRef.current > 0) {
                    video.currentTime = lastTimeRef.current;
                } else if (initialTime && initialTime > 0) {
                    video.currentTime = initialTime;
                    lastTimeRef.current = initialTime;
                }
                video.play().catch(() => console.log('Auto-play prevented'));
            }, { once: true });
        }

        return () => {
            if (videoRef.current && videoRef.current.currentTime > 0) {
                lastTimeRef.current = videoRef.current.currentTime;
            }
            if (hls) hls.destroy();
            clearTimeout(t);
        };
    }, [src]);

    // Handle idle controls hiding
    const handleMouseMove = useCallback(() => {
        if (isLocked) return;
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !isLocked && !showEpisodes) setShowControls(false);
        }, 3000);
    }, [isPlaying, isLocked, showEpisodes]);

    useEffect(() => {
        handleMouseMove();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [handleMouseMove]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isLocked) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowright':
                case 'l':
                    e.preventDefault();
                    skip(10);
                    break;
                case 'arrowleft':
                case 'j':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'arrowup':
                    e.preventDefault();
                    adjustVolume(0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    adjustVolume(-0.1);
                    break;
                case '>':
                    if (e.shiftKey) {
                        e.preventDefault();
                        changeSpeed();
                    }
                    break;
                case '<':
                    if (e.shiftKey) {
                        e.preventDefault();
                        changeSpeed();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isLocked, playbackSpeed, volume]);

    // Video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (onTimeUpdate && Math.abs(video.currentTime - lastTimeRef.current) > 1) {
                onTimeUpdate(video.currentTime);
                lastTimeRef.current = video.currentTime;
            }
        };
        const handleDurationChange = () => setDuration(video.duration);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
        };
    }, []);

    const togglePlay = () => {
        if (!videoRef.current) return;
        
        setPlayAnim(true);
        if (playAnimTimeoutRef.current) clearTimeout(playAnimTimeoutRef.current);
        playAnimTimeoutRef.current = setTimeout(() => setPlayAnim(false), 300);

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const showHud = (type: 'volume' | 'brightness', val: number) => {
        setHudIndicator({ type, val });
        if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        hudTimeoutRef.current = setTimeout(() => setHudIndicator(null), 1500);
    };

    const adjustVolume = (delta: number) => {
        if (!videoRef.current) return;
        let newVol = volume + delta;
        newVol = Math.max(0, Math.min(1, newVol));
        setVolume(newVol);
        videoRef.current.volume = newVol;
        setIsMuted(newVol === 0);
        showHud('volume', newVol);
        handleMouseMove();
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
            videoRef.current.muted = val === 0;
            setIsMuted(val === 0);
        }
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = val;
            setCurrentTime(val);
        }
    };

    const handleProgressMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
        if (!progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setHoverPos(x);
        setHoverTime(percentage * duration);
    };

    const handleProgressMouseLeave = () => {
        setHoverTime(null);
    };

    const skip = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
            setSkipAnim(seconds > 0 ? 'forward' : 'backward');
            if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
            skipTimeoutRef.current = setTimeout(() => setSkipAnim(null), 500);
            handleMouseMove();
        }
    };

    const changeSpeed = () => {
        if (!videoRef.current) return;
        const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        setPlaybackSpeed(speeds[nextIndex]);
        videoRef.current.playbackRate = speeds[nextIndex];
        handleMouseMove();
    };

    const handleSpeedPointerDown = () => {
        isSpeedLongPress.current = false;
        speedPressTimer.current = setTimeout(() => {
            isSpeedLongPress.current = true;
            setShowSpeedMenu(true);
        }, 400); // 400ms long press
    };

    const handleSpeedPointerUp = () => {
        if (speedPressTimer.current) clearTimeout(speedPressTimer.current);
        if (!isSpeedLongPress.current) {
            if (showSpeedMenu) setShowSpeedMenu(false);
            else changeSpeed();
        }
    };

    const handleSpeedPointerLeave = () => {
        if (speedPressTimer.current) clearTimeout(speedPressTimer.current);
    };

    const setDirectSpeed = (speed: number) => {
        setPlaybackSpeed(speed);
        if (videoRef.current) videoRef.current.playbackRate = speed;
        setShowSpeedMenu(false);
        handleMouseMove();
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        setFullscreenAnim(true);
        setTimeout(() => setFullscreenAnim(false), 500);

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Pointer Dragging for Brightness and Volume
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isLocked) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isLeft = x < rect.width / 2;
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            type: isLeft ? 'brightness' : 'volume',
            startVal: isLeft ? brightness : volume,
            active: false // Only activate if moved
        };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragStart.current || isLocked) return;
        
        if (e.pointerType === 'mouse' && e.buttons !== 1) {
            dragStart.current = null;
            return;
        }

        const deltaY = dragStart.current.y - e.clientY; 
        const deltaX = e.clientX - dragStart.current.x;
        
        // If moved more than 10px in either direction
        if (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10) {
            dragStart.current.active = true;
        }

        if (!dragStart.current.active) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // Determine whether horizontal or vertical drag is dominant
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        const deltaVal = isHorizontal 
            ? deltaX / (rect.width * 0.4)  // full horizontal drag is 40% width
            : deltaY / (rect.height * 0.7); // full vertical drag is 70% height
        
        if (dragStart.current.type === 'brightness') {
            let newB = dragStart.current.startVal + deltaVal;
            newB = Math.max(0.1, Math.min(1, newB));
            setBrightness(newB);
            showHud('brightness', newB);
        } else {
            let newV = dragStart.current.startVal + deltaVal;
            newV = Math.max(0, Math.min(1, newV));
            setVolume(newV);
            if (videoRef.current) {
                videoRef.current.volume = newV;
                videoRef.current.muted = newV === 0;
            }
            setIsMuted(newV === 0);
            showHud('volume', newV);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragStart.current) {
            const wasActive = dragStart.current.active;
            dragStart.current = null;
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {}
            
            // If it wasn't a drag, treat as a click
            if (!wasActive) {
                // If touching (mobile), toggle controls. If mouse (desktop), toggle play/pause
                if (e.pointerType === 'mouse' && !isLocked && !showSpeedMenu) {
                    togglePlay();
                } else {
                    setShowControls(prev => !prev);
                }
            }
        }
    };

    // Double tap for mobile seeking
    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isLocked) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        if (x < width / 3) {
            skip(-10);
        } else if (x > (2 * width) / 3) {
            skip(10);
        } else {
            toggleFullscreen();
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`w-full aspect-video bg-black group overflow-hidden font-sans select-none transition-all duration-700 ${theaterMode ? 'relative z-[9999] ring-2 ring-[#E50914]/30 shadow-[0_0_100px_rgba(0,0,0,1)] scale-[1.02]' : 'relative z-10'}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { if (isPlaying && !isLocked && !showEpisodes) setShowControls(false); }}
        >
            {/* Video Element */}
            <div 
                className="w-full h-full" 
                onDoubleClick={handleDoubleClick} 
                onPointerDown={handlePointerDown}
                onDragStart={(e) => e.preventDefault()}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }} // Prevent scrolling while dragging
            >
                <video 
                    ref={videoRef}
                    className={`w-full h-full object-contain pointer-events-none transition-transform duration-500 ease-out ${fullscreenAnim ? 'scale-105' : 'scale-100'}`}
                    poster={poster}
                    playsInline
                >
                    {customSubtitles.map((sub, idx) => (
                        <track 
                            key={idx}
                            kind="subtitles"
                            src={sub.url}
                            label={sub.label}
                            srcLang="vi"
                            default={activeSubtitleIndex === idx}
                        />
                    ))}
                </video>
            </div>

            {/* Transition Animation Overlay */}
            <div className={`absolute inset-0 bg-black pointer-events-none z-50 transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`} />

            {/* Brightness Overlay */}
            <div 
                className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-75 z-10"
                style={{ opacity: 1 - brightness }}
            />

            {/* HUD Indicator (Volume/Brightness Dragging) */}
            {hudIndicator && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white z-40 animate-in fade-in zoom-in duration-200">
                    {hudIndicator.type === 'volume' ? <Volume2 size={20} /> : <Sun size={20} />}
                    <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white transition-all duration-75" style={{ width: `${hudIndicator.val * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold w-8">{Math.round(hudIndicator.val * 100)}%</span>
                </div>
            )}

            {/* Removed standalone locked overlay */}

            {/* Buffering Spinner */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <Loader2 className="w-16 h-16 text-[#E50914] animate-spin" />
                </div>
            )}

            {/* Big Play/Pause Animation Feedback - REMOVED TO PREVENT OVERLAP */}

            {/* Center Skip Animations */}
            <div className="absolute inset-0 flex items-center justify-center gap-16 sm:gap-32 pointer-events-none z-30">
                <div className={`transition-all duration-300 ease-out ${skipAnim === 'backward' ? 'opacity-100 scale-125' : 'opacity-0 scale-50'}`}>
                    <div className="bg-black/40 rounded-full p-4 relative">
                        <RotateCcw size={48} color="white" />
                        <span className="absolute text-[10px] font-bold top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">10</span>
                    </div>
                </div>

                {/* Invisible spacer for the center */}
                <div className="w-20 h-20"></div>

                <div className={`transition-all duration-300 ease-out ${skipAnim === 'forward' ? 'opacity-100 scale-125' : 'opacity-0 scale-50'}`}>
                    <div className="bg-black/40 rounded-full p-4 relative">
                        <RotateCw size={48} color="white" />
                        <span className="absolute text-[10px] font-bold top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">10</span>
                    </div>
                </div>
            </div>

            {/* Skip Intro Button (Always visible when within time range, regardless of controls) */}
            {!isLocked && introData && (
                <button 
                    onClick={() => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = parseSec(introData.end_sec);
                            setCurrentTime(parseSec(introData.end_sec));
                        }
                    }}
                    className={`absolute bottom-24 sm:bottom-32 right-6 sm:right-12 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white font-bold rounded-lg shadow-2xl z-50 flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                        ${currentTime >= parseSec(introData.start_sec) && currentTime < parseSec(introData.end_sec) ? 'opacity-100 translate-x-0 pointer-events-auto scale-100' : 'opacity-0 translate-x-8 pointer-events-none scale-95'}
                    `}
                >
                    <SkipForward size={20} />
                    <span className="hidden sm:inline">Bỏ qua {introData.segment_type === 'recap' ? 'tóm tắt' : 'phần giới thiệu'}</span>
                    <span className="sm:hidden">Bỏ qua</span>
                </button>
            )}

            {/* Standard Controls Overlay */}
            <div 
                className={`absolute inset-0 bg-black/40 transition-opacity duration-500 z-40 pointer-events-none ${
                    showControls ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {/* Top Bar */}
                <div className={`absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between transition-all duration-300 ${isLocked ? 'bg-transparent pointer-events-none' : 'bg-gradient-to-b from-black/80 to-transparent pointer-events-auto'}`}>
                    <div className={`flex items-center gap-4 transition-opacity duration-300 ${isLocked ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="text-[#E50914] font-black text-2xl tracking-tighter mr-2">FLIX</div>
                        <div className="flex flex-col">
                            {title && <span className="text-white font-bold text-sm md:text-base drop-shadow-md truncate max-w-[200px] md:max-w-md">{title}</span>}
                            {episodeName && <span className="text-gray-300 text-xs md:text-sm drop-shadow-md">{episodeName}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-white pointer-events-auto">
                        {isLocked ? (
                            <button 
                                onClick={() => setIsLocked(false)} 
                                className="hover:text-gray-300 hover:scale-110 transition active:scale-95 animate-in fade-in zoom-in"
                            >
                                <Unlock size={24} className="text-white animate-pulse" />
                            </button>
                        ) : (
                            <button onClick={() => setIsLocked(true)} className="hover:text-gray-300 hover:scale-110 transition active:scale-95">
                                <Lock size={24} />
                            </button>
                        )}
                        {!isLocked && onBack && (
                            <button onClick={onBack} className="hover:text-gray-300 hover:scale-110 transition active:scale-95">
                                <X size={28} />
                            </button>
                        )}
                    </div>
                </div>

                {!isLocked && (
                <>
                {/* Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button 
                        onClick={togglePlay} 
                        className={`transition-all duration-300 pointer-events-auto drop-shadow-2xl ${
                            !isPlaying ? 'scale-100 text-white hover:scale-110 active:scale-95 opacity-100' : 
                            (playAnim ? 'scale-150 opacity-0 text-white' : 'scale-50 opacity-0 pointer-events-none')
                        }`}
                    >
                        {!isPlaying ? <Play size={64} sm:size={80} fill="currentColor" /> : <Pause size={64} sm:size={80} fill="currentColor" />}
                    </button>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-4 sm:pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-auto">
                    {/* Progress Bar */}
                    <div className="relative flex items-center gap-4 mb-4 group/progress cursor-pointer">
                        {hoverTime !== null && (
                            <div 
                                className="absolute bottom-full mb-3 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow-xl transition-all duration-150 ease-out animate-in fade-in zoom-in pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-white"
                                style={{ left: hoverPos, transform: 'translateX(-50%)' }}
                            >
                                {formatTime(hoverTime)}
                            </div>
                        )}
                        <input 
                            ref={progressBarRef}
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleProgressChange}
                            onMouseMove={handleProgressMouseMove}
                            onMouseLeave={handleProgressMouseLeave}
                            className="w-full h-1 sm:h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#E50914] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                            style={{
                                background: `linear-gradient(to right, #E50914 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`
                            }}
                        />
                        <span className="text-white text-xs sm:text-sm font-medium tabular-nums text-right whitespace-nowrap">
                            {formatTime(duration - currentTime)}
                        </span>
                    </div>

                    {/* Bottom Toolbar */}
                    <div className="flex items-center justify-between text-white">
                        
                        {/* Left Side: Volume & Speed (Desktop) */}
                        <div className="hidden sm:flex items-center gap-6">
                            {/* Play/Pause Button */}
                            <button onClick={togglePlay} className="hover:text-gray-300 hover:scale-110 transition-transform active:scale-95">
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                            </button>

                            {/* Volume */}
                            <div className="flex items-center gap-2 group/volume relative">
                                <button onClick={toggleMute} className="hover:text-gray-300 hover:scale-110 transition-transform active:scale-95">
                                    {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                </button>
                                <input 
                                    type="range" min="0" max="1" step="0.05"
                                    value={isMuted ? 0 : volume} onChange={handleVolumeChange}
                                    className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                    style={{ background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)` }}
                                />
                            </div>
                        </div>

                        {/* Center / Right Toolbar Items */}
                        <div className="flex items-center justify-center sm:justify-end gap-6 sm:gap-8 w-full sm:w-auto text-xs sm:text-sm font-medium">
                            <div className="relative">
                                {showSpeedMenu && (
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); }} />
                                )}
                                <button 
                                    onPointerDown={handleSpeedPointerDown}
                                    onPointerUp={handleSpeedPointerUp}
                                    onPointerLeave={handleSpeedPointerLeave}
                                    className={`relative z-50 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 transition-all active:scale-95 select-none ${showSpeedMenu ? 'text-[#E50914]' : 'hover:text-gray-300 hover:-translate-y-1'}`}
                                >
                                    <Gauge size={20} />
                                    <span>{t('player.speed')} ({playbackSpeed}x)</span>
                                </button>
                                
                                {/* Speed Menu Popup */}
                                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex flex-col-reverse bg-[#181818]/95 backdrop-blur-md rounded-xl p-2 gap-1 shadow-2xl border border-white/10 transition-all duration-300 ease-out origin-bottom z-50 ${showSpeedMenu ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-50 opacity-0 pointer-events-none'}`}>
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                                        <button 
                                            key={s}
                                            onClick={(e) => { e.stopPropagation(); setDirectSpeed(s); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${playbackSpeed === s ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'text-gray-300 hover:bg-white/20 hover:text-white'}`}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                    {/* Arrow pointing down */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#181818] rotate-45 border-r border-b border-white/10"></div>
                                </div>
                            </div>
                            
                            <div className="relative">
                                {showSubtitleMenu && (
                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowSubtitleMenu(false); }} />
                                )}
                                <button 
                                    onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                                    className={`relative z-50 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 transition-all active:scale-95 select-none ${showSubtitleMenu || activeSubtitleIndex >= 0 ? 'text-[#E50914]' : 'hover:text-gray-300 hover:-translate-y-1'}`}
                                >
                                    <Subtitles size={20} />
                                    <span>{t('player.subtitles')}</span>
                                </button>
                                
                                {/* Subtitle Menu Popup */}
                                <div className={`absolute bottom-full mb-2 right-0 sm:-right-4 flex flex-col bg-[#181818]/95 backdrop-blur-md rounded-xl p-2 gap-1 shadow-2xl border border-white/10 transition-all duration-300 ease-out origin-bottom-right z-50 min-w-[160px] max-w-[250px] ${showSubtitleMenu ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-50 opacity-0 pointer-events-none'}`}>
                                    <div className="px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider border-b border-white/10 mb-1">
                                        Phụ đề
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveSubtitleIndex(-1); setShowSubtitleMenu(false); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all text-left truncate ${activeSubtitleIndex === -1 ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'text-gray-300 hover:bg-white/20 hover:text-white'}`}
                                    >
                                        Tắt
                                    </button>
                                    {customSubtitles.map((sub, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={(e) => { e.stopPropagation(); setActiveSubtitleIndex(idx); setShowSubtitleMenu(false); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all text-left truncate ${activeSubtitleIndex === idx ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]' : 'text-gray-300 hover:bg-white/20 hover:text-white'}`}
                                            title={sub.label}
                                        >
                                            {sub.label}
                                        </button>
                                    ))}
                                    <div className="h-px bg-white/10 my-1"></div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all text-gray-300 hover:bg-white/20 hover:text-white whitespace-nowrap"
                                    >
                                        <Upload size={16} /> Tải lên (.srt, .vtt)
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        accept=".srt,.vtt" 
                                        className="hidden" 
                                        onChange={handleSubtitleUpload} 
                                    />
                                    {/* Arrow pointing down */}
                                    <div className="absolute -bottom-2 right-6 sm:right-10 w-4 h-4 bg-[#181818] rotate-45 border-r border-b border-white/10"></div>
                                </div>
                            </div>

                            {episodes && episodes.length > 0 && (
                                <button 
                                    onClick={() => setShowEpisodes(!showEpisodes)} 
                                    className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 transition-all active:scale-95 hover:-translate-y-1 ${showEpisodes ? 'text-[#E50914]' : 'hover:text-gray-300'}`}
                                >
                                    <ListVideo size={20} />
                                    <span>{t('player.episodes')}</span>
                                </button>
                            )}

                            {hasNext && onNext && (
                                <button onClick={() => { setIsTransitioning(true); onNext(); }} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:text-gray-300 hover:-translate-y-1 transition-all active:scale-95 text-white">
                                    <SkipForward size={20} fill="currentColor" />
                                    <span>{t('player.next_episode')}</span>
                                </button>
                            )}

                            <button onClick={() => setTheaterMode(!theaterMode)} className="hidden sm:flex hover:text-gray-300 transition-transform hover:scale-110 active:scale-95 ml-2 relative">
                                <Lightbulb size={24} className={`transition-colors ${theaterMode ? 'text-[#E50914]' : ''}`} />
                                {theaterMode && <div className="absolute inset-0 bg-[#E50914] blur-md opacity-50 rounded-full animate-pulse"></div>}
                            </button>

                            <button onClick={toggleFullscreen} className="hidden sm:flex hover:text-gray-300 transition-transform hover:scale-110 active:scale-95 ml-2">
                                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
                </>
                )}
            </div>

            {/* Theater Mode Overlay Portal */}
            {theaterMode && createPortal(
                <div className="fixed inset-0 bg-black/95 z-[9998] transition-opacity duration-700 animate-in fade-in" onClick={() => setTheaterMode(false)} />,
                document.body
            )}

            {/* Episodes Panel Wrapper with sliding animation */}
            <div 
                className={`absolute top-0 right-0 left-0 bottom-24 sm:bottom-28 z-[45] flex justify-end overflow-hidden pointer-events-none transition-all duration-500 ease-out ${showEpisodes ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Click outside overlay */}
                <div className={`absolute inset-0 pointer-events-auto ${showEpisodes ? 'block' : 'hidden'}`} onClick={() => setShowEpisodes(false)} />
                
                <div 
                    className={`w-full sm:w-[380px] md:w-[420px] h-full bg-[#181818]/95 backdrop-blur-2xl flex flex-col shadow-[-30px_0_50px_rgba(0,0,0,0.8)] border-l border-white/10 sm:rounded-bl-3xl transition-transform duration-500 ease-out pointer-events-auto ${showEpisodes ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/5 shrink-0 bg-gradient-to-b from-black/50 to-transparent">
                        <h3 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                            {t('movie.episode_list')}
                        </h3>
                        <button onClick={() => setShowEpisodes(false)} className="text-gray-400 hover:text-white transition-colors hover:rotate-90 duration-300 bg-white/5 hover:bg-white/10 p-2 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Server/Source Selection */}
                    {episodesList && episodesList.length > 0 && onSelectServer && selectedServer !== undefined && (
                        <div className="px-4 sm:px-6 py-4 border-b border-white/5 shrink-0 bg-black/20">
                            <h4 className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-wider">{t('player.source_language')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {episodesList.map((server: any, idx: number) => (
                                    <button 
                                        key={idx}
                                        onClick={() => onSelectServer(idx)} 
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedServer === idx ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.3)] ring-1 ring-[#E50914]' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5 hover:border-white/20'}`}
                                    >
                                        {server.server_name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4 sm:space-y-6 scroll-smooth">
                        {episodes?.map((ep, index) => {
                            return (
                                <EpisodeRow 
                                    key={ep.slug}
                                    ep={ep}
                                    index={index}
                                    title={title}
                                    poster={poster}
                                    currentEpisodeSlug={currentEpisodeSlug}
                                    onSelectEpisode={(ep: any) => {
                                        setIsTransitioning(true);
                                        onSelectEpisode?.(ep);
                                    }}
                                    setShowEpisodes={setShowEpisodes}
                                    showEpisodes={showEpisodes}
                                    tmdbEpisodeData={tmdbSeasonData?.find(e => e.episode_number === (ep.name.match(/\d+/) ? parseInt(ep.name.match(/\d+/)[0], 10) : index + 1))}
                                    movieOverview={movieOverview}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for scroll-reveal animation
const EpisodeRow = ({ ep, index, title, poster, currentEpisodeSlug, onSelectEpisode, setShowEpisodes, showEpisodes, tmdbEpisodeData }: any) => {
    const { t } = useSettings();
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: '50px 0px'
    });
    
    const isPlaying = ep.slug === currentEpisodeSlug;
    
    // Reset animation if panel is closed
    const [shouldAnimate, setShouldAnimate] = useState(false);
    useEffect(() => {
        if (showEpisodes && inView) {
            setShouldAnimate(true);
        } else if (!showEpisodes) {
            // Reset state when modal is closed to re-animate on next open
            setShouldAnimate(false);
        }
    }, [showEpisodes, inView]);

    const finalOverview = tmdbEpisodeData?.overview || null;

    return (
        <div 
            ref={ref}
            onClick={() => { 
                onSelectEpisode?.(ep); 
                setShowEpisodes(false); 
            }}
            className={`flex flex-col sm:flex-row gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-700 ease-out transform ${
                shouldAnimate ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
            } ${isPlaying ? 'bg-white/10 ring-1 ring-[#E50914]/50 shadow-[0_0_20px_rgba(229,9,20,0.1)]' : 'hover:bg-white/5 hover:scale-[1.02]'}`}
            style={{ transitionDelay: `${Math.min(index * 50, 500)}ms` }}
        >
            {/* Thumbnail */}
            <div className="relative shrink-0 w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black/50 shadow-lg group-hover:shadow-xl transition-shadow">
                <img 
                    src={tmdbEpisodeData?.still_path ? getProxiedImageUrl(`https://image.tmdb.org/t/p/w500${tmdbEpisodeData.still_path}`) : poster} 
                    alt={tmdbEpisodeData?.name || ep.name} 
                    className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'opacity-90 scale-105' : 'opacity-70 grayscale-[20%] group-hover:grayscale-0 group-hover:scale-110'}`} 
                />
                
                {/* Play Overlay & Selection Ring */}
                {isPlaying && (
                    <div className="absolute inset-0 ring-2 ring-inset ring-[#E50914] rounded-xl"></div>
                )}
                
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isPlaying ? (
                        <div className="w-10 h-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.4)] animate-pulse">
                            <Play size={20} className="ml-1" fill="currentColor" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-white text-white flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                            <Play size={20} className="ml-1" fill="currentColor" />
                        </div>
                    )}
                </div>
                
                {/* Đang Phát Badge overlaid on thumbnail */}
                {isPlaying && (
                    <div className="absolute top-2 right-2 bg-[#E50914] px-1.5 py-0.5 rounded-sm shadow-md animate-pulse">
                        <span className="text-[10px] font-bold text-white tracking-widest uppercase">{t('player.now_playing')}</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className={`font-bold text-sm sm:text-base md:text-lg line-clamp-2 mb-1 ${isPlaying ? 'text-[#E50914]' : 'text-gray-200 group-hover:text-white transition-colors duration-300'}`}>
                    {tmdbEpisodeData?.name && !tmdbEpisodeData.name.toLowerCase().match(/^(tập|episode) \d+$/) 
                        ? `${index + 1}. ${tmdbEpisodeData.name}` 
                        : `${index + 1}. ${title} - ${ep.name}`}
                </h4>
                {finalOverview && (
                    <p className="text-xs sm:text-sm text-gray-400 line-clamp-3 leading-relaxed">
                        {finalOverview}
                    </p>
                )}
                {tmdbEpisodeData?.runtime && (
                    <span className="text-xs text-gray-500 mt-2 font-medium">{tmdbEpisodeData.runtime} phút</span>
                )}
            </div>
        </div>
    );
};
