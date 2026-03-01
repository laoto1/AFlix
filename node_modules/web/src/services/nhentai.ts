import axios from 'axios';

const api = axios.create({
    baseURL: '/api/nhentai'
});

export const fetchNhentaiComics = async (page: number) => {
    const res = await api.get(`?action=latest&page=${page}`);
    return res.data;
};

export const fetchNhentaiPopular = async (page: number, sort: string = 'popular-today') => {
    const res = await api.get(`?action=popular&page=${page}&sort=${sort}`);
    return res.data;
};

export const fetchNhentaiSearch = async (query: string, page: number) => {
    const res = await api.get(`?action=search&q=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
};

export const fetchNhentaiDetail = async (slug: string) => {
    const res = await api.get(`?action=detail&slug=${slug}`);
    return res.data;
};

export const fetchNhentaiChapter = async (slug: string) => {
    const res = await api.get(`?action=chapter&slug=${slug}`);
    return res.data;
};
