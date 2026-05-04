import { getProxiedImageUrl } from '../utils/imageProxy';
import axios from 'axios';

const OTRUYEN_API_BASE = 'https://otruyenapi.com/v1/api';
// Otruyen provides CDN links via another base url
export const IMAGE_CDN = 'https://img.otruyenapi.com/uploads/comics';

export interface OtruyenItem {
    _id: string;
    name: string;
    slug: string;
    thumb_url: string;
    category?: { id: string, name: string, slug: string }[];
    chaptersLatest?: { filename: string, chapter_name: string, chapter_title: string, chapter_api_data: string }[];
}

export interface OtruyenResponse {
    status: string;
    data: {
        seoOnPage: { titleHead: string };
        items: OtruyenItem[];
        params: {
            pagination: {
                totalItems: number;
                totalItemsPerPage: number;
                currentPage: number;
                pageRanges: number;
            };
        };
    };
}

// Create a clean axios instance for Otruyen API to prevent leaking our internal Auth headers
// which causes CORS preflight delays and potential security issues.
const otruyenAxios = axios.create();
otruyenAxios.interceptors.request.use(config => {
    if (config.headers) {
        delete config.headers['Authorization'];
    }
    return config;
});

const filterValidComics = (data: OtruyenResponse): OtruyenResponse => {
    if (data?.data?.items) {
        data.data.items = data.data.items.filter(item => 
            item.chaptersLatest && item.chaptersLatest.length > 0
        );
    }
    return data;
};

export const fetchLatestComics = async (page: number = 1): Promise<OtruyenResponse> => {
    const { data } = await otruyenAxios.get(`${OTRUYEN_API_BASE}/danh-sach/truyen-moi?page=${page}`);
    return filterValidComics(data);
};

export const fetchCompletedComics = async (page: number = 1): Promise<OtruyenResponse> => {
    const { data } = await otruyenAxios.get(`${OTRUYEN_API_BASE}/danh-sach/hoan-thanh?page=${page}`);
    return filterValidComics(data);
};

export const fetchComicDetails = async (slug: string) => {
    const { data } = await otruyenAxios.get(`${OTRUYEN_API_BASE}/truyen-tranh/${slug}`);
    return data;
};

export const fetchChapter = async (chapterApiUrl: string) => {
    const { data } = await otruyenAxios.get(chapterApiUrl);
    return data;
};

export const fetchSearchComics = async (keyword: string, page: number = 1): Promise<OtruyenResponse> => {
    const { data } = await otruyenAxios.get(`${OTRUYEN_API_BASE}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
    return filterValidComics(data);
};

export const fetchComicsByCategory = async (categorySlug: string, page: number = 1): Promise<OtruyenResponse> => {
    const { data } = await otruyenAxios.get(`${OTRUYEN_API_BASE}/the-loai/${categorySlug}?page=${page}`);
    return filterValidComics(data);
};

export const fetchCategories = async () => {
    const { data } = await otruyenAxios.get(`${OTRUYEN_API_BASE}/the-loai`);
    return data;
};

export const getImageUrl = (thumb_url: string) => {
    let finalUrl = '';
    if (!thumb_url) return '';
    if (thumb_url.startsWith('http')) {
        finalUrl = thumb_url;
    } else if (thumb_url.includes('uploads/')) {
        const cleanPath = thumb_url.startsWith('/') ? thumb_url : '/' + thumb_url;
        finalUrl = `https://img.otruyenapi.com${cleanPath}`;
    } else {
        const path = thumb_url.startsWith('/') ? thumb_url : '/' + thumb_url;
        finalUrl = `${IMAGE_CDN}${path}`;
    }
    return getProxiedImageUrl(finalUrl);
};
