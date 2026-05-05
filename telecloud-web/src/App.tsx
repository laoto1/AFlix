import React, { useState, useEffect, useRef } from 'react';
import { TelecloudService } from './services/telecloud';
import { CloudUpload, Download, Trash2, File, Image, FileText, LogOut } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const CHUNK_SIZE = 18 * 1024 * 1024; // 18MB

export interface TelecloudFile {
    id: string;
    filename: string;
    size: number;
    mime_type: string;
    created_at: string;
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const TeleCloudDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [files, setFiles] = useState<TelecloudFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadFiles = async () => {
        try {
            const data = await TelecloudService.getFiles();
            setFiles(data);
        } catch (e: any) {
            if (e.message === 'Unauthorized') {
                onLogout();
            } else {
                toast.error('Lỗi khi tải file: ' + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            setUploadProgress(0);

            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const chunkIds: string[] = [];

            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                const fileId = await TelecloudService.uploadChunk(chunk);
                chunkIds.push(fileId);

                setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
            }

            await TelecloudService.finalizeUpload(file.name, file.size, file.type || 'application/octet-stream', chunkIds);
            
            // Reload list
            await loadFiles();
            toast.success('Upload thành công!');
        } catch (e: any) {
            toast.error(e.message || 'Upload thất bại');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        try {
            await TelecloudService.deleteFile(id);
            setFiles(files.filter(f => f.id !== id));
            toast.success('Đã xóa file');
        } catch (e: any) {
            toast.error('Xóa file thất bại');
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <Image size={24} className="text-blue-400" />;
        if (mimeType.startsWith('text/')) return <FileText size={24} className="text-gray-400" />;
        return <File size={24} className="text-purple-400" />;
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">TeleCloud Admin</h1>
                    <p className="text-gray-400">Serverless Telegram Storage Management</p>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <CloudUpload size={20} />
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    <button 
                        onClick={onLogout}
                        className="bg-gray-800 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {uploading && (
                <div className="bg-gray-800 rounded-xl p-4 mb-8">
                    <div className="flex justify-between text-sm mb-2 text-gray-300">
                        <span>Uploading File...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading files...</div>
            ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-2xl">
                    <CloudUpload size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map(file => (
                        <div key={file.id} className="bg-gray-800 p-4 rounded-2xl flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-gray-700 rounded-xl">
                                    {getFileIcon(file.mime_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate" title={file.filename}>
                                        {file.filename}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {formatBytes(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <a 
                                    href={TelecloudService.getDownloadUrl(file.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm font-medium"
                                >
                                    <Download size={14} /> Download
                                </a>
                                <button 
                                    onClick={() => handleDelete(file.id)}
                                    className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const LoginScreen: React.FC<{ onLogin: (key: string) => void }> = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim()) {
            setLoading(true);
            try {
                await TelecloudService.verifyAuth(password.trim());
                toast.success('Đăng nhập thành công!');
                onLogin(password.trim());
            } catch (e) {
                toast.error('Mật khẩu không chính xác!');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-3xl w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-purple-600/20 rounded-2xl">
                        <CloudUpload size={40} className="text-purple-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white text-center mb-2">TeleCloud Admin</h1>
                <p className="text-gray-400 text-center mb-8">Enter your admin key to continue</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="Admin Secret Key"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500"
                        required
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className="bg-purple-600 text-white font-medium py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Đang kiểm tra...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const key = localStorage.getItem('telecloud_admin_key');
        if (key) setIsAuthenticated(true);
    }, []);

    const handleLogin = (key: string) => {
        localStorage.setItem('telecloud_admin_key', key);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('telecloud_admin_key');
        setIsAuthenticated(false);
        toast('Đã đăng xuất', { icon: '👋' });
    };

    return (
        <>
            <Toaster position="top-center" />
            {isAuthenticated ? <TeleCloudDashboard onLogout={handleLogout} /> : <LoginScreen onLogin={handleLogin} />}
        </>
    );
}

export default App;
