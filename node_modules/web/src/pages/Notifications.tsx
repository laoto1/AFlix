import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { ArrowLeft, Bell, BookOpen, Info, CheckCircle2 } from 'lucide-react';

const Notifications = () => {
    const navigate = useNavigate();
    const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

    const handleNotificationClick = (id: string, link?: string) => {
        markAsRead(id);
        if (link) {
            navigate(link);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
            {/* Header */}
            <header className="shrink-0 bg-[var(--color-surface)] flex items-center h-14 px-2 shadow-sm border-b border-[var(--color-border)] justify-between z-10 sticky top-0">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-medium ml-2 flex items-center gap-2">
                        <Bell size={20} className="text-[var(--color-primary)]" />
                        Thông báo
                    </h1>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-md bg-[var(--color-surface-hover)] text-sm font-medium hover:bg-[#333] transition-colors"
                    >
                        <CheckCircle2 size={16} className="text-[var(--color-text-muted)]" />
                        Đánh dấu đã đọc
                    </button>
                )}
            </header>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-[var(--color-text-muted)]">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p>Không có thông báo nào.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.id, notif.link)}
                                className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-all border ${notif.isRead
                                    ? 'bg-[var(--color-surface)] border-transparent opacity-70'
                                    : 'bg-[#252538] border-[var(--color-primary)]/20 shadow-md'
                                    }`}
                            >
                                <div className="shrink-0 mt-1">
                                    {notif.type === 'chapter' ? (
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                            <BookOpen size={20} />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                                            <Info size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-semibold text-sm ${notif.isRead ? 'text-[var(--color-text)]' : 'text-[#8C8CFF]'}`}>
                                            {notif.title}
                                        </h3>
                                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 ml-2">
                                            {typeof notif.date === 'string' ? new Date(notif.date).toLocaleDateString() : notif.date.toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                        {notif.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
