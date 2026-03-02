export const getProxiedImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';

    // Proxy domains known to be blocked by ISPs, causing CORS issues, or Mixed Content
    const proxyDomains = [
        'i.ibb.co', 'img.otruyenapi.com',
        // Novel cover domains causing Mixed Content / OpaqueResponseBlocking
        'sfacg.com', 'byteimg.com', 'faloo.com', 'wenku8.com',
        'sangtacvietcdn.xyz', 'sobiquge.com', 'xinyushuwu.com', 'shu05.com',
        'bookcover.yuewen.com', '69shu.org',
    ];

    const needsProxy = proxyDomains.some(d => url.includes(d)) || url.startsWith('http://');

    if (needsProxy) {
        const workersStr = import.meta.env.VITE_CLOUDFLARE_WORKERS || '';
        const workers = workersStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        const workerUrl = workers.length > 0 ? workers[0] : '';

        if (workerUrl) {
            // Ensure HTTPS for the target URL
            const secureUrl = url.replace(/^http:\/\//, 'https://');
            return `${workerUrl}/api/proxy?url=${encodeURIComponent(secureUrl)}`;
        }
    }

    return url;
};

