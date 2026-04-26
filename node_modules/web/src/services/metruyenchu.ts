import axios from 'axios';

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

export async function fetchNovelChapters(bookid: string) {
    const res = await axios.get(`/api/metruyenchu?action=chapters&bookid=${bookid}`);
    return res.data;
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
