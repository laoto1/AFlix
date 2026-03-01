import axios from 'axios';

const BASE = '/api/nhentai';

export const fetchNhentaiComics = async (page: number) => {
    const res = await axios.get(`${BASE}?action=latest&page=${page}`);
    return res.data;
};

export const fetchNhentaiPopular = async (page: number, sort: string = 'popular-today') => {
    const res = await axios.get(`${BASE}?action=popular&page=${page}&sort=${sort}`);
    return res.data;
};

export const fetchNhentaiSearch = async (query: string, page: number) => {
    const res = await axios.get(`${BASE}?action=search&q=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
};

export const fetchNhentaiDetail = async (slug: string) => {
    const res = await axios.get(`${BASE}?action=detail&slug=${slug}`);
    return res.data;
};

export const fetchNhentaiChapter = async (slug: string) => {
    const res = await axios.get(`${BASE}?action=chapter&slug=${slug}`);
    return res.data;
};
