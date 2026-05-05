import React, { useState, useEffect } from 'react';
import { Download, X, ListPlus } from 'lucide-react';
import { useDownloadQueue } from '../contexts/DownloadContext';
import toast from 'react-hot-toast';

interface NovelDownloaderProps {
    isOpen: boolean;
    onClose: () => void;
    novelName: string;
    sourceId: string;
    host: string;
    bookId: string;
    chapters: any[];
}

export const NovelDownloader: React.FC<NovelDownloaderProps> = ({ isOpen, onClose, novelName, sourceId, host, bookId, chapters }) => {
    const { addDownloads } = useDownloadQueue();
    const [startChap, setStartChap] = useState<number>(1);
    const [endChap, setEndChap] = useState<number>(100);

    useEffect(() => {
        if (isOpen && chapters) {
            setStartChap(1);
            setEndChap(Math.min(100, chapters.length));
        }
    }, [isOpen, chapters]);

    if (!isOpen) return null;

    const handleAddToQueue = () => {
        if (startChap < 1 || endChap > chapters.length || startChap > endChap) {
            toast.error('Khoảng chương không hợp lệ');
            return;
        }

        const targetChapters = chapters.slice(startChap - 1, endChap);
        const mappedChapters = targetChapters.map((c, idx) => ({
            chapterName: c.name || `Chương ${startChap + idx}`,
            chapterId: c.id || c._id,
            chapterApiData: sourceId === 'metruyenchu' ? undefined : (c.filename || c.id || c.chapter_api_data)
        }));

        addDownloads(
            {
                comicName: `${novelName} [${startChap}-${endChap}]`,
                sourceId,
                comicSlug: bookId,
                thumbUrl: '', // Novel downloader doesn't pass thumbUrl, we could but it's optional
                type: 'novel',
                host,
                bookId
            },
            mappedChapters
        );

        // Show success alert and close
        toast.success(`Đã thêm vào hàng đợi tải (${mappedChapters.length} chương). Vui lòng vào mục Tải Xuống để kiểm tra.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
                
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Download className="text-[var(--color-primary)]" /> Tải Truyện (TXT)
                </h2>

                <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        Chọn khoảng chương bạn muốn tải. Hiện tại có <strong>{chapters?.length || 0}</strong> chương.
                        Có thể xếp hàng đợi nhiều lần để tải các khoảng chương khác nhau.
                    </p>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Từ chương</label>
                            <input 
                                type="number" 
                                min={1} 
                                max={chapters?.length || 1} 
                                value={startChap} 
                                onChange={e => setStartChap(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                            />
                        </div>
                        <div className="text-gray-500 mt-5">-</div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Đến chương</label>
                            <input 
                                type="number" 
                                min={1} 
                                max={chapters?.length || 1} 
                                value={endChap} 
                                onChange={e => setEndChap(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleAddToQueue}
                        className="w-full mt-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                    >
                        <ListPlus size={20} /> Thêm Vào Hàng Đợi
                    </button>
                </div>
            </div>
        </div>
    );
};
