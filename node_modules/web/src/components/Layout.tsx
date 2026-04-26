import { Outlet, NavLink } from 'react-router-dom';
import { Compass, Library, History as HistoryIcon, Settings, Download } from 'lucide-react';
import { useDownloadQueue } from '../contexts/DownloadContext';
import { useSettings } from '../contexts/SettingsContext';

const Layout = () => {
    const { queue } = useDownloadQueue();
    const { t } = useSettings();
    const activeDownloads = queue.filter(q => q.status === 'downloading' || q.status === 'pending').length;

    return (
        <div className="flex flex-col h-screen w-full bg-[var(--color-bg)] text-[var(--color-text)]">
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full max-w-screen-md mx-auto relative pb-16 page-transition">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full max-w-screen-md mx-auto left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-50">
                <div className="flex justify-around items-center h-16 px-1 lg:px-2 gap-1">
                    <NavItem to="/library" icon={<Library size={24} />} label={t('nav.library')} />
                    <NavItem to="/history" icon={<HistoryIcon size={24} />} label={t('nav.history')} />
                    <NavItem to="/home" icon={<Compass size={24} />} label={t('nav.home')} />
                    <NavItem to="/downloads" icon={<Download size={24} />} label={t('nav.downloads')} badge={activeDownloads > 0 ? activeDownloads : undefined} />
                    <NavItem to="/settings" icon={<Settings size={24} />} label={t('nav.settings')} />
                </div>
            </nav>
        </div>
    );
};

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}

const NavItem = ({ to, icon, label, badge }: NavItemProps) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }: { isActive: boolean }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`
            }
        >
            <div className="relative">
                {icon}
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-600 text-[var(--color-text)] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#1e1e1e]">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
    );
};

export default Layout;
