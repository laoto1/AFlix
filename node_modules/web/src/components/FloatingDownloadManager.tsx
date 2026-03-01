import { useState } from 'react';
import { useDownloadQueue } from '../contexts/DownloadContext';
import { useSettings } from '../contexts/SettingsContext';
import { DownloadCloud, Play, Pause, Trash2, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const FloatingDownloadManager = () => {
    const { queue, isDownloading, resumeQueue, pauseQueue, clearAll, pauseItem, resumeItem, removeDownload } = useDownloadQueue();
    const { t } = useSettings();
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter to active/pending or recently completed jobs
    const activeItems = queue.filter(q => q.status !== 'completed' && q.status !== 'error');
    const erroredItems = queue.filter(q => q.status === 'error');
    const hasDownloads = queue.length > 0;

    if (!hasDownloads) return null;

    const totalActive = activeItems.length;

    // Calculate overall progress across all active items
    const overallProgress = activeItems.length > 0
        ? Math.round(activeItems.reduce((acc, item) => acc + item.progress, 0) / activeItems.length)
        : queue.filter(q => q.status === 'completed').length > 0 ? 100 : 0;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            {/* Expanded List */}
            {isExpanded && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl mb-2 w-80 max-h-96 flex flex-col overflow-hidden pointer-events-auto transition-all animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center p-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                        <h3 className="text-[var(--color-text)] text-sm font-medium flex items-center gap-2">
                            <DownloadCloud size={16} className="text-[var(--color-primary)]" />
                            {t('downloads.queue')} ({queue.length})
                        </h3>
                        <div className="flex gap-2">
                            {isDownloading ? (
                                <button onClick={pauseQueue} className="text-[var(--color-text)] hover:text-[var(--color-text)] transition-colors" title="Dừng tất cả">
                                    <Pause size={16} />
                                </button>
                            ) : (
                                <button onClick={resumeQueue} className="text-[var(--color-text)] hover:text-[var(--color-text)] transition-colors" title="Tiếp tục tải">
                                    <Play size={16} />
                                </button>
                            )}
                            <button onClick={clearAll} className="text-red-400 hover:text-red-300 transition-colors" title="Xóa tất cả">
                                <Trash2 size={16} />
                            </button>
                            <button onClick={() => setIsExpanded(false)} className="text-[var(--color-text)] hover:text-[var(--color-text)] transition-colors">
                                <ChevronDown size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {queue.map((item) => (
                            <div key={item.id} className="bg-[#2a2a2a] p-3 rounded-lg flex flex-col border border-[#3c3c3c]">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-2">
                                        <h4 className="text-[var(--color-text)] text-sm font-medium line-clamp-1" title={item.comicName}>{item.comicName}</h4>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {item.isSingleZip ? t('comic.download_all') : `${item.chapters.length} ${t('comic.chapters')}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        {item.status === 'completed' && <CheckCircle2 size={16} className="text-green-500" />}
                                        {item.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                        {(item.status === 'downloading' || item.status === 'pending') && !item.isPaused && (
                                            <button onClick={() => pauseItem(item.id)} className="text-[var(--color-text)] hover:text-[var(--color-primary)]">
                                                <Pause size={14} />
                                            </button>
                                        )}
                                        {((item.status === 'pending' || item.status === 'paused') && item.isPaused) && (
                                            <button onClick={() => resumeItem(item.id)} className="text-[var(--color-text)] hover:text-[var(--color-primary)]">
                                                <Play size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => removeDownload(item.id)} className="text-[var(--color-text)] hover:text-red-400">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-[var(--color-surface)] rounded-full h-1.5 overflow-hidden relative">
                                    <div
                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${item.status === 'completed' ? 'bg-green-500' :
                                            item.status === 'error' ? 'bg-red-500' :
                                                'bg-[var(--color-primary)]'
                                            }`}
                                        style={{ width: `${item.progress}%` }}
                                    />
                                </div>
                                <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-muted)]">
                                    <span>
                                        {item.status === 'downloading' ? t('chapters.downloading')
                                            : item.status === 'paused' ? t('chapters.paused')
                                                : item.status === 'pending' ? t('chapters.pending')
                                                    : item.status === 'error' ? t('chapters.failed')
                                                        : t('chapters.completed')}
                                    </span>
                                    <span>{item.progress}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Bubble Summary */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="bg-[var(--color-surface-hover)] hover:bg-[#3c3c3c] border border-[#3c3c3c] rounded-full px-4 py-3 flex items-center gap-3 shadow-xl transition-all pointer-events-auto"
                >
                    <div className="relative">
                        <DownloadCloud size={20} className={isDownloading ? "text-[var(--color-primary)] animate-pulse" : "text-[var(--color-text)]"} />
                        {totalActive > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-[var(--color-text)] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                                {totalActive}
                            </span>
                        )}
                        {erroredItems.length > 0 && totalActive === 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-[var(--color-text)] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                                !
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-start min-w-[100px]">
                        <span className="text-[var(--color-text)] text-xs font-medium">
                            {isDownloading ? t('chapters.downloading') : t('chapters.paused')}
                        </span>
                        <div className="w-full bg-[var(--color-bg)] rounded-full h-1 mt-1 overflow-hidden">
                            <div
                                className="bg-[var(--color-primary)] h-full transition-all"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>
                    <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
                </button>
            )}
        </div>
    );
};
