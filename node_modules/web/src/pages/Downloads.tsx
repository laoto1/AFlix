import { useDownloadQueue } from '../contexts/DownloadContext';
import { Play, Pause, Trash2, DownloadCloud, Image as ImageIcon, BookText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useState } from 'react';

const Downloads = () => {
    const { queue, resumeQueue, pauseQueue, removeDownload, clearAll, isDownloading, pauseItem, resumeItem } = useDownloadQueue();
    const navigate = useNavigate();
    const { t } = useSettings();
    const [activeTab, setActiveTab] = useState<'comic' | 'novel'>('comic');

    const filteredQueue = queue.filter(q => (q.type || 'comic') === activeTab);
    const pendingCount = filteredQueue.filter(q => q.status === 'pending').length;
    const activeOrPending = filteredQueue.filter(q => q.status === 'pending' || q.status === 'downloading');
    const completed = filteredQueue.filter(q => q.status === 'completed');

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)]">
            {/* App Bar / Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex items-center justify-between h-14 px-4 shadow-sm border-b border-[var(--color-border)]">
                <h1 className="text-xl font-medium text-[var(--color-text)] flex items-center gap-2">
                    <DownloadCloud size={20} className="text-[var(--color-primary)]" /> {t('nav.downloads')}
                </h1>

                <div className="flex items-center gap-2">
                    {queue.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="p-2 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-[var(--color-surface)] rounded-full transition-colors"
                            title={t('downloads.clear_all')}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}

                    {activeOrPending.length > 0 && (
                        <button
                            onClick={isDownloading ? pauseQueue : resumeQueue}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isDownloading
                                ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:bg-[#3c3c3c]'
                                : 'bg-[var(--color-primary)] text-[var(--color-text)] hover:bg-[#ea580c]'
                                }`}
                        >
                            {isDownloading ? (
                                <>
                                    <Pause size={16} /> {t('downloads.pause_all')}
                                </>
                            ) : (
                                <>
                                    <Play size={16} fill="currentColor" /> {t('downloads.resume', { count: pendingCount })}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)]">
                <button
                    onClick={() => setActiveTab('comic')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'comic' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    <ImageIcon size={18} /> Truyện tranh
                    {activeTab === 'comic' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('novel')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'novel' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                >
                    <BookText size={18} /> Tiểu thuyết
                    {activeTab === 'novel' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto">
                {filteredQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-[var(--color-text-muted)]">
                        <DownloadCloud size={48} className="mb-4 opacity-50" />
                        <p>{t('downloads.no_downloads')}</p>
                        <button
                            onClick={() => navigate('/home')}
                            className="mt-4 px-6 py-2 bg-[var(--color-surface-hover)] hover:bg-[#333333] text-[var(--color-text)] rounded-full text-sm font-medium transition-colors"
                        >
                            {t('library.browse')}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Active / Pending Section */}
                        {activeOrPending.length > 0 && (
                            <div>
                                <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">{t('downloads.queue')}</h2>
                                <div className="flex flex-col gap-3">
                                    {activeOrPending.map((item) => (
                                        <div key={item.id} className="bg-[var(--color-surface)] p-3 rounded-xl flex items-center gap-4">
                                            <div className="w-12 h-16 shrink-0 rounded bg-[var(--color-surface-hover)] overflow-hidden">
                                                {item.thumbUrl ? (
                                                    <img src={item.thumbUrl} alt={item.comicName} className="w-full h-full object-cover opacity-90" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {item.type === 'novel' ? <BookText size={20} className="text-[var(--color-text-muted)] opacity-50" /> : <ImageIcon size={20} className="text-[var(--color-text-muted)] opacity-50" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-[var(--color-text)] font-medium text-sm truncate">{item.comicName}</h3>
                                                <p className="text-[var(--color-text-muted)] text-xs">
                                                    {item.isSingleZip ? t('comic.download_all') : (item.chapters.length > 1 ? `${item.chapters.length} ${t('comic.chapters')}` : `Chapter ${item.chapters[0]?.chapterName}`)}
                                                </p>

                                                {/* Progress Bar Container */}
                                                <div className="w-full bg-[var(--color-surface-hover)] rounded-full h-1.5 mt-2 overflow-hidden relative">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${item.status === 'error' ? 'bg-red-500' : (item.status === 'downloading' ? 'bg-[var(--color-primary)]' : 'bg-[#424242]')}`}
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <p className={`text-[10px] ${item.status === 'error' ? 'text-red-500' : (item.status === 'downloading' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]')}`}>
                                                        {item.status === 'error' ? t('chapters.failed') : (item.status === 'downloading' ? t('chapters.downloading') : item.isPaused ? t('chapters.paused') : t('chapters.pending'))}
                                                    </p>
                                                    {item.status === 'downloading' && (
                                                        <p className="text-[10px] text-[var(--color-primary)] font-medium">{item.progress}%</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                {(item.status === 'downloading' || item.status === 'pending') && !item.isPaused && (
                                                    <button onClick={() => pauseItem(item.id)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors" aria-label="Pause">
                                                        <Pause size={18} />
                                                    </button>
                                                )}
                                                {((item.status === 'pending' || item.status === 'paused' || item.status === 'error') && (item.isPaused || item.status === 'error')) && (
                                                    <button onClick={() => resumeItem(item.id)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors" aria-label="Resume/Retry">
                                                        <Play size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeDownload(item.id)}
                                                    className="p-2 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                                                    aria-label="Remove download"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Section */}
                        {completed.length > 0 && (
                            <div className={activeOrPending.length > 0 ? "mt-4" : ""}>
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('downloads.completed')}</h2>
                                    <button
                                        onClick={() => completed.forEach(c => removeDownload(c.id))}
                                        className="text-xs text-[var(--color-primary)] hover:underline"
                                    >
                                        {t('downloads.clear_history')}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3 opacity-70">
                                    {completed.map((item) => (
                                        <div key={item.id} className="bg-[var(--color-surface)] p-3 rounded-lg flex items-center gap-3">
                                            <div className="w-10 h-10 shrink-0 rounded bg-[var(--color-surface-hover)] overflow-hidden">
                                                {item.thumbUrl ? (
                                                    <img src={item.thumbUrl} alt={item.comicName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {item.type === 'novel' ? <BookText size={16} className="text-[var(--color-text-muted)] opacity-50" /> : <ImageIcon size={16} className="text-[var(--color-text-muted)] opacity-50" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-[var(--color-text)] text-sm line-clamp-1">{item.comicName}</h3>
                                                <p className="text-[var(--color-text-muted)] text-xs">
                                                    {item.chapters.length > 1 ? `${item.chapters.length} ${t('comic.chapters')}` : `Chapter ${item.chapters[0]?.chapterName}`}
                                                </p>
                                            </div>
                                            <span className="text-[#4ade80] text-xs font-medium px-2 py-1 bg-[#4ade80]/10 rounded">{t('chapters.completed')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Downloads;
