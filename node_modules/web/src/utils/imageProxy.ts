export const getProxiedImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';

    // Only proxy specific domains known to be blocked by ISPs or causing CORS issues
    if (url.includes('i.ibb.co') || url.includes('img.otruyenapi.com')) {
        const workersStr = import.meta.env.VITE_CLOUDFLARE_WORKERS || '';
        const workers = workersStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        const workerUrl = workers.length > 0 ? workers[0] : '';

        if (workerUrl) {
            return `${workerUrl}/api/proxy?url=${encodeURIComponent(url)}`;
        }
    }

    return url;
};
