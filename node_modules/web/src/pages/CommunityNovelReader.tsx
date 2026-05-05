import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Menu, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const TEXT_SIZES = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const BACKGROUNDS = [
    { id: 'dark', value: '#121212', text: '#e5e5e5' },
    { id: 'sepia', value: '#f4ecd8', text: '#433422' },
    { id: 'light', value: '#ffffff', text: '#111111' }
];

const CommunityNovelReader = () => {
    const { id, chapterId } = useParams();
    const navigate = useNavigate();
    const [showControls, setShowControls] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showToc, setShowToc] = useState(false);
    
    // Settings state
    const [fontFamily] = useState(() => localStorage.getItem('novel_font') || 'sans');
    const [textSizeIndex, setTextSizeIndex] = useState(() => parseInt(localStorage.getItem('novel_text_size') || '2'));
    const [theme, setTheme] = useState(() => localStorage.getItem('novel_theme') || 'dark');

    const contentRef = useRef<HTMLDivElement>(null);

    // Save settings
    useEffect(() => {
        localStorage.setItem('novel_font', fontFamily);
        localStorage.setItem('novel_text_size', textSizeIndex.toString());
        localStorage.setItem('novel_theme', theme);
    }, [fontFamily, textSizeIndex, theme]);

    // Fetch Novel Details (to get chapter list for TOC and Next/Prev)
    const { data: novelData } = useQuery({
        queryKey: ['communityNovel', id],
        queryFn: async () => {
            const res = await axios.get(`${import.meta.env.VITE_CLOUDFLARE_WORKERS}/api/community/novels/${id}`);
            return res.data?.data;
        }
    });

    // Fetch Chapter Content
    const { data: chapterData, isLoading } = useQuery({
        queryKey: ['communityChapter', id, chapterId],
        queryFn: async () => {
            const res = await axios.get(`${import.meta.env.VITE_CLOUDFLARE_WORKERS}/api/community/novels/${id}/chapters/${chapterId}`);
            return res.data?.data;
        }
    });

    const chapters = novelData?.chapters || [];
    const currentIndex = chapters.findIndex((c: any) => c.id === chapterId);
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
    const nextChapter = currentIndex !== -1 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

    const currentTheme = BACKGROUNDS.find(b => b.id === theme) || BACKGROUNDS[0];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [chapterId]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ backgroundColor: currentTheme.value }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentTheme.text }}></div>
            </div>
        );
    }

    if (!chapterData) {
        return (
            <div className="flex flex-col h-screen items-center justify-center p-4" style={{ backgroundColor: currentTheme.value, color: currentTheme.text }}>
                <div className="text-gray-500 mb-4">Không tìm thấy nội dung chương!</div>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Quay lại</button>
            </div>
        );
    }

    return (
        <div 
            className={`min-h-screen relative font-${fontFamily}`}
            style={{ backgroundColor: currentTheme.value, color: currentTheme.text }}
        >
            {/* Header Controls */}
            <div 
                className={`fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 transition-transform duration-300 shadow-md`}
                style={{ 
                    backgroundColor: currentTheme.value, 
                    transform: showControls ? 'translateY(0)' : 'translateY(-100%)',
                    boxShadow: theme === 'dark' ? '0 4px 6px -1px rgba(0, 0, 0, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full">
                    <ArrowLeft size={24} color={currentTheme.text} />
                </button>
                <div className="flex-1 truncate px-4 text-center font-bold text-sm" style={{ color: currentTheme.text }}>
                    {novelData?.name || 'Đọc truyện'}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowToc(true)} className="p-2 rounded-full">
                        <Menu size={24} color={currentTheme.text} />
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="p-2 -mr-2 rounded-full">
                        <Settings size={24} color={currentTheme.text} />
                    </button>
                </div>
            </div>

            {/* Click Area to toggle controls */}
            <div 
                className="absolute inset-0 z-10" 
                onClick={() => {
                    setShowControls(!showControls);
                    setShowSettings(false);
                }}
            />

            {/* Settings Panel */}
            {showSettings && showControls && (
                <div 
                    className="fixed top-14 left-0 right-0 p-4 z-40 border-b shadow-lg"
                    style={{ 
                        backgroundColor: currentTheme.value, 
                        borderColor: theme === 'dark' ? '#333' : '#e5e5e5',
                        color: currentTheme.text 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-4 max-w-screen-sm mx-auto">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Cỡ chữ</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setTextSizeIndex(Math.max(0, textSizeIndex - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10">-</button>
                                <span className="w-4 text-center">{textSizeIndex + 1}</span>
                                <button onClick={() => setTextSizeIndex(Math.min(TEXT_SIZES.length - 1, textSizeIndex + 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10">+</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Nền</span>
                            <div className="flex items-center gap-2">
                                {BACKGROUNDS.map(bg => (
                                    <button 
                                        key={bg.id}
                                        onClick={() => setTheme(bg.id)}
                                        className={`w-8 h-8 rounded-full border-2 ${theme === bg.id ? 'border-[var(--color-primary)]' : 'border-transparent'}`}
                                        style={{ backgroundColor: bg.value }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="relative z-20 max-w-screen-md mx-auto px-4 md:px-8 py-8 pt-20 pb-24 pointer-events-none">
                <div className="pointer-events-auto">
                    <h1 className="text-2xl md:text-3xl font-bold mb-8 leading-snug">Chương {chapterData.order_index}: {chapterData.name}</h1>
                    <div 
                        ref={contentRef}
                        className={`${TEXT_SIZES[textSizeIndex]} leading-[1.8] flex flex-col gap-4`}
                        dangerouslySetInnerHTML={{ __html: chapterData.content }}
                    />
                </div>
            </div>

            {/* Bottom Nav */}
            <div 
                className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-50 transition-transform duration-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
                style={{ 
                    backgroundColor: currentTheme.value, 
                    transform: showControls ? 'translateY(0)' : 'translateY(100%)',
                }}
            >
                <button 
                    onClick={() => prevChapter && navigate(`/community/novel/${id}/chapter/${prevChapter.id}`)}
                    disabled={!prevChapter}
                    className="flex items-center gap-1 px-4 py-2 rounded-full disabled:opacity-30"
                    style={{ color: currentTheme.text }}
                >
                    <ChevronLeft size={20} /> Trước
                </button>
                <div className="text-xs font-medium" style={{ color: currentTheme.text, opacity: 0.7 }}>
                    {currentIndex + 1} / {chapters.length}
                </div>
                <button 
                    onClick={() => nextChapter && navigate(`/community/novel/${id}/chapter/${nextChapter.id}`)}
                    disabled={!nextChapter}
                    className="flex items-center gap-1 px-4 py-2 rounded-full disabled:opacity-30"
                    style={{ color: currentTheme.text }}
                >
                    Sau <ChevronRight size={20} />
                </button>
            </div>

            {/* TOC Modal */}
            {showToc && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex justify-end" onClick={() => setShowToc(false)}>
                    <div 
                        className="w-4/5 max-w-sm h-full shadow-2xl flex flex-col"
                        style={{ backgroundColor: currentTheme.value, color: currentTheme.text }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b font-bold text-lg" style={{ borderColor: theme === 'dark' ? '#333' : '#e5e5e5' }}>
                            Danh sách chương
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {chapters.map((ch: any) => (
                                <button
                                    key={ch.id}
                                    onClick={() => {
                                        navigate(`/community/novel/${id}/chapter/${ch.id}`);
                                        setShowToc(false);
                                    }}
                                    className={`w-full text-left p-4 border-b transition-colors truncate ${ch.id === chapterId ? 'text-[var(--color-primary)] font-bold' : ''}`}
                                    style={{ borderColor: theme === 'dark' ? '#333' : '#e5e5e5' }}
                                >
                                    Chương {ch.order_index}: {ch.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityNovelReader;
