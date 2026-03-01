import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChapter } from '../services/otruyen';
import { fetchNhentaiChapter } from '../services/nhentai';
import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface ChapterViewProps {
    sourceId: string;
    slug: string;
    chapterId: string;
    chapterApiUrl: string;
    onPageIntersecting: (chapterId: string, page: number, total: number, ratio: number) => void;
    onEndReached: () => void;
    bgColor: string;
    customFilters: {
        brightness: number;
        grayscale: boolean;
        invert: boolean;
    };
    readingMode: string;
    activePage: number;
}

export const ChapterView = ({ sourceId, slug, chapterId, chapterApiUrl, onPageIntersecting, onEndReached, bgColor, customFilters, readingMode, activePage }: ChapterViewProps) => {
    const { data: chapterData, isLoading } = useQuery({
        queryKey: ['chapter', sourceId, slug, chapterApiUrl],
        queryFn: () => sourceId === 'nhentai' ? fetchNhentaiChapter(slug) : fetchChapter(chapterApiUrl),
        enabled: (sourceId === 'nhentai') ? !!slug : !!chapterApiUrl,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const images = chapterData?.data?.item?.chapter_image || [];
    const domainCdn = chapterData?.data?.domain_cdn || '';
    const chapterPath = chapterData?.data?.item?.chapter_path || '';
    const totalPages = images.length;

    useEffect(() => {
        if (!images.length || readingMode === 'Trang sách') return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const page = parseInt(entry.target.getAttribute('data-page') || '1');
                    onPageIntersecting(chapterId, page, totalPages, entry.intersectionRatio);
                });
            },
            { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
        );

        const pageElements = document.querySelectorAll(`.reader-page-${chapterId.replace(/[^a-zA-Z0-9-]/g, '-')}`);
        pageElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [images, chapterId, onPageIntersecting, totalPages, readingMode]);

    const { ref: endRef, inView: endInView } = useInView({ rootMargin: '1000px' });

    useEffect(() => {
        if (endInView && !isLoading) {
            onEndReached();
        }
    }, [endInView, onEndReached, isLoading]);

    if (isLoading) {
        return (
            <div className={`flex flex-col items-center justify-center p-20 ${bgColor === 'white' ? 'text-gray-900 bg-white' : bgColor === 'gray' ? 'text-gray-200 bg-[#1e1e1e]' : 'text-gray-500 bg-black'}`}>
                <Loader2 className="animate-spin text-[var(--color-primary)] mb-4" size={40} />
                <p>Loading Chapter {chapterId}...</p>
            </div>
        );
    }

    if (!images.length) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-red-500">
                Failed to load chapter images.
            </div>
        );
    }

    const filterStyle = `brightness(${customFilters.brightness / 100}) ${customFilters.grayscale ? 'grayscale(100%)' : ''} ${customFilters.invert ? 'invert(100%)' : ''}`.trim();

    const displayImages = readingMode === 'Trang sách'
        ? images.filter((_: any, idx: number) => idx === activePage - 1)
        : images;

    return (
        <div className={`flex flex-col w-full relative ${readingMode === 'Trang sách' ? 'h-full justify-center min-h-[80vh]' : 'pt-10'}`} id={`chapter-${chapterId}`}>
            {readingMode !== 'Trang sách' && (
                <div className="w-full text-center py-4 mb-4 text-sm font-semibold opacity-50 uppercase tracking-widest px-4">
                    Chapter {chapterId}
                </div>
            )}
            {displayImages.map((img: any, idx: number) => {
                const actualPage = readingMode === 'Trang sách' ? activePage : idx + 1;
                const imgSrc = (sourceId === 'nhentai' || sourceId === 'nettruyen') ? img.image_file : `${domainCdn}/${chapterPath}/${img.image_file}`;
                return (
                    <img
                        key={actualPage}
                        src={imgSrc}
                        alt={`Page ${img.image_page || actualPage}`}
                        data-page={actualPage}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className={`reader-page-${chapterId.replace(/[^a-zA-Z0-9-]/g, '-')} w-full h-auto object-contain block m-0 p-0 pointer-events-none`}
                        style={{ minHeight: '300px', filter: filterStyle, maxHeight: readingMode === 'Trang sách' ? '100vh' : 'auto' }}
                    />
                );
            })}
            <div ref={endRef} className="h-10 w-full" />
        </div>
    );
};
