import { Hono } from 'hono';

const kkphim = new Hono();
const BASE_URL = 'https://phimapi.com';

kkphim.get('/home', async (c) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const [latestP1, latestP2, latestP3, seriesRes, singleRes, hoathinhRes, chieurapRes, tvshowRes] = await Promise.all([
            fetch(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=2`).then(r => r.json()),
            fetch(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=3`).then(r => r.json()),
            fetch(`${BASE_URL}/v1/api/danh-sach/phim-bo?page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/v1/api/danh-sach/phim-le?page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/v1/api/danh-sach/hoat-hinh?page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/v1/api/danh-sach/phim-chieu-rap?page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/v1/api/danh-sach/tv-shows?page=1`).then(r => r.json()),
        ]);

        let displayCount = '';
        try {
            const html = await fetch('https://kkphim.vip/').then(r => r.text());
            const match = html.match(/Cập nhật hôm nay[\s\S]{0,100}?(\d+)[\s\S]{0,50}?Phim/i) || html.match(/Cập nhật hôm nay.*?(\d+)/i);
            if (match && match[1]) {
                displayCount = match[1];
            } else {
                // Fallback if regex fails
                const todayStr = new Date().toISOString().split('T')[0];
                const allLatestItems = [...(latestP1.items || []), ...(latestP2.items || []), ...(latestP3.items || [])];
                const count = allLatestItems.filter(m => m.modified?.time?.startsWith(todayStr)).length;
                displayCount = count >= 30 ? '30+' : count.toString();
            }
        } catch (e) {
            displayCount = 'N/A';
        }

        // Note: We skip fetching detailed items here to prevent 500 subrequest limit errors.

        return c.json({
            status: 'success',
            data: {
                categories: [
                    { title: `Mới nhất (${displayCount})`, slug: 'phim-moi-cap-nhat', items: latestP1.items || [] },
                    { title: 'Phim bộ', slug: 'phim-bo', items: seriesRes.data?.items || [] },
                    { title: 'Phim lẻ', slug: 'phim-le', items: singleRes.data?.items || [] },
                    { title: 'Hoạt hình', slug: 'hoat-hinh', items: hoathinhRes.data?.items || [] },
                    { title: 'Chiếu rạp', slug: 'phim-chieu-rap', items: chieurapRes.data?.items || [] },
                    { title: 'TvShow', slug: 'tv-shows', items: tvshowRes.data?.items || [] }
                ]
            }
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

kkphim.get('/list/:slug', async (c) => {
    const slug = c.req.param('slug');
    const { page = '1', sort_field = '', category = '', country = '', year = '', type = '' } = c.req.query();
    
    let url = '';
    if (slug === 'phim-moi-cap-nhat') {
        url = `${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`;
    } else if (slug === 'advanced-search') {
        const queryParams = new URLSearchParams({ page });
        if (sort_field) queryParams.append('sort_field', sort_field);
        if (year) queryParams.append('year', year);

        if (type) {
            if (category) queryParams.append('category', category);
            if (country) queryParams.append('country', country);
            url = `${BASE_URL}/v1/api/danh-sach/${type}?${queryParams.toString()}`;
        } else if (category) {
            if (country) queryParams.append('country', country);
            url = `${BASE_URL}/v1/api/the-loai/${category}?${queryParams.toString()}`;
        } else if (country) {
            url = `${BASE_URL}/v1/api/quoc-gia/${country}?${queryParams.toString()}`;
        } else if (year) {
            url = `${BASE_URL}/v1/api/nam/${year}?${queryParams.toString()}`;
        } else {
            url = `${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`;
        }
    } else {
        const queryParams = new URLSearchParams({ page });
        if (sort_field) queryParams.append('sort_field', sort_field);
        if (category) queryParams.append('category', category);
        if (country) queryParams.append('country', country);
        if (year) queryParams.append('year', year);
        if (type) queryParams.append('type', type);
        
        url = `${BASE_URL}/v1/api/danh-sach/${slug}?${queryParams.toString()}`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();

        let normalizedData: any = {};
        
        if (data.data && data.data.items) {
            // v1 API format
            normalizedData.items = data.data.items;
            normalizedData.pagination = data.data.params?.pagination;
        } else {
            // legacy format
            normalizedData.items = data.items;
            normalizedData.pagination = data.pagination;
        }



        return c.json({ status: 'success', data: normalizedData });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

kkphim.get('/detail/:slug', async (c) => {
    const slug = c.req.param('slug');
    try {
        const res = await fetch(`${BASE_URL}/phim/${slug}`);
        const data = await res.json();
        return c.json({ status: 'success', data });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

kkphim.get('/search', async (c) => {
    const keyword = c.req.query('keyword');
    const { page = '1', sort_field = '', category = '', country = '', year = '', type = '' } = c.req.query();
    if (!keyword) return c.json({ error: 'Keyword required' }, 400);

    try {
        const queryParams = new URLSearchParams({ keyword, page, limit: '20' });
        if (sort_field) queryParams.append('sort_field', sort_field);
        if (category) queryParams.append('category', category);
        if (country) queryParams.append('country', country);
        if (year) queryParams.append('year', year);
        if (type) queryParams.append('type', type);

        const url = `${BASE_URL}/v1/api/tim-kiem?${queryParams.toString()}`;
        const res = await fetch(url);
        const data = await res.json();
        
        let normalizedData: any = {};
        if (data.data && data.data.items) {
            normalizedData.items = data.data.items;
            normalizedData.pagination = data.data.params?.pagination;
        } else {
            normalizedData.items = data.items || [];
        }

        return c.json({ status: 'success', data: normalizedData });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

export default kkphim;
