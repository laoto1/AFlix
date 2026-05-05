import axios from 'axios';
import { getCachedChapters, saveCachedChapters } from '../utils/mtcCache';

// ── MeTruyenChu Novel Service ──

export interface Novel {
    id: string;
    name: string;
    thumb_url: string;
    author: string;
}

export interface NovelDetail {
    id: string;
    numericId: string;
    name: string;
    author: string;
    status: string;
    thumb_url: string;
    description: string;
    categories: { name: string; slug: string }[];
}

export interface NovelChapter {
    id: string;
    name: string;
}

export interface NovelChapterContent {
    id: string;
    name: string;
    bookName: string;
    content: string;
}

export async function fetchNovelListing(page: number = 1, tab?: string, category?: string) {
    let url = `/api/metruyenchu?action=listing&page=${page}`;
    if (tab) url += `&tab=${tab}`;
    if (category) url += `&category=${category}`;
    const res = await axios.get(url);
    return res.data;
}

export async function fetchNovelSearch(keyword: string) {
    const res = await axios.get(`/api/metruyenchu?action=search&keyword=${encodeURIComponent(keyword)}`);
    return res.data;
}

export async function fetchNovelDetail(bookid: string) {
    const res = await axios.get(`/api/metruyenchu?action=detail&bookid=${bookid}`);
    return res.data;
}

export async function fetchNovelChapters(bookid: string, onProgress?: (chapters: any[]) => void) {
    let allChapters: any[] = [];
    let page = 1;

    // Try to get from cache first
    try {
        const cached = await getCachedChapters(bookid);
        if (cached && cached.length > 0) {
            allChapters = [...cached];
            if (onProgress) {
                onProgress([...allChapters]);
            }
            
            // Calculate which page to resume from. 
            // e.g. 150 chapters -> page 2 might have new ones. We should refetch the last page to be safe.
            page = Math.max(1, Math.ceil(allChapters.length / 100));
            
            // Remove the last page's chapters from allChapters so we can refetch them cleanly without complex merging
            const safeCount = (page - 1) * 100;
            allChapters = allChapters.slice(0, safeCount);
        }
    } catch (e) {
        console.error('Failed to load MTC cache', e);
    }
    
    // Fetch starting page
    const res = await axios.get(`/api/metruyenchu?action=chapters&bookid=${bookid}&page=${page}`);
    const firstPageData = res.data?.data?.chapters || [];
    
    // If we had cache and the page we fetched is empty, we just return the cache
    if (firstPageData.length === 0 && allChapters.length > 0) {
        return {
            status: 'success',
            data: { chapters: allChapters }
        };
    }

    allChapters = [...allChapters, ...firstPageData];
    allChapters = Array.from(new Map(allChapters.map(c => [c.id || c._id, c])).values());

    if (onProgress) {
        onProgress([...allChapters]);
    }

    if (firstPageData.length < 100) {
        // We reached the end
        saveCachedChapters(bookid, allChapters).catch(console.error);
        return {
            status: 'success',
            data: { chapters: allChapters }
        };
    }

    // Since Metruyenchu returns 100 per page, we fetch the remaining pages sequentially or batched
    // To prevent rate limiting from the worker or source, we fetch sequentially but it might take a while if > 1000 chapters
    // For MTC, limit might be capped, so we paginate until empty
    let hasMore = true;
    page++;

    while (hasMore) {
        // Fetch 3 pages concurrently to reduce API load and avoid rate limits
        const promises = [];
        for (let i = 0; i < 3; i++) {
            promises.push(axios.get(`/api/metruyenchu?action=chapters&bookid=${bookid}&page=${page + i}`));
        }
        
        const results = await Promise.allSettled(promises);
        let emptyHit = false;

        for (const p of results) {
            if (p.status === 'fulfilled') {
                const chapters = p.value.data?.data?.chapters || [];
                if (chapters.length > 0) {
                    allChapters = allChapters.concat(chapters);
                }
                if (chapters.length < 100) {
                    emptyHit = true;
                }
            } else {
                emptyHit = true; // Stop on error to prevent infinite loops
            }
        }

        if (onProgress) {
            const uniqueSoFar = Array.from(new Map(allChapters.map(c => [c.id || c._id, c])).values());
            allChapters = uniqueSoFar;
            onProgress(uniqueSoFar);
        }
        
        // Save intermediate cache so if user leaves early, we don't lose progress
        saveCachedChapters(bookid, allChapters).catch(console.error);

        if (emptyHit) break;
        page += 3;

        // Add delay between batches to prevent spamming the source
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Remove duplicates just in case
    const uniqueChapters = Array.from(new Map(allChapters.map(c => [c.id || c._id, c])).values());

    // Save final complete cache
    saveCachedChapters(bookid, uniqueChapters).catch(console.error);

    return {
        status: 'success',
        data: {
            chapters: uniqueChapters
        }
    };
}

export async function fetchNovelChapterContent(bookid: string, chapterId: string) {
    const res = await axios.get(`/api/metruyenchu?action=chapter&bookid=${bookid}&chapterId=${chapterId}`);
    return res.data;
}

export async function fetchMetruyenchuCategories() {
    return {
        status: 'success',
        data: {
            items: [
                { name: 'Tiên Hiệp', slug: 'tien-hiep' },
                { name: 'Kiếm Hiệp', slug: 'kiem-hiep' },
                { name: 'Ngôn Tình', slug: 'ngon-tinh' },
                { name: 'Đam Mỹ', slug: 'dam-my' },
                { name: 'Bách Hợp', slug: 'bach-hop' },
                { name: 'Quan Trường', slug: 'quan-truong' },
                { name: 'Võng Du', slug: 'vong-du' },
                { name: 'Khoa Huyễn', slug: 'khoa-huyen' },
                { name: 'Hệ Thống', slug: 'he-thong' },
                { name: 'Huyền Huyễn', slug: 'huyen-huyen' },
                { name: 'Dị Giới', slug: 'di-gioi' },
                { name: 'Dị Năng', slug: 'di-nang' },
                { name: 'Quân Sự', slug: 'quan-su' },
                { name: 'Lịch Sử', slug: 'lich-su' },
                { name: 'Xuyên Không', slug: 'xuyen-khong' },
                { name: 'Xuyên Nhanh', slug: 'xuyen-nhanh' },
                { name: 'Trọng Sinh', slug: 'trong-sinh' },
                { name: 'Trinh Thám', slug: 'trinh-tham' },
                { name: 'Linh Dị', slug: 'linh-di' },
                { name: 'Ngược', slug: 'nguoc' },
                { name: 'Sắc', slug: 'sac' },
                { name: 'Sủng', slug: 'sung' },
                { name: 'Cung Đấu', slug: 'cung-dau' },
                { name: 'Nữ Cường', slug: 'nu-cuong' },
                { name: 'Gia Đấu', slug: 'gia-dau' },
                { name: 'Đông Phương', slug: 'dong-phuong' },
                { name: 'Đô Thị', slug: 'do-thi' },
                { name: 'Điền Văn', slug: 'dien-van' },
                { name: 'Mạt Thế', slug: 'mat-the' },
                { name: 'Truyện Teen', slug: 'truyen-teen' },
                { name: 'Nữ Phụ', slug: 'nu-phu' },
                { name: 'Light Novel', slug: 'light-novel' },
                { name: 'Đoản Văn', slug: 'doan-van' },
                { name: 'Hiện Đại', slug: 'hien-dai' },
                { name: 'Khác', slug: 'khac' }
            ]
        }
    };
}
