import axios from 'axios';

// ── SangTacViet Novel Service ──
// Uses the default axios instance which has the WorkerPool interceptor

export interface Novel {
    _id: string;
    name: string;
    host: string;
    bookid: string;
    slug: string;
    thumb_url: string;
    category: { name: string; slug: string }[];
    updatedAt: string;
}

export interface NovelDetail {
    _id: string;
    name: string;
    host: string;
    bookid: string;
    slug: string;
    origin_name: string;
    author: string;
    status: string;
    thumb_url: string;
    content: string;
    category: { name: string; slug: string }[];
    updatedAt: string;
    chapters: any[];
    chapter_api_data: string;
}

export interface NovelChapter {
    _id: string;
    name: string;
    chapter_api_data: string;
}

export interface NovelChapterContent {
    _id: string;
    name: string;
    book_name: string;
    content: string;
}

export async function fetchNovelLatest(page: number = 1) {
    const res = await axios.get(`/api/sangtacviet?action=latest&page=${page}`);
    return res.data;
}

export async function fetchNovelSearch(keyword: string) {
    const res = await axios.get(`/api/sangtacviet?action=search&keyword=${encodeURIComponent(keyword)}`);
    return res.data;
}

export async function fetchNovelDetail(host: string, bookid: string) {
    const res = await axios.get(`/api/sangtacviet?action=detail&host=${host}&bookid=${bookid}`);
    return res.data;
}

export async function fetchNovelChapters(host: string, bookid: string) {
    const res = await axios.get(`/api/sangtacviet?action=chapters&host=${host}&bookid=${bookid}`);
    return res.data;
}

export async function fetchNovelChapterContent(host: string, bookid: string, chapterId: string) {
    const res = await axios.get(`/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${chapterId}`);
    return res.data;
}
