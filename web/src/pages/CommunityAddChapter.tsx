import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CommunityAddChapter = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error('Vui lòng nhập tên chương!');
        if (!content.trim()) return toast.error('Vui lòng nhập nội dung chương!');

        setIsSubmitting(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_CLOUDFLARE_WORKERS}/api/community/novels/${id}/chapters`, {
                title: title.trim(),
                content_text: content.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status === 'success') {
                toast.success('Đăng chương thành công!');
                navigate(`/community/novel/${id}`, { replace: true });
            } else {
                toast.error(res.data.message || 'Lỗi khi đăng chương!');
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
                <h1 className="text-lg font-medium ml-2 flex-1 text-[var(--color-text)]">Thêm chương mới</h1>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-full shadow-md disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Đăng
                </button>
            </header>

            <div className="p-4 flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">Tên chương <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="VD: Chương 1: Bắt đầu..."
                        className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-xl text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-sm font-medium text-gray-300">Nội dung <span className="text-red-500">*</span></label>
                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Nhập nội dung chương ở đây..."
                        className="w-full h-full min-h-[300px] px-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-xl text-white outline-none focus:border-[var(--color-primary)] transition-colors resize-none leading-relaxed"
                    />
                </div>
            </div>
        </div>
    );
};

export default CommunityAddChapter;
