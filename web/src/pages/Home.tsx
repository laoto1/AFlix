import { getProxiedImageUrl } from '../utils/imageProxy';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Bell } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';

const INITIAL_SOURCES = [
    {
        id: 'otruyen',
        name: 'Otruyen',
        url: 'https://otruyenapi.com',
        language: 'VI',
        icon: 'https://i.ibb.co/CKXyvH78/logo-otruyen-1.png',
    },
    {
        id: 'nettruyen',
        name: 'NetTruyen',
        url: 'https://nettruyenar.com',
        language: 'VI',
        icon: 'https://i.ibb.co/gZLv3XWH/nh.png',
    },
];

const SECRET_NHENTAI_SOURCE = {
    id: 'nhentai',
    name: 'nhentai',
    url: '/api/nhentai',
    language: 'EN/JP',
    icon: 'https://i.ibb.co/5hrScb4r/nh.png',
};

const NOVEL_SOURCES = [
    {
        id: 'sangtacviet',
        name: 'Sáng Tác Việt',
        url: 'https://sangtacviet.app',
        language: 'VI/CN',
        icon: '',
    },
];

const Home = () => {
    const [activeTab, setActiveTab] = useState<'manga' | 'novel' | 'movie'>('manga');
    const { t } = useSettings();
    const { unreadCount } = useNotifications();
    const [sources, setSources] = useState(INITIAL_SOURCES);

    // Check for unlock
    useState(() => {
        const isUnlocked = localStorage.getItem('nhentai_unlocked') === 'true';
        if (isUnlocked && !sources.find(s => s.id === 'nhentai')) {
            setSources([...INITIAL_SOURCES, SECRET_NHENTAI_SOURCE]);
        }
    });

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)]">
            {/* App Bar / Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex flex-col shadow-sm border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between h-14 px-4">
                    <h1 className="text-xl font-medium text-[var(--color-text)]">{t('home.browse')}</h1>
                    <Link to="/notifications" className="relative p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]">
                        <Bell size={24} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--color-bg)]"></span>
                        )}
                    </Link>
                </div>
                {/* Media Tabs */}
                <div className="flex px-4 gap-4">
                    {(['manga', 'novel', 'movie'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                        >
                            {t(`nav.${tab}`)}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <div className="p-4 flex-1">
                {activeTab === 'manga' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {sources.map((source) => (
                            <Link
                                key={source.id}
                                to={`/source/${source.id}`}
                                className="flex flex-col p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors shadow-md border border-transparent hover:border-[#424242]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center shrink-0 overflow-hidden relative">
                                        {source.icon ? (
                                            <img src={getProxiedImageUrl(source.icon)} alt={`${source.name} icon`} className="w-full h-full object-cover" />
                                        ) : (
                                            <Globe className="text-[var(--color-text-muted)]" size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm font-medium text-[var(--color-text)] truncate">{source.name}</h2>
                                        <p className="text-xs text-[var(--color-text-muted)]">{source.language}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] text-right text-[var(--color-primary)] font-medium mt-auto uppercase">
                                    {t('home.latest')}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : activeTab === 'novel' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {NOVEL_SOURCES.map((source) => (
                            <Link
                                key={source.id}
                                to={`/novel-source/${source.id}`}
                                className="flex flex-col p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors shadow-md border border-transparent hover:border-[#424242]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-[#333333] flex items-center justify-center shrink-0 overflow-hidden relative">
                                        {source.icon ? (
                                            <img src={getProxiedImageUrl(source.icon)} alt={`${source.name} icon`} className="w-full h-full object-cover" />
                                        ) : (
                                            <Globe className="text-[var(--color-text-muted)]" size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm font-medium text-[var(--color-text)] truncate">{source.name}</h2>
                                        <p className="text-xs text-[var(--color-text-muted)]">{source.language}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] text-right text-[var(--color-primary)] font-medium mt-auto uppercase">
                                    {t('home.latest')}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] min-h-[50vh]">
                        <p className="opacity-70">{t('home.coming_soon')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
