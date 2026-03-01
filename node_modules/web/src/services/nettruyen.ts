import axios from 'axios';

const BASE = '/api/nettruyen';

export const fetchNettruyenComics = async (page: number) => {
    const res = await axios.get(`${BASE}?action=latest&page=${page}`);
    return res.data;
};

export const fetchNettruyenPopular = async (page: number, time: string = 'all') => {
    const res = await axios.get(`${BASE}?action=popular&page=${page}&time=${time}`);
    return res.data;
};

export const fetchNettruyenCompleted = async (page: number) => {
    const res = await axios.get(`${BASE}?action=completed&page=${page}`);
    return res.data;
};

export const fetchNettruyenSearch = async (query: string, page: number) => {
    const res = await axios.get(`${BASE}?action=search&q=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
};

export const fetchNettruyenDetail = async (slug: string) => {
    const res = await axios.get(`${BASE}?action=detail&slug=${slug}`);
    return res.data;
};

export const fetchNettruyenChapter = async (slug: string, chapter: string) => {
    const res = await axios.get(`${BASE}?action=chapter&slug=${slug}&chapter=${encodeURIComponent(chapter)}`);
    return res.data;
};

export const fetchNettruyenCategories = async () => {
    const res = await axios.get(`${BASE}?action=categories`);
    return res.data;
};

export const fetchNettruyenComicsByCategory = async (slug: string, page: number) => {
    const res = await axios.get(`${BASE}?action=genre&slug=${slug}&page=${page}`);
    return res.data;
};
