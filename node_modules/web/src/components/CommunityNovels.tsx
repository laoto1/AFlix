import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, Trophy, Plus } from 'lucide-react';
import { getProxiedImageUrl } from '../utils/imageProxy';

const TABS = [
    { id: 'latest', label: 'Mới nhất' },
    { id: 'completed', label: 'Đã hoàn thành' },
    { id: 'top50', label: 'Phong thần bảng' }
];

const CommunityNovels = () => {
    const [filter, setFilter] = useState('latest');
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['communityNovels', filter],
        queryFn: async () => {
            const res = await axios.get(`https://share.laoto.workers.dev/api/community/novels?tab=${filter}`);
            return res.data;
        }
    });

    const items = data?.data?.items || [];

    const renderLeaderboard = () => {
        return (
            <div className="flex flex-col gap-3">
                {items.map((item: any, index: number) => {
                    const isTop3 = index < 3;
                    return (
                        <Link 
                            key={item.id} 
                            to={`/community/novel/${item.id}`}
                            className="flex items-center gap-4 p-3 bg-[#1e1e1e] rounded-xl border border-[#333] hover:border-[var(--color-primary)] transition-all"
                        >
                            {/* Rank */}
                            <div className="flex flex-col items-center justify-center w-12 font-bold">
                                {isTop3 ? (
                                    <Trophy size={28} className={index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'} />
                                ) : (
                                    <span className="text-xl text-gray-500">#{index + 1}</span>
                                )}
                            </div>

                            {/* Cover */}
                            <div className="w-12 h-16 shrink-0 bg-[#2a2a2a] rounded overflow-hidden">
                                <img src={getProxiedImageUrl(item.thumb_url)} alt={item.name} className="w-full h-full object-cover" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold truncate ${isTop3 ? 'text-lg text-white' : 'text-base text-gray-200'}`}>
                                    {item.name}
                                </h3>
                                <p className="text-xs text-gray-400">{item.author}</p>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="flex items-center gap-1 text-xs text-rose-500">
                                    <Heart size={14} fill="currentColor" /> {item.like_count}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-blue-400">
                                    <Eye size={14} /> {item.view_count}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    };

    const renderGrid = () => {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {items.map((item: any) => (
                    <Link key={item.id} to={`/community/novel/${item.id}`} className="group cursor-pointer">
                        <div className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#2a2a2a] mb-2 shadow-sm border border-transparent group-hover:border-[var(--color-primary)] transition-colors">
                            <img
                                src={getProxiedImageUrl(item.thumb_url)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay Stats */}
                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center text-[10px] font-medium text-white">
                                <span className="flex items-center gap-1"><Eye size={10} />{item.view_count}</span>
                                <span className="flex items-center gap-1 text-rose-400"><Heart size={10} fill="currentColor" />{item.like_count}</span>
                            </div>
                        </div>
                        <h3 className="text-xs font-medium text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {item.name}
                        </h3>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 relative pb-20">
            {/* Filters */}
            <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            filter === tab.id
                                ? 'bg-[var(--color-primary)] text-white shadow-sm shadow-primary/30'
                                : 'bg-[#1e1e1e] text-gray-300 hover:bg-[#2a2a2a]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">Chưa có truyện nào.</div>
            ) : filter === 'top50' ? (
                renderLeaderboard()
            ) : (
                renderGrid()
            )}

            {/* FAB Add Button */}
            <button
                onClick={() => navigate('/community/create')}
                className="fixed bottom-20 right-4 w-12 h-12 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-105 transition-transform z-10"
            >
                <Plus size={24} />
            </button>
        </div>
    );
};

export default CommunityNovels;
