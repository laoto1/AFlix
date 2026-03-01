import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, type Theme, type AccentColor, type Language } from '../contexts/SettingsContext';
import { Settings as SettingsIcon, LogOut, Code, User, ChevronRight, Moon, Palette, Globe, Check, Link } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Settings = () => {
    const { user, logout } = useAuth();
    const { theme, setTheme, accentColor, setAccentColor, language, setLanguage, t } = useSettings();
    const navigate = useNavigate();

    const [languageExpanded, setLanguageExpanded] = useState(false);
    const [themeExpanded, setThemeExpanded] = useState(false);
    const [accentExpanded, setAccentExpanded] = useState(false);
    const [secretKey, setSecretKey] = useState('');
    const [showSecretInput, setShowSecretInput] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleEditProfile = () => {
        navigate('/settings/profile');
    };

    const handleUnlock = async () => {
        try {
            const res = await axios.post('/api/unlock', { key: secretKey });
            if (res.data.success) {
                localStorage.setItem('nhentai_unlocked', 'true');
                toast.success(t('settings.unlock.success'));
                setShowSecretInput(false);
                setSecretKey('');
                setTimeout(() => window.location.reload(), 800);
            }
        } catch {
            toast.error(t('settings.unlock.fail'));
        }
    };

    const themes: { id: Theme; label: string }[] = [
        { id: 'dark', label: t('settings.theme.dark') },
        { id: 'light', label: t('settings.theme.light') }
    ];

    const accentColors: AccentColor[] = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

    const languages: { id: Language; label: string }[] = [
        { id: 'vi', label: 'Tiếng Việt' },
        { id: 'en', label: 'English' },
        { id: 'zh', label: '中文' },
        { id: 'ja', label: '日本語' }
    ];

    return (
        <div className="flex flex-col min-h-full bg-[var(--color-bg)]">
            {/* App Bar / Header */}
            <header className="sticky top-0 z-40 w-full bg-[var(--color-bg)] flex items-center h-14 px-4 shadow-sm border-b border-[var(--color-border)]">
                <h1 className="text-xl font-medium text-[var(--color-text)] flex items-center gap-2">
                    <SettingsIcon size={20} className="text-[var(--color-primary)]" /> {t('nav.settings')}
                </h1>
            </header>

            {/* Content */}
            <div className="p-4 space-y-6">

                {/* Account Section */}
                <section>
                    <h2 className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-2 px-2">{t('settings.account')}</h2>
                    <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)] relative">
                        {user?.cover_url && (
                            <div className="absolute inset-x-0 top-0 h-24 z-0">
                                <img src={user.cover_url} alt="Cover" className="w-full h-full object-cover opacity-40" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
                            </div>
                        )}
                        <div className="relative z-10 flex items-center gap-4 p-4 border-b border-[var(--color-border)]">
                            <div className="relative w-16 h-16 shrink-0">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-[var(--color-surface-hover)] shadow-sm" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-pink-500 flex items-center justify-center text-[var(--color-text)] text-2xl font-bold shadow-lg">
                                        {user?.display_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                                {user?.avatar_frame_url && (
                                    <img src={user.avatar_frame_url} alt="Frame" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] object-contain pointer-events-none drop-shadow-md max-w-none" />
                                )}
                            </div>
                            <div className="flex-col flex-1">
                                <h3 className="text-lg font-bold text-[var(--color-text)] drop-shadow-md">{user?.display_name || user?.username}</h3>
                                <p className="text-sm text-[var(--color-text-muted)] drop-shadow-md">@{user?.username} • {t('settings.logged_in')}</p>
                            </div>
                        </div>

                        <button onClick={handleEditProfile} className="relative z-10 flex items-center justify-between w-full p-4 hover:bg-[var(--color-surface-hover)] transition-colors text-left group">
                            <div className="flex items-center gap-3">
                                <User size={20} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                                <span className="font-medium text-[var(--color-text)] group-hover:text-[var(--color-text)] transition-colors">{t('settings.edit_profile')}</span>
                            </div>
                            <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
                        </button>
                    </div>
                </section>

                {/* Appearance Section */}
                <section>
                    <h2 className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-2 px-2">{t('settings.appearance')}</h2>
                    <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]">
                        {/* Theme */}
                        <div className="border-b border-[var(--color-border)]">
                            <button onClick={() => setThemeExpanded(!themeExpanded)} className="flex items-center justify-between w-full p-4 hover:bg-[var(--color-surface-hover)] transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <Moon size={20} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                                    <span className="font-medium text-[var(--color-text)] transition-colors">{t('settings.theme')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[var(--color-text-muted)]">{themes.find(tOption => tOption.id === theme)?.label}</span>
                                    <ChevronRight size={18} className={`text-[var(--color-text-muted)] transition-transform ${themeExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </button>
                            {themeExpanded && (
                                <div className="bg-[var(--color-surface-hover)]/30 px-4 py-2 space-y-1 border-t border-[var(--color-border)]">
                                    {themes.map(tOption => (
                                        <button
                                            key={tOption.id}
                                            onClick={() => { setTheme(tOption.id); setThemeExpanded(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${theme === tOption.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'}`}
                                        >
                                            {tOption.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Accent Color */}
                        <div className="border-b border-[var(--color-border)]">
                            <button onClick={() => setAccentExpanded(!accentExpanded)} className="flex items-center justify-between w-full p-4 hover:bg-[var(--color-surface-hover)] transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <Palette size={20} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                                    <span className="font-medium text-[var(--color-text)] transition-colors">{t('settings.accent_color')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accentColor }}></div>
                                    <ChevronRight size={18} className={`text-[var(--color-text-muted)] transition-transform ${accentExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </button>
                            {accentExpanded && (
                                <div className="bg-[var(--color-surface-hover)]/30 px-4 py-3 flex gap-4 border-t border-[var(--color-border)]">
                                    {accentColors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => { setAccentColor(color); setAccentExpanded(false); }}
                                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 relative"
                                            style={{ backgroundColor: color }}
                                        >
                                            {accentColor === color && <Check size={16} className="text-white drop-shadow-md" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Language */}
                        <div>
                            <button onClick={() => setLanguageExpanded(!languageExpanded)} className="flex items-center justify-between w-full p-4 hover:bg-[var(--color-surface-hover)] transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <Globe size={20} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                                    <span className="font-medium text-[var(--color-text)] transition-colors">{t('settings.language')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[var(--color-text-muted)]">{languages.find(l => l.id === language)?.label}</span>
                                    <ChevronRight size={18} className={`text-[var(--color-text-muted)] transition-transform ${languageExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </button>
                            {languageExpanded && (
                                <div className="bg-[var(--color-surface-hover)]/30 px-4 py-2 space-y-1 border-t border-[var(--color-border)]">
                                    {languages.map(lOption => (
                                        <button
                                            key={lOption.id}
                                            onClick={() => { setLanguage(lOption.id); setLanguageExpanded(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${language === lOption.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-medium' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'}`}
                                        >
                                            {lOption.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hidden Unlock */}
                        <div className="border-t border-[var(--color-border)]">
                            <button onClick={() => setShowSecretInput(!showSecretInput)} className="flex items-center justify-between w-full p-4 hover:bg-[var(--color-surface-hover)] transition-colors text-left group">
                                <div className="flex items-center gap-3">
                                    <Link size={20} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                                    <span className="font-medium text-[var(--color-text-muted)] transition-colors tracking-widest">??????</span>
                                </div>
                                <ChevronRight size={18} className={`text-[var(--color-text-muted)] transition-transform ${showSecretInput ? 'rotate-90' : ''}`} />
                            </button>
                            {showSecretInput && (
                                <div className="p-4 border-t border-[var(--color-border)] bg-[#1a1a1a]">
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            placeholder={t('settings.unlock.placeholder')}
                                            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                                        />
                                        <button onClick={handleUnlock} className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                                            {t('settings.unlock.verify')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </section>

                {/* About Section */}
                <section>
                    <h2 className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-2 px-2">{t('settings.about')}</h2>
                    <div className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-3">
                                <Code size={20} className="text-[var(--color-text-muted)]" />
                                <span className="font-medium text-[var(--color-text)]">{t('settings.version')}</span>
                            </div>
                            <span className="text-sm text-[var(--color-text-muted)]">1.0.0-beta</span>
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <section className="pt-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-full p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl transition-colors font-medium gap-2"
                    >
                        <LogOut size={20} /> {t('settings.logout')}
                    </button>
                </section>

            </div>
        </div>
    );
};

export default Settings;
