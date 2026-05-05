import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Heart, Eye, Plus, BookOpen, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getProxiedImageUrl } from '../utils/imageProxy';

const CommunityNovelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const queryClient = useQueryClient();

    const [isLiking, setIsLiking] = useState(false);

    // Track View once per mount
    useEffect(() => {
        if (!id) return;
        const trackView = async () => {
            try {
                await axios.post(`https://share.laoto.workers.dev/api/community/novels/${id}/view`, {
                    viewer_hash: user ? user.id : undefined // anonymous uses IP on backend
                });
            } catch (e) {}
        };
        trackView();
    }, [id, user]);

    const { data: novelData, isLoading } = useQuery({
        queryKey: ['communityNovel', id],
        queryFn: async () => {
            const headers: any = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await axios.get(`https://share.laoto.workers.dev/api/community/novels/${id}`, { headers });
            return res.data?.data;
        }
    });

    const toggleLike = async () => {
        if (!user || !token) {
            toast.error('Vui lòng đăng nhập để thả tim!');
            return navigate('/login');
        }
        setIsLiking(true);
        try {
            const res = await axios.post(`https://share.laoto.workers.dev/api/community/novels/${id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status === 'success') {
                // Optimistic update
                queryClient.setQueryData(['communityNovel', id], (old: any) => {
                    if (!old) return old;
                    const diff = res.data.liked ? 1 : -1;
                    return {
                        ...old,
                        is_liked: res.data.liked,
                        like_count: Math.max(0, (old.like_count || 0) + diff)
                    };
                });
            }
        } catch (e) {
            toast.error('Lỗi khi thao tác!');
        } finally {
            setIsLiking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
        );
    }

    if (!novelData) {
        return (
            <div className="flex flex-col h-screen bg-[var(--color-bg)] text-white p-4">
                <button onClick={() => navigate(-1)} className="self-start p-2"><ArrowLeft size={24} /></button>
                <div className="flex-1 flex items-center justify-center text-gray-500">Không tìm thấy truyện!</div>
            </div>
        );
    }

    const isOwner = user && user.id === novelData.owner_id;

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            {/* Header / Cover Area */}
            <div className="relative w-full h-64 md:h-80 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-black">
                    <img src={getProxiedImageUrl(novelData.thumb_url)} alt="Cover Blur" className="w-full h-full object-cover opacity-30 blur-md scale-110" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[var(--color-bg)]" />
                
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-black/30 backdrop-blur-md text-white">
                    <ArrowLeft size={24} />
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end gap-4 md:gap-6">
                    <img src={getProxiedImageUrl(novelData.thumb_url)} alt="Cover" className="w-28 h-40 md:w-36 md:h-52 object-cover rounded-xl shadow-2xl border-2 border-white/10 shrink-0" />
                    <div className="flex flex-col flex-1 pb-2">
                        <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg mb-1 line-clamp-2">{novelData.name}</h1>
                        <p className="text-sm text-[var(--color-primary)] font-medium mb-3 drop-shadow-md">{novelData.author}</p>
                        
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-300">
                            <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
                                <Eye size={14} className="text-blue-400" /> {novelData.view_count}
                            </span>
                            <button 
                                onClick={toggleLike}
                                disabled={isLiking}
                                className={`flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm transition-colors ${novelData.is_liked ? 'text-rose-400' : 'text-gray-300 hover:text-white'}`}
                            >
                                <Heart size={14} fill={novelData.is_liked ? 'currentColor' : 'none'} className={isLiking ? 'animate-pulse' : ''} /> {novelData.like_count}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 flex flex-col gap-6">
                
                {/* Categories */}
                <div className="flex flex-wrap gap-2">
                    {novelData.categories.map((cat: any, i: number) => (
                        <span key={i} className="px-3 py-1 bg-[#1e1e1e] border border-[#333] text-gray-300 text-xs font-medium rounded-md">
                            {cat.name}
                        </span>
                    ))}
                    <span className="px-3 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-medium rounded-md">
                        {novelData.status}
                    </span>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {novelData.description}
                </div>

                {/* Divider */}
                <div className="h-px bg-[#333] w-full my-2"></div>

                {/* Chapters Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <BookOpen size={20} className="text-[var(--color-primary)]" />
                            Danh sách chương <span className="text-sm font-normal text-gray-500">({novelData.chapters?.length || 0})</span>
                        </h2>
                        {isOwner && (
                            <Link 
                                to={`/community/novel/${id}/add-chapter`}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#444] rounded-lg text-sm font-medium text-white transition-colors"
                            >
                                <Plus size={16} /> Thêm chương
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        {(!novelData.chapters || novelData.chapters.length === 0) ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                Truyện chưa có chương nào.
                            </div>
                        ) : (
                            novelData.chapters.map((ch: any) => (
                                <Link 
                                    key={ch.id} 
                                    to={`/community/novel/${id}/chapter/${ch.id}`}
                                    className="flex items-center justify-between p-3.5 bg-[#1a1a1a] hover:bg-[#222] rounded-xl border border-[#2a2a2a] transition-colors group"
                                >
                                    <div className="flex flex-col gap-1 pr-4">
                                        <h3 className="text-sm font-medium text-gray-200 group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                                            Chương {ch.order_index}: {ch.name}
                                        </h3>
                                    </div>
                                    <Clock size={14} className="text-gray-600 shrink-0" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityNovelDetail;
