import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to restore scroll position when navigating back to a list view.
 * It saves the scroll position to sessionStorage under a key specific to the current pathname + search.
 * It restores the scroll position when the data is fully loaded (isSuccess = true).
 * 
 * @param isSuccess - Boolean indicating whether the page's main data has finished loading.
 */
export function useScrollRestoration(isSuccess: boolean) {
    const location = useLocation();
    const hasRestored = useRef(false);

    // Actively track the true scroll position and save it immediately to sessionStorage
    // React Router unmount hooks have race conditions where window.scrollY resets to 0 before saving.
    useEffect(() => {
        let timeout: any;
        const handleScroll = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (window.scrollY > 0) {
                    const key = `scroll_${location.pathname}${location.search}`;
                    sessionStorage.setItem(key, window.scrollY.toString());
                }
            }, 100); // 100ms debounce
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (timeout) clearTimeout(timeout);
        };
    }, [location.pathname, location.search]);

    useEffect(() => {
        // Only run restoration logic once after a successful data load
        if (isSuccess && !hasRestored.current) {
            const key = `scroll_${location.pathname}${location.search}`;
            const savedPosition = sessionStorage.getItem(key);

            if (savedPosition) {
                // Use setTimeout to ensure DOM has painted the newly loaded items
                setTimeout(() => {
                    window.scrollTo({
                        top: parseInt(savedPosition, 10),
                        behavior: 'auto'
                    });
                }, 100);
            }
            hasRestored.current = true;
        }
    }, [isSuccess, location.pathname, location.search]);
}
