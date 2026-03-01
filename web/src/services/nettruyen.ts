import axios from 'axios';

const api = axios.create({
    baseURL: '/api/nettruyen'
});

export const fetchNettruyenComics = async (page: number) => {
    const res = await api.get(`?action=latest&page=${page}`);
    return res.data;
};

export const fetchNettruyenPopular = async (page: number, time: string = 'all') => {
    const res = await api.get(`?action=popular&page=${page}&time=${time}`);
    return res.data;
};

export const fetchNettruyenCompleted = async (page: number) => {
    const res = await api.get(`?action=completed&page=${page}`);
    return res.data;
};

export const fetchNettruyenSearch = async (query: string, page: number) => {
    const res = await api.get(`?action=search&q=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
};

export const fetchNettruyenDetail = async (slug: string) => {
    const res = await api.get(`?action=detail&slug=${slug}`);
    return res.data;
};

export const fetchNettruyenChapter = async (slug: string, chapter: string) => {
    const res = await api.get(`?action=chapter&slug=${slug}&chapter=${encodeURIComponent(chapter)}`);
    return res.data;
};

export const fetchNettruyenCategories = async () => {
    const res = await api.get(`?action=categories`);
    return res.data;
};

export const fetchNettruyenComicsByCategory = async (slug: string, page: number) => {
    const res = await api.get(`?action=genre&slug=${slug}&page=${page}`);
    return res.data;
};
