export const getProxiedImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';

    // Proxy domains known to be blocked by ISPs, causing CORS issues, or Mixed Content
    const proxyDomains = [
        'i.ibb.co', 'img.otruyenapi.com', 'image.tmdb.org',
        // Novel cover domains causing Mixed Content / OpaqueResponseBlocking
        'sfacg.com', 'byteimg.com', 'faloo.com', 'wenku8.com',
        'sangtacvietcdn.xyz', 'sobiquge.com', 'xinyushuwu.com', 'shu05.com',
        'bookcover.yuewen.com', '69shu.org', 'metruyenchu.com.vn', 'metruyencv.com'
    ];

    const needsProxy = proxyDomains.some(d => url.includes(d)) || url.startsWith('http://');

    // Ignore proxy for well-known image CDN services that already handle CORS
    if (url.startsWith('https://wsrv.nl')) {
        return url;
    }

    if (needsProxy) {
        const workersStr = 'https://share.laoto.workers.dev';
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

