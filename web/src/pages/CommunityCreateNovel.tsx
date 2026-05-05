import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Upload, Loader2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProxiedImageUrl } from '../utils/imageProxy';

const CATEGORIES = [
    'Tiên Hiệp', 'Huyền Huyễn', 'Khoa Huyễn', 'Võng Du', 'Đô Thị', 'Đồng Nhân', 'Dã Sử', 'Cạnh Kỹ', 'Huyền Nghi', 'Kiếm Hiệp', 'Kỳ Huyễn'
];

const CommunityCreateNovel = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!user || !token) {
            toast.error('Bạn cần đăng nhập để đăng truyện!');
            navigate('/login?redirect=/community/create');
        }
    }, [user, token, navigate]);

    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setSelectedCategories(prev => prev.filter(c => c !== cat));
        } else {
            if (selectedCategories.length >= 3) {
                toast.error('Chỉ được chọn tối đa 3 thể loại!');
                return;
            }
            setSelectedCategories(prev => [...prev, cat]);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        e.target.value = '';

        try {
            // Compress image to base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const imgSrc = event.target?.result as string;
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    // Resize to cover size
                    const MAX_WIDTH = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    
                    // Upload via existing ImgBB endpoint
                    const res = await axios.post(`https://share.laoto.workers.dev/api/upload`, { image: resizedBase64 });
                    if (res.data.url) {
                        setCoverUrl(res.data.url);
                        toast.success('Tải ảnh bìa thành công!');
                    }
                    setIsUploading(false);
                };
                img.src = imgSrc;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Cover upload failed', error);
            toast.error('Tải ảnh bìa thất bại!');
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error('Vui lòng nhập tên truyện!');
        if (!description.trim()) return toast.error('Vui lòng nhập giới thiệu truyện!');
        if (selectedCategories.length === 0) return toast.error('Vui lòng chọn ít nhất 1 thể loại!');
        if (!coverUrl) return toast.error('Vui lòng tải lên ảnh bìa!');

        setIsSubmitting(true);
        try {
            const res = await axios.post(`https://share.laoto.workers.dev/api/community/novels`, {
                title: title.trim(),
                description: description.trim(),
                cover_url: coverUrl,
                categories: selectedCategories,
                status: 'ongoing'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status === 'success') {
                toast.success('Đăng truyện thành công!');
                navigate(`/community/novel/${res.data.novel_id}`);
            } else {
                toast.error(res.data.message || 'Lỗi khi đăng truyện!');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
            <header className="sticky top-0 z-40 bg-[var(--color-surface)] flex items-center h-14 px-4 shadow-sm border-b border-[var(--color-border)]">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-hover)]">
                    <ArrowLeft size={24} className="text-[var(--color-text)]" />
                </button>
                <h1 className="text-lg font-medium ml-2 flex-1">Đăng truyện mới</h1>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-full shadow-md disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Đăng
                </button>
            </header>

            <div className="p-4 flex flex-col gap-6 pb-20">
                {/* Cover Upload */}
                <div className="flex flex-col items-center gap-3">
                    <div 
                        onClick={() => coverInputRef.current?.click()}
                        className="relative w-32 h-44 rounded-lg bg-[#2a2a2a] border-2 border-dashed border-[#555] flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-[var(--color-primary)] transition-colors"
                    >
                        {coverUrl ? (
                            <>
                                <img src={getProxiedImageUrl(coverUrl)} alt="Cover" className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Upload className="text-white" size={28} />
                                </div>
                            </>
                        ) : isUploading ? (
                            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
                        ) : (
                            <>
                                <Upload size={28} className="text-gray-400 mb-2" />
                                <span className="text-xs text-gray-400">Ảnh bìa (2:3)</span>
                            </>
                        )}
                    </div>
                    <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={handleCoverUpload} />
                </div>

                {/* Form Fields */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">Tên truyện <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Nhập tên truyện..."
                            className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-xl text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">Thể loại <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                        selectedCategories.includes(cat) 
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' 
                                            : 'bg-transparent border-[#444] text-gray-400 hover:border-gray-300'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">Giới thiệu <span className="text-red-500">*</span></label>
                        <textarea 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Mô tả nội dung truyện..."
                            rows={6}
                            className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-xl text-white outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityCreateNovel;
