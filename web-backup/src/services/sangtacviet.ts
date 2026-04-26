import axios from 'axios';

// ── SangTacViet Novel Service ──

export interface Novel {
    _id: string;
    name: string;
    host: string;
    bookid: string;
    slug: string;
    thumb_url: string;
    author: string;
    views: string;
    likes: string;
    chapters_count: string;
    tags: string[];
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

export async function fetchNovelListing(page: number = 1, sort: string = 'update', step?: string) {
    let url = `/api/sangtacviet?action=listing&page=${page}&sort=${sort}`;
    if (step) url += `&step=${step}`;
    const res = await axios.get(url);
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

/**
 * Fetch chapter content using the STV reverse proxy.
 * 
 * Strategy:
 * 1. First try the simple API route (fastest, works for cached/simple chapters)
 * 2. If that fails, use the reverse proxy iframe approach:
 *    - Load the STV chapter page through the worker reverse proxy in a hidden iframe
 *    - The client browser executes STV's JS (cookies, XHR, anti-bot - all handled natively)
 *    - Injected script sends chapter content back via postMessage
 *    - No VPS/headless browser needed!
 */
export async function fetchNovelChapterContent(host: string, bookid: string, chapterId: string) {
    // Exclusively use the server-side API (now powered by the new Python nodriver service)
    const res = await axios.get(`/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${chapterId}`, {
        timeout: 45000, // 45s - server needs time for nodriver/Cloudflare bypass
    });
    return res.data;
}

/**
 * Load STV chapter page in a hidden iframe through the CF Worker reverse proxy.
 * The browser executes all of STV's JavaScript natively, including:
 * - Cloudflare challenge solving
 * - Cookie generation (_gac, _ac, _acx)
 * - readchapter XHR with proper session
 * 
 * An injected script sends the chapter content back via postMessage.
 */

