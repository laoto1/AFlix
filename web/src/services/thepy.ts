import CryptoJS from 'crypto-js';

const BASE = 'https://v2.cdn199.com';
const AES_KEY = 'xxx';

const encryptPayload = (data: any) => ({ 
    r: CryptoJS.AES.encrypt(JSON.stringify(data), AES_KEY).toString() 
});

const decryptPayload = (data: any) => {
    if (!data?.r) return data;
    try {
        const bytes = CryptoJS.AES.decrypt(data.r, AES_KEY);
        const text = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(text);
    } catch (e) {
        console.error('Decryption failed', e);
        return null;
    }
};

export const CATEGORIES = [
    { name: 'Mới nhất', slug: 'recent' },
    { name: 'Yêu thích', slug: 'myfavs' }
];

export const fetchHome = async () => {
    return {
        data: {
            categories: CATEGORIES.map(c => ({ title: c.name, slug: c.slug }))
        }
    };
};

export const fetchList = async (slug: string, page: number = 1, filters: Record<string, string> = {}) => {
    // Use the slug directly if it's not phim-moi-cap-nhat
    const type = filters.sort_field || (slug === 'phim-moi-cap-nhat' ? 'recent' : slug);
    
    const res = await fetch(`${BASE}/sevenVideos?page=${page}&type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptPayload({}))
    }).then(r => r.json());

    const decrypted = decryptPayload(res);
    
    if (!Array.isArray(decrypted)) {
        return { data: { items: [], pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: page, totalPages: 1 }, APP_DOMAIN_CDN_IMAGE: '' } };
    }

    const items = decrypted.map((item: any) => ({
        _id: item._id,
        name: item.title,
        slug: item.id,
        origin_name: item.title_en,
        thumb_url: item.thumbNails?.[0] || item.thumbnails?.[0] || '',
        poster_url: item.thumbNails?.[0] || item.thumbnails?.[0] || '',
        year: new Date(item.createdTime).getFullYear() || new Date().getFullYear(),
        modified: { time: new Date(item.createdTime).toISOString() },
        view: item.views || 0,
        update_time: item.tags_en ? item.tags_en.split('|')[0].trim() : (item.time || ''),
        duration: item.durationStr || '',
        episode_current: item.durationStr || 'Full'
    }));

    // Guess pagination since api just returns an array
    const hasNext = items.length === 24;
    
    return {
        data: {
            items,
            pagination: {
                totalItems: 1000,
                totalItemsPerPage: 24,
                currentPage: page,
                totalPages: hasNext ? page + 1 : page
            },
            APP_DOMAIN_CDN_IMAGE: ''
        }
    };
};

export const fetchDetail = async (slug: string) => {
    const res = await fetch(`${BASE}/sevenVideos/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: "{}" // Empty object is fine
    }).then(r => r.json());

    const item = decryptPayload(res);
    
    if (!item) return { data: null };

    // Transform to KKPhim expected format
    return {
        data: {
            movie: {
                _id: item._id,
                name: item.title,
                slug: item.id,
                origin_name: item.title_en,
                content: item.title,
                type: 'single',
                status: 'completed',
                thumb_url: item.thumbnails?.[0] || '',
                poster_url: item.thumbnails?.[0] || '',
                is_copyright: false,
                sub_docquyen: false,
                chieu_rap: false,
                time: item.durationStr,
                episode_current: 'Full',
                episode_total: '1',
                quality: 'HD',
                lang: 'Vietsub',
                year: new Date(item.createdTime).getFullYear(),
                view: item.views || 0,
                category: [{ id: '1', name: '18+', slug: '18-plus' }],
                country: [{ id: '1', name: 'Unknown', slug: 'unknown' }],
                actor: [item.user || 'Unknown'],
                director: ['Unknown']
            },
            episodes: [
                {
                    server_name: 'M3U8',
                    server_data: [
                        {
                            name: 'Full',
                            slug: 'full',
                            filename: 'full.mp4',
                            link_embed: item.m3u8s?.[0] || item.videoUrl || '',
                            link_m3u8: item.m3u8s?.[0] || item.videoUrl || ''
                        }
                    ]
                }
            ]
        }
    };
};

export const fetchSearch = async (keyword: string, page: number = 1) => {
    // Search endpoint: POST /searchSevenVideos?page=1&keyword=xxx ?
    // Let's guess it's /searchSevenVideos with body or query
    const res = await fetch(`${BASE}/searchSevenVideos?page=${page}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptPayload({ keyword }))
    }).then(r => r.json()).catch(() => null);

    const decrypted = res ? decryptPayload(res) : null;
    let rawItems = [];
    if (decrypted && Array.isArray(decrypted)) rawItems = decrypted;
    else if (decrypted?.videos && Array.isArray(decrypted.videos)) rawItems = decrypted.videos;

    const items = rawItems.map((item: any) => ({
        _id: item._id,
        name: item.title,
        slug: item.id,
        origin_name: item.title_en,
        thumb_url: item.thumbNails?.[0] || item.thumbnails?.[0] || '',
        poster_url: item.thumbNails?.[0] || item.thumbnails?.[0] || '',
        year: new Date(item.createdTime || Date.now()).getFullYear(),
        modified: { time: new Date(item.createdTime || Date.now()).toISOString() }
    }));

    return {
        data: {
            items,
            pagination: {
                totalItems: 1000,
                totalItemsPerPage: 24,
                currentPage: page,
                totalPages: items.length === 24 ? page + 1 : page
            },
            APP_DOMAIN_CDN_IMAGE: ''
        }
    };
};

export const SORT_FIELDS = [
    { name: 'Mới nhất', value: 'recent' },
    { name: 'Yêu thích', value: 'myfavs' },
    { name: 'Khuyên dùng', value: 'recommend' },
    { name: 'Top tháng', value: 'month' },
    { name: 'Top tuần', value: 'week' },
    { name: 'Top ngày', value: 'today' },
];

export const YEARS = [];
export const COUNTRIES = [];
