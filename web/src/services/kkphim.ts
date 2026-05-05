

const BASE = 'https://phimapi.com';

export const CATEGORIES = [
    { name: 'Hành Động', slug: 'hanh-dong' },
    { name: 'Cổ Trang', slug: 'co-trang' },
    { name: 'Chiến Tranh', slug: 'chien-tranh' },
    { name: 'Viễn Tưởng', slug: 'vien-tuong' },
    { name: 'Kinh Dị', slug: 'kinh-di' },
    { name: 'Tài Liệu', slug: 'tai-lieu' },
    { name: 'Bí Ẩn', slug: 'bi-an' },
    { name: 'Phim 18+', slug: 'phim-18' },
    { name: 'Tình Cảm', slug: 'tinh-cam' },
    { name: 'Tâm Lý', slug: 'tam-ly' },
    { name: 'Thể Thao', slug: 'the-thao' },
    { name: 'Phiêu Lưu', slug: 'phieu-luu' },
    { name: 'Âm Nhạc', slug: 'am-nhac' },
    { name: 'Gia Đình', slug: 'gia-dinh' },
    { name: 'Học Đường', slug: 'hoc-duong' },
    { name: 'Hài Hước', slug: 'hai-huoc' },
    { name: 'Hình Sự', slug: 'hinh-su' },
    { name: 'Võ Thuật', slug: 'vo-thuat' },
    { name: 'Khoa Học', slug: 'khoa-hoc' },
    { name: 'Thần Thoại', slug: 'than-thoai' },
    { name: 'Chính Kịch', slug: 'chinh-kich' },
    { name: 'Kinh Điển', slug: 'kinh-dien' },
    { name: 'Phim Ngắn', slug: 'phim-ngan' }
];

