import { useState } from 'react';
import CommunityNovels from './CommunityNovels';

const CommunityTab = () => {
    const [subTab, setSubTab] = useState<'manga' | 'novel'>('novel'); // Focus on novel first

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Top Sub-tabs */}
            <div className="flex bg-[#2a2a2a] p-1 rounded-xl mx-auto w-full max-w-sm">
                <button
                    onClick={() => setSubTab('manga')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        subTab === 'manga' ? 'bg-[#404040] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Truyện tranh
                </button>
                <button
                    onClick={() => setSubTab('novel')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        subTab === 'novel' ? 'bg-[#404040] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Tiểu thuyết
                </button>
            </div>

            {/* Content */}
            <div className="w-full">
                {subTab === 'novel' ? (
                    <CommunityNovels />
                ) : (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        Tính năng đăng Truyện tranh sẽ sớm ra mắt!
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityTab;
