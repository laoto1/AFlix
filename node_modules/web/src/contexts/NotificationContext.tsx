import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { fetchComicDetails } from '../services/otruyen';
import { parseChapterNumber } from '../utils/math';

interface BookmarkItem {
    id: number;
    source_id: string;
    comic_slug: string;
    comic_name: string;
    thumb_url: string;
    created_at: string;
    last_read_chapter_id?: string;
}

interface Notification {
    id: string;
    type: 'chapter' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    date: Date;
    link?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAsReadBySlug: (slug: string) => void;
    markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('flix_notifications');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.map((n: any) => ({ ...n, date: new Date(n.date) }));
            } catch {
                return [];
            }
        }
        return [
            {
                id: 'sys-welcome',
                type: 'system' as const,
                title: 'Chào mừng bản cập nhật',
                message: 'Tính năng thông báo tổng và giao diện hồ sơ mới đã được ra mắt!',
                isRead: false,
                date: new Date(Date.now() - 3600000)
            }
        ];
    });

    // Guard ref to prevent double-execution of the update check
    const isCheckingRef = useRef(false);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('flix_notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Fetch bookmarks + check for new chapters — runs once on mount, throttled to 4h
    useEffect(() => {
        if (isCheckingRef.current) return;

        const THROTTLE_MS = 4 * 60 * 60 * 1000; // 4 hours
        const lastCheck = localStorage.getItem('flix_last_update_check');
        const now = Date.now();
        if (lastCheck && now - parseInt(lastCheck) < THROTTLE_MS) return;

        isCheckingRef.current = true;

        const run = async () => {
            let bookmarks: BookmarkItem[] = [];
            try {
                const { data } = await axios.get('/api/bookmarks');
                bookmarks = data.bookmarks || [];
            } catch {
                isCheckingRef.current = false;
                return;
            }

            if (bookmarks.length === 0) {
                isCheckingRef.current = false;
                return;
            }

            const newNotifs: Notification[] = [];

            for (const item of bookmarks) {
                if (item.source_id !== 'otruyen') continue;
                try {
                    const detail = await fetchComicDetails(item.comic_slug);
                    const chapters = detail?.data?.item?.chapters?.[0]?.server_data || [];
                    if (chapters.length === 0) continue;

                    const latestChapter = chapters[chapters.length - 1];
                    const latestVal = parseChapterNumber(latestChapter.chapter_name);
                    const lastReadVal = parseChapterNumber(item.last_read_chapter_id);

                    if (latestVal > lastReadVal) {
                        newNotifs.push({
                            id: `ch-${item.comic_slug}-${latestChapter.chapter_name}`,
                            type: 'chapter',
                            title: 'Chương mới!',
                            message: `${item.comic_name} vừa có chương ${latestChapter.chapter_name}`,
                            isRead: false,
                            date: new Date(),
                            link: `/comic/${item.source_id}/${item.comic_slug}`
                        });
                    }
                } catch (e) {
                    console.error('Failed to check updates for', item.comic_slug);
                }
            }

            if (newNotifs.length > 0) {
                setNotifications(prev => {
                    const combined = [...prev];
                    for (const notif of newNotifs) {
                        if (!combined.find(n => n.id === notif.id)) {
                            combined.push(notif);
                        }
                    }
                    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
                });
            }

            localStorage.setItem('flix_last_update_check', now.toString());
            isCheckingRef.current = false;
        };

        run();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Stable callback refs (NEVER depend on `notifications` state) ──

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => {
            const idx = prev.findIndex(n => n.id === id && !n.isRead);
            if (idx === -1) return prev; // no change → no re-render
            const next = [...prev];
            next[idx] = { ...next[idx], isRead: true };
            return next;
        });
    }, []);

    const markAsReadBySlug = useCallback((slug: string) => {
        setNotifications(prev => {
            let changed = false;
            const next = prev.map(n => {
                if (n.type === 'chapter' && n.id.startsWith(`ch-${slug}-`) && !n.isRead) {
                    changed = true;
                    return { ...n, isRead: true };
                }
                return n;
            });
            return changed ? next : prev; // no change → no re-render
        });
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => {
            if (prev.every(n => n.isRead)) return prev; // no change → no re-render
            return prev.map(n => ({ ...n, isRead: true }));
        });
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAsReadBySlug, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