export const COUNTRIES = [
    { name: 'Trung Quốc', slug: 'trung-quoc' },
    { name: 'Thái Lan', slug: 'thai-lan' },
    { name: 'Hồng Kông', slug: 'hong-kong' },
    { name: 'Pháp', slug: 'phap' },
    { name: 'Đức', slug: 'duc' },
    { name: 'Hà Lan', slug: 'ha-lan' },
    { name: 'Mexico', slug: 'mexico' },
    { name: 'Thụy Điển', slug: 'thuy-dien' },
    { name: 'Philippines', slug: 'philippines' },
    { name: 'Đan Mạch', slug: 'dan-mach' },
    { name: 'Thụy Sĩ', slug: 'thuy-si' },
    { name: 'Ukraina', slug: 'ukraina' },
    { name: 'Hàn Quốc', slug: 'han-quoc' },
    { name: 'Âu Mỹ', slug: 'au-my' },
    { name: 'Ấn Độ', slug: 'an-do' },
    { name: 'Canada', slug: 'canada' },
    { name: 'Tây Ban Nha', slug: 'tay-ban-nha' },
    { name: 'Indonesia', slug: 'indonesia' },
    { name: 'Ba Lan', slug: 'ba-lan' },
    { name: 'Malaysia', slug: 'malaysia' },
    { name: 'Bồ Đào Nha', slug: 'bo-dao-nha' },
    { name: 'UAE', slug: 'uae' },
    { name: 'Châu Phi', slug: 'chau-phi' },
    { name: 'Ả Rập Xê Út', slug: 'a-rap-xe-ut' },
    { name: 'Nhật Bản', slug: 'nhat-ban' },
    { name: 'Đài Loan', slug: 'dai-loan' },
    { name: 'Anh', slug: 'anh' },
    { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky' },
    { name: 'Nga', slug: 'nga' },
    { name: 'Úc', slug: 'uc' },
    { name: 'Brazil', slug: 'brazil' },
    { name: 'Ý', slug: 'y' },
    { name: 'Na Uy', slug: 'na-uy' },
    { name: 'Nam Phi', slug: 'nam-phi' },
    { name: 'Việt Nam', slug: 'viet-nam' },
    { name: 'Quốc Gia Khác', slug: 'quoc-gia-khac' }
];

export const YEARS = Array.from({ length: 27 }, (_, i) => (new Date().getFullYear() - i).toString());

export const SORT_FIELDS = [
    { name: 'Mới cập nhật', value: 'modified.time' },
    { name: 'Năm sản xuất', value: 'year' },
    { name: 'Mới đăng', value: '_id' }
];

export const TYPES = [
    { name: 'Phim Bộ', slug: 'phim-bo' },
    { name: 'Phim Lẻ', slug: 'phim-le' },
    { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    { name: 'TV Shows', slug: 'tv-shows' }
];

export const fetchHome = async () => {
    // Fetch page 1 of recent updates to count today's updates
    let todayCount = 0;
    try {
        const res = await fetch(`${BASE}/danh-sach/phim-moi-cap-nhat?page=1`).then(r => r.json());
        if (res?.items) {
            const today = new Date().toISOString().split('T')[0];
            todayCount = res.items.filter((i: any) => i.modified.time.startsWith(today)).length;
        }
    } catch (e) {}

    const titleSuffix = todayCount > 0 ? ` (${todayCount})` : '';

    // The UI expects categories to be passed in homeData.data.categories for the tabs.
    // It reads cat.title and cat.slug.
    return {
        data: {
            categories: [
                { title: `Mới nhất${titleSuffix}`, slug: 'phim-moi-cap-nhat' },
                ...TYPES.map(t => ({ title: t.name, slug: t.slug }))
            ]
        }
    };
};

export const fetchList = async (slug: string, page: number = 1, filters: Record<string, string> = {}) => {
    // Advanced Search via ophim1 because phimapi doesn't support empty keyword search filtering
    if (slug === 'advanced-search') {
        const type = filters['type'];
        const params = new URLSearchParams({ page: page.toString() });
        
        // ophim1.com/v1/api/tim-kiem fails if type= is provided! 
        // We MUST use /danh-sach/{type} if type is selected!
        const endpoint = type ? `/v1/api/danh-sach/${type}` : `/v1/api/tim-kiem`;
        
        if (!type) {
            params.append('keyword', '');
        }

        Object.entries(filters).forEach(([k, v]) => {
            if (k !== 'type' && v) params.append(k, v);
        });

        const res = await fetch(`https://ophim1.com${endpoint}?${params.toString()}`).then(r => r.json());
        
        const cdnDomain = res.data?.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
        const items = (res.data?.items || []).map((item: any) => ({
            ...item,
            thumb_url: `${cdnDomain}/uploads/movies/${item.thumb_url || item.poster_url}`,
            poster_url: `${cdnDomain}/uploads/movies/${item.poster_url || item.thumb_url}`
        }));

        return {
            data: {
                items,
                pagination: res.data?.params?.pagination,
                APP_DOMAIN_CDN_IMAGE: cdnDomain
            }
        };
    }


    // Ophim API has different endpoint for 'phim-moi-cap-nhat'
    if (slug === 'phim-moi-cap-nhat') {
        const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
    });
    const res = await fetch(`${BASE}/danh-sach/${slug}?${params.toString()}`).then(r => r.json());
        return {
            data: {
                items: res.items,
                pagination: res.pagination,
                APP_DOMAIN_CDN_IMAGE: res.pathImage || 'https://phimimg.com/uploads/movies/'
            }
        };
    }
    
    // For other categories (hoat-hinh, phim-bo, etc.)
    const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
    });
    const res = await fetch(`${BASE}/v1/api/danh-sach/${slug}?${params.toString()}`).then(r => r.json());
    return {
        data: {
            items: res.data?.items || [],
            pagination: res.data?.params?.pagination,
            APP_DOMAIN_CDN_IMAGE: res.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com/'
        }
    };
};

export const fetchDetail = async (slug: string) => {
    const res = await fetch(`${BASE}/phim/${slug}`).then(r => r.json());
    return { data: res };
};

export const fetchSearch = async (keyword: string, page: number = 1) => {
    const res = await fetch(`${BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`).then(r => r.json());
    return {
        data: {
            items: res.data?.items || [],
            pagination: res.data?.params?.pagination,
            APP_DOMAIN_CDN_IMAGE: res.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com/'
        }
    };
};
