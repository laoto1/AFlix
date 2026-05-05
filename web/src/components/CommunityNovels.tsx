import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, Trophy, Plus, Search, SlidersHorizontal, BookOpen } from 'lucide-react';
import { getProxiedImageUrl } from '../utils/imageProxy';

const TABS = [
    { id: 'latest', label: 'Mới nhất' },
    { id: 'completed', label: 'Đã hoàn thành' },
    { id: 'top50', label: 'Phong thần bảng' }
];

const CATEGORIES = [
    'Tiên Hiệp', 'Huyền Huyễn', 'Khoa Huyễn', 'Võng Du', 'Đô Thị', 'Đồng Nhân', 'Dã Sử', 'Cạnh Kỹ', 'Huyền Nghi', 'Kiếm Hiệp', 'Kỳ Huyễn'
];

const STATUSES = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'ongoing', label: 'Đang ra' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'paused', label: 'Tạm ngưng' },
];

const CommunityNovels = () => {
    const [filter, setFilter] = useState('latest');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    const navigate = useNavigate();

    // Debounce search
    useState(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['communityNovels', filter, debouncedSearch, categoryFilter, statusFilter],
        queryFn: async () => {
            const res = await axios.get(`https://share.laoto.workers.dev/api/community/novels`, {
                params: {
                    tab: filter,
                    search: debouncedSearch,
                    category: categoryFilter,
                    status: statusFilter
                }
            });
            return res.data;
        }
    });

    const items = data?.data?.items || [];

    const renderLeaderboard = () => {
        return (
            <div className="flex flex-col gap-3 mt-4">
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
                            <div className="w-12 h-16 shrink-0 bg-[#2a2a2a] rounded overflow-hidden shadow-sm">
                                <img src={getProxiedImageUrl(item.thumb_url)} alt={item.name} className="w-full h-full object-cover" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold truncate ${isTop3 ? 'text-lg text-white' : 'text-base text-gray-200'}`}>
                                    {item.name}
                                </h3>
                                <p className="text-xs text-gray-400 truncate">{item.author}</p>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="flex items-center gap-1 text-xs text-rose-500 font-medium">
                                    <Heart size={14} fill="currentColor" /> {item.like_count}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-blue-400 font-medium">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                {items.map((item: any) => (
                    <Link 
                        key={item.id} 
                        to={`/community/novel/${item.id}`} 
                        className="flex flex-col gap-2 group cursor-pointer bg-[#1e1e1e] rounded-xl p-2.5 border border-[#333] hover:border-[var(--color-primary)] hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-primary/20"
                    >
                        <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#2a2a2a]">
                            <img
                                src={getProxiedImageUrl(item.thumb_url)}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Status Badge */}
                            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase shadow bg-black/60 text-white backdrop-blur-sm border border-white/10">
                                {item.status === 'completed' ? 'Hoàn thành' : item.status === 'paused' ? 'Tạm ngưng' : 'Đang ra'}
                            </div>
                            
                            {/* Overlay Stats */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-center text-[11px] font-medium text-white">
                                <span className="flex items-center gap-1"><Eye size={12} className="text-blue-400"/> {item.view_count}</span>
                                <span className="flex items-center gap-1"><Heart size={12} fill="currentColor" className="text-rose-500"/> {item.like_count}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-0.5 px-1 pb-1">
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-[var(--color-primary)] transition-colors" title={item.name}>
                                {item.name}
                            </h3>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-gray-400 truncate flex-1 pr-2" title={item.author}>
                                    {item.author}
                                </p>
                                <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 shrink-0 bg-[#2a2a2a] px-1.5 py-0.5 rounded">
                                    <BookOpen size={10} className="text-[var(--color-primary)]" />
                                    {item.chapters_count || 0}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 relative pb-20">
            {/* Search Bar */}
            <div className="flex flex-col gap-3 bg-[#1e1e1e] p-3 rounded-2xl border border-[#333] shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                // Simple debounce inline for fast typing
                                const target = e.target;
                                setTimeout(() => setDebouncedSearch(target.value), 500);
                            }}
                            placeholder="Tìm tên truyện, tác giả..."
                            className="w-full pl-10 pr-4 py-2.5 bg-[#2a2a2a] border border-[#444] rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                    </div>
                    <button 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`p-2.5 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${showAdvanced ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-[#2a2a2a] border-[#444] text-gray-400 hover:text-white'}`}
                    >
                        <SlidersHorizontal size={20} />
                    </button>
                </div>

                {/* Advanced Filters */}
                {showAdvanced && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#333]">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="flex-1 px-3 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-sm text-white outline-none focus:border-[var(--color-primary)] appearance-none"
                        >
                            {STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        
                        <div className="flex-1 relative">
                            <input 
                                type="text"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                placeholder="Nhập thể loại (vd: Tiên Hiệp)"
                                list="categories-list"
                                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-sm text-white outline-none focus:border-[var(--color-primary)]"
                            />
                            <datalist id="categories-list">
                                {CATEGORIES.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                    </div>
                )}
            </div>

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
                <div className="text-center py-10 text-sm text-gray-500">Chưa có truyện nào phù hợp.</div>
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
