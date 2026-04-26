import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Check, X, Key, Loader2, Volume2, Settings2, RefreshCw, Lock } from 'lucide-react';
import { testGeminiKey, generateGeminiAudio, clearTTSCache } from '../services/tts';
import type { GeminiKey } from '../services/tts';

interface TTSPanelProps {
    blocks: string[]; // Array of text blocks
    themeStyles: any;
    isAutoScrollSync: boolean;
    setIsAutoScrollSync: (val: boolean) => void;
    onPlayingBlocksChange: (blocks: number[]) => void;
    onTTSComplete?: () => void;
    onLockScreen?: () => void;
}

export const TTSPanel: React.FC<TTSPanelProps> = ({ blocks, themeStyles, isAutoScrollSync, setIsAutoScrollSync, onPlayingBlocksChange, onTTSComplete, onLockScreen }) => {
    const [engine, setEngine] = useState<'gemini' | 'piper'>('gemini');
    const [keys, setKeys] = useState<GeminiKey[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('tts-gemini-keys') || '[]');
        } catch {
            return [];
        }
    });
    const [newKey, setNewKey] = useState('');
    const [model, setModel] = useState('gemini-3.1-flash-tts-preview');
    const [voice, setVoice] = useState('Puck');
    const [animSpeed, setAnimSpeed] = useState(1.0);
    const [isAutoNextChapter, setIsAutoNextChapter] = useState(false);
    const [piperLengthScale, setPiperLengthScale] = useState(1.0);
    const [piperNoiseScale, setPiperNoiseScale] = useState(0.667);
    const [piperNoiseW, setPiperNoiseW] = useState(0.8);
    const animSpeedRef = useRef(1.0);
    const autoPlayNextRef = useRef(false);

    useEffect(() => {
        animSpeedRef.current = animSpeed;
    }, [animSpeed]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    // Audio player state
    const [paragraphs, setParagraphs] = useState<{ text: string, blocks: number[] }[]>([]);
    const [currentParaIdx, setCurrentParaIdx] = useState(0);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioCacheRef = useRef<Record<number, string | Promise<string | null>>>({});
    const cacheVersionRef = useRef<number>(0);
    const playRequestIdRef = useRef<number>(0);
    const latestSettingsRef = useRef({ engine, model, voice, piperLengthScale, piperNoiseScale, piperNoiseW, keys });

    useEffect(() => {
        latestSettingsRef.current = { engine, model, voice, piperLengthScale, piperNoiseScale, piperNoiseW, keys };
    }, [engine, model, voice, piperLengthScale, piperNoiseScale, piperNoiseW, keys]);

    // Save keys to localStorage
    useEffect(() => {
        localStorage.setItem('tts-gemini-keys', JSON.stringify(keys));
    }, [keys]);

    // Group small blocks into larger chunks
    useEffect(() => {
        if (!blocks || blocks.length === 0) return;

        // Gemini: ~400 chars to maintain voice stability and prevent degradation at the end of long chunks.
        // Piper: ~200 chars for better prosody and faster generation.
        const maxChunkSize = engine === 'gemini' ? 400 : 200;
        const chunks: { text: string, blocks: number[] }[] = [];
        let currentChunkText = '';
        let currentChunkBlocks: number[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const p = blocks[i];
            if (currentChunkText.length + p.length > maxChunkSize && currentChunkText.length > 0) {
                chunks.push({ text: currentChunkText.trim(), blocks: [...currentChunkBlocks] });
                currentChunkText = p + '\n';
                currentChunkBlocks = [i];
            } else {
                currentChunkText += p + '\n';
                currentChunkBlocks.push(i);
            }
        }
        if (currentChunkText.trim()) {
            chunks.push({ text: currentChunkText.trim(), blocks: [...currentChunkBlocks] });
        }

        setParagraphs(chunks);
        setCurrentParaIdx(0);
        audioCacheRef.current = {};
        cacheVersionRef.current += 1;
        stopAudio();
    }, [blocks, engine]);

    useEffect(() => {
        if (autoPlayNextRef.current && paragraphs.length > 0) {
            autoPlayNextRef.current = false;
            setTimeout(() => {
                // start playing automatically!
                if (!isPlaying) {
                    setIsPlaying(true); // force UI update immediately
                    playNextParagraph(0);
                }
            }, 1000); // 1s delay for chapter transition
        }
    }, [paragraphs]);

    const activeBlockIdxRef = useRef<number | null>(null);

    // Time update handler for proportional highlighting
    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio || !paragraphs[currentParaIdx] || !isPlaying) return;

        const chunk = paragraphs[currentParaIdx];
        if (chunk.blocks.length === 0) return;

        const duration = audio.duration;
        const currentTime = audio.currentTime;
        if (!duration || duration <= 0) return;

        // AI Drift Correction: Adjust for Gemini's inherent audio padding (silence at start and end)
        const effectiveDuration = Math.max(0.1, duration - 1.0); // usually 0.7s silence at end
        const effectiveCurrentTime = Math.max(0, currentTime - 0.3); // usually 0.3s silence at start
        let progress = (effectiveCurrentTime / effectiveDuration) * animSpeedRef.current;
        if (progress > 1) progress = 1;
        if (progress < 0) progress = 0;

        // AI Drift Correction: Weight characters based on how long they take to speak (pauses)
        const getBlockWeight = (text: string) => {
            let weight = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (['.', '!', '?', ':', '"', '”', '“'].includes(char)) weight += 12;
                else if ([',', ';', '-'].includes(char)) weight += 5;
                else weight += 1;
            }
            return weight + 10; // base overhead per block (breath pause)
        };

        let totalWeight = 0;
        for (const bIdx of chunk.blocks) {
            totalWeight += getBlockWeight(blocks[bIdx]);
        }

        let weightAccumulator = 0;
        let activeBlock = chunk.blocks[chunk.blocks.length - 1];

        const targetWeight = progress * totalWeight;

        for (const bIdx of chunk.blocks) {
            weightAccumulator += getBlockWeight(blocks[bIdx]);
            if (targetWeight <= weightAccumulator) {
                activeBlock = bIdx;
                break;
            }
        }

        if (activeBlockIdxRef.current !== activeBlock) {
            activeBlockIdxRef.current = activeBlock;
            onPlayingBlocksChange([activeBlock]);

            if (isAutoScrollSync) {
                const element = document.getElementById(`text-block-${activeBlock}`);
                if (element) {
                    const y = element.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
        }
    };

    const handleEnded = () => {
        if (currentParaIdx < paragraphs.length - 1) {
            const nextIdx = currentParaIdx + 1;
            setCurrentParaIdx(nextIdx);
            playNextParagraph(nextIdx);
        } else {
            setIsPlaying(false);
            setCurrentParaIdx(0);
            if (isAutoNextChapter && onTTSComplete) {
                autoPlayNextRef.current = true;
                onTTSComplete();
            }
        }
    };

    // Update parent when stopped
    useEffect(() => {
        if (!isPlaying) {
            onPlayingBlocksChange([]);
            activeBlockIdxRef.current = null;
        }
    }, [isPlaying, onPlayingBlocksChange]);

    const handleAddKey = () => {
        if (!newKey.trim()) return;
        const newKeys = newKey.split(',').map(k => k.trim()).filter(k => k && !keys.find(existing => existing.key === k));
        if (newKeys.length > 0) {
            setKeys([...keys, ...newKeys.map(k => ({ key: k, status: 'idle' as const }))]);
        }
        setNewKey('');
    };

    const handleRemoveKey = (keyToRemove: string) => {
        setKeys(keys.filter(k => k.key !== keyToRemove));
    };

    const handleCheckKeys = async () => {
        setIsChecking(true);
        const updatedKeys = [...keys];
        for (let i = 0; i < updatedKeys.length; i++) {
            updatedKeys[i] = { ...updatedKeys[i], status: 'testing' };
            setKeys([...updatedKeys]);

            const result = await testGeminiKey(updatedKeys[i].key, model);
            updatedKeys[i] = { ...updatedKeys[i], status: result.status, errorMessage: result.message };
            setKeys([...updatedKeys]);

            // Artificial delay to prevent sending too many requests at once and hitting 429 globally
            if (i < updatedKeys.length - 1) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
        setIsChecking(false);
    };

    const stopAudio = () => {
        playRequestIdRef.current += 1;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setIsPlaying(false);
    };

    const handleResetAudio = async () => {
        if (window.confirm("Bạn có chắc muốn xóa toàn bộ bộ đệm âm thanh đã tạo cho truyện này không?\n(Việc này sẽ bắt buộc máy tải/tạo lại từ đầu khi nhấn Play)")) {
            await clearTTSCache();
            audioCacheRef.current = {};
            cacheVersionRef.current += 1;
            stopAudio();
            alert("Đã xóa bộ đệm âm thanh thành công!");
        }
    };

    const prefetchParagraph = async (idx: number) => {
        if (idx >= paragraphs.length) return null;
        if (audioCacheRef.current[idx]) {
            const cached = audioCacheRef.current[idx];
            if (cached instanceof Promise) return cached;
            return cached;
        }
        
        const currentVersion = cacheVersionRef.current;
        const promise = (async () => {
            const textToRead = paragraphs[idx].text;
            const settings = latestSettingsRef.current;
            const piperOptions = settings.engine === 'piper' ? {
                lengthScale: settings.piperLengthScale,
                noiseScale: settings.piperNoiseScale,
                noiseW: settings.piperNoiseW
            } : undefined;
            const result = await generateGeminiAudio(textToRead, settings.keys, settings.model, settings.voice, false, piperOptions);
            if (result && result.audioBase64) {
                return `data:audio/wav;base64,${result.audioBase64}`;
            }
            throw new Error('Failed to generate audio');
        })();
        
        audioCacheRef.current[idx] = promise;
        
        try {
            const res = await promise;
            // If version changed during generation, discard this result!
            if (cacheVersionRef.current !== currentVersion) {
                return null;
            }
            if (res) audioCacheRef.current[idx] = res; // Replace promise with actual string
            return res;
        } catch (e) {
            delete audioCacheRef.current[idx]; // Remove if failed so it can retry
            throw e;
        }
    };

    const playNextParagraph = async (idx: number) => {
        const reqId = ++playRequestIdRef.current;
        
        if (idx >= paragraphs.length) {
            setIsPlaying(false);
            return;
        }
        
        // Instantly highlight the first block of the new paragraph while loading
        const firstBlock = paragraphs[idx].blocks[0];
        if (firstBlock !== undefined && activeBlockIdxRef.current !== firstBlock) {
            activeBlockIdxRef.current = firstBlock;
            onPlayingBlocksChange([firstBlock]);
            if (isAutoScrollSync) {
                const element = document.getElementById(`text-block-${firstBlock}`);
                if (element) {
                    const y = element.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
        }

        setErrorMsg('');

        try {
            let audioSrc = audioCacheRef.current[idx];

            if (audioSrc instanceof Promise) {
                setIsLoadingAudio(true);
                audioSrc = await audioSrc;
            }
            
            if (reqId !== playRequestIdRef.current) return;

            if (!audioSrc) {
                setIsLoadingAudio(true);
                audioSrc = await prefetchParagraph(idx);
            }
            
            if (reqId !== playRequestIdRef.current) return;
            
            if (typeof audioSrc === 'string') {
                setIsLoadingAudio(false);
                if (audioRef.current) {
                    audioRef.current.src = audioSrc;
                    const playPromise = audioRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            if (e.name === 'AbortError' || e.message.includes('interrupted')) return;
                            console.error("Playback failed:", e);
                        });
                    }
                    setIsPlaying(true);

                    // Trigger prefetch for the next chunks
                    if (engine === 'piper') {
                        // Prefetch immediately and multiple chunks ahead for Piper
                        prefetchParagraph(idx + 1).catch(() => {}).then(() => {
                            prefetchParagraph(idx + 2).catch(() => {}).then(() => {
                                prefetchParagraph(idx + 3).catch(() => {});
                            });
                        });
                    } else {
                        // Gemini needs delay to avoid rate limit spam
                        setTimeout(() => {
                            prefetchParagraph(idx + 1).catch(() => {});
                        }, 2000);
                    }
                }
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Lỗi khi tạo audio. Vui lòng kiểm tra API Key.');
            
            // Auto-retry if hit rate limit (429)
            if (e.message && e.message.includes('429')) {
                console.log("Hit rate limit. Auto-retrying in 10 seconds...");
                setTimeout(() => {
                    if (playRequestIdRef.current === reqId) {
                        playNextParagraph(idx);
                    }
                }, 10000);
            } else {
                setIsPlaying(false);
            }
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
        } else {
            if (audioRef.current && audioRef.current.src && audioRef.current.src.startsWith('data:')) {
                audioRef.current.play().catch(e => {
                    console.error("Playback failed:", e);
                    playNextParagraph(currentParaIdx);
                });
                setIsPlaying(true);
            } else {
                playNextParagraph(currentParaIdx);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetIdx = parseInt(e.target.value, 10);
        setCurrentParaIdx(targetIdx);
        
        // Instantly highlight target even if paused
        if (!isPlaying && paragraphs[targetIdx] && paragraphs[targetIdx].blocks.length > 0) {
            const firstBlock = paragraphs[targetIdx].blocks[0];
            activeBlockIdxRef.current = firstBlock;
            onPlayingBlocksChange([firstBlock]);
            if (isAutoScrollSync) {
                const element = document.getElementById(`text-block-${firstBlock}`);
                if (element) {
                    const y = element.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
        }
        
        playRequestIdRef.current += 1;
        
        if (audioRef.current) {
            audioRef.current.pause();
        }
        
        if (isPlaying) {
            playNextParagraph(targetIdx);
        }
    };

    const progress = paragraphs.length > 0 ? ((currentParaIdx) / paragraphs.length) * 100 : 0;

    return (
        <div className="px-4 pb-4 pt-2 border-t absolute top-full left-0 w-full shadow-lg max-h-[85vh] overflow-y-auto" style={themeStyles?.bg ? { backgroundColor: themeStyles.bg, borderColor: themeStyles.text + '20' } : { backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
            <div className="max-w-3xl mx-auto space-y-4">
                {/* Engine Selector */}
                <div className="flex gap-2 p-1 rounded-lg bg-black/10 dark:bg-white/10 w-max mx-auto">
                    <button
                        onClick={() => {
                            setEngine('gemini');
                            setModel('gemini-3.1-flash-tts-preview');
                            setVoice('Puck');
                        }}
                        className={`flex-1 py-1.5 px-4 text-xs font-medium rounded-md transition-colors ${engine === 'gemini' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'}`}
                    >
                        Gemini API
                    </button>
                    <button
                        onClick={() => {
                            setEngine('piper');
                            setModel('piper-offline');
                            setVoice('banmai');
                        }}
                        className={`flex-1 py-1.5 px-4 text-xs font-medium rounded-md transition-colors ${engine === 'piper' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'}`}
                    >
                        PiperTTS (Offline)
                    </button>
                </div>

                {engine === 'gemini' ? (
                    <div className="space-y-4 border rounded-xl p-4" style={themeStyles?.bg ? { borderColor: themeStyles.text + '20' } : { borderColor: 'var(--color-border)' }}>
                        {/* API Keys Management */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Key size={16} /> Gemini API Keys
                                </span>
                                <button
                                    onClick={handleCheckKeys}
                                    disabled={isChecking || keys.length === 0}
                                    className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isChecking ? <Loader2 size={12} className="animate-spin" /> : <Settings2 size={12} />}
                                    Kiểm tra Key
                                </button>
                            </div>

                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    placeholder="Nhập API Key (có thể nhập nhiều key cách nhau dấu phẩy)"
                                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-transparent border focus:outline-none focus:border-[var(--color-primary)]"
                                    style={themeStyles?.bg ? { borderColor: themeStyles.text + '40', color: themeStyles.text } : { borderColor: 'var(--color-border)' }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                                />
                                <button
                                    onClick={handleAddKey}
                                    className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium hover:bg-[var(--color-primary)]/90"
                                >
                                    Thêm
                                </button>
                            </div>

                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {keys.map((k, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col text-xs rounded bg-black/5 dark:bg-white/5 mb-1 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        onClick={() => (k.status === 'dead' || k.status === 'rate_limit') && setExpandedKey(expandedKey === k.key ? null : k.key)}
                                        title={(k.status === 'dead' || k.status === 'rate_limit') ? 'Bấm để xem chi tiết lỗi' : ''}
                                    >
                                        <div className="flex items-center justify-between p-1.5">
                                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                {k.status === 'alive' ? <Check size={14} className="text-green-500 shrink-0" /> :
                                                    k.status === 'dead' ? <X size={14} className="text-red-500 shrink-0" /> :
                                                        k.status === 'rate_limit' ? <Volume2 size={14} className="text-orange-500 shrink-0" /> :
                                                            k.status === 'testing' ? <Loader2 size={14} className="text-yellow-500 animate-spin shrink-0" /> :
                                                                <div className="w-3.5 h-3.5 rounded-full bg-gray-400 shrink-0 opacity-50" />}
                                                <span className="truncate opacity-80 font-mono">
                                                    {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 4)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveKey(k.key); }}
                                                className="text-red-500 hover:text-red-600 p-1 shrink-0"
                                                title="Xóa Key"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        {(k.status === 'dead' || k.status === 'rate_limit') && expandedKey === k.key && k.errorMessage && (
                                            <div className="px-2 pb-2 text-[10px] text-red-600 dark:text-red-400 opacity-90 whitespace-pre-wrap border-t border-black/5 dark:border-white/5 pt-1 mt-1">
                                                {k.errorMessage}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {keys.length === 0 && <p className="text-xs text-center opacity-50 py-2">Chưa có API Key nào.</p>}
                            </div>
                        </div>

                        {/* Model & Voice Settings */}
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t" style={themeStyles?.bg ? { borderColor: themeStyles.text + '20' } : { borderColor: 'var(--color-border)' }}>
                            <div>
                                <label className="text-xs opacity-80 mb-1 block">Model</label>
                                <select
                                    value={model}
                                    onChange={(e) => {
                                        setModel(e.target.value);
                                        audioCacheRef.current = {};
                                        cacheVersionRef.current += 1;
                                    }}
                                    className="w-full text-xs px-2 py-1.5 rounded bg-transparent border focus:outline-none"
                                    style={themeStyles?.bg ? { borderColor: themeStyles.text + '40', color: themeStyles.text } : { borderColor: 'var(--color-border)' }}
                                >
                                    <option value="gemini-3.1-flash-tts-preview" className="text-black">Gemini 3.1 Flash TTS (Nhanh)</option>
                                    <option value="gemini-2.5-pro-preview-tts" className="text-black">Gemini 2.5 Pro TTS (Chất lượng)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs opacity-80 mb-1 block">Giọng đọc</label>
                                <select
                                    value={voice}
                                    onChange={(e) => {
                                        setVoice(e.target.value);
                                        audioCacheRef.current = {};
                                        cacheVersionRef.current += 1;
                                    }}
                                    className="w-full text-xs px-2 py-1.5 rounded bg-transparent border focus:outline-none"
                                    style={themeStyles?.bg ? { borderColor: themeStyles.text + '40', color: themeStyles.text } : { borderColor: 'var(--color-border)' }}
                                >
                                    <option value="Puck" className="text-black">Puck (Truyền cảm - Nam)</option>
                                    <option value="Charon" className="text-black">Charon (Trầm ấm - Nam)</option>
                                    <option value="Fenrir" className="text-black">Fenrir (Hào hứng - Nam)</option>
                                    <option value="Orus" className="text-black">Orus (Chững chạc - Nam)</option>
                                    <option value="Zephyr" className="text-black">Zephyr (Tươi sáng - Nam)</option>
                                    <option value="Aoede" className="text-black">Aoede (Nhẹ nhàng - Nữ)</option>
                                    <option value="Kore" className="text-black">Kore (Mạnh mẽ - Nữ)</option>
                                    <option value="Laomedeia" className="text-black">Laomedeia (Sôi nổi - Nữ)</option>
                                    <option value="Callirrhoe" className="text-black">Callirrhoe (Thư giãn - Nữ)</option>
                                    <option value="Umbriel" className="text-black">Umbriel (Ấm áp - Dịu dàng)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm mb-2" style={themeStyles?.bg ? { borderColor: themeStyles.text + '20' } : { borderColor: 'var(--color-border)' }}>
                            <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">✅Lưu ý</p>
                            <p className="opacity-80 text-xs">Để chạy mượt mà và trơn tru, máy cần ít trống ít nhất 1.7GB, quá trình tải giọng đọc có thể tốn vài phút tùy tốc độ mạng.</p>
                        </div>
                        <div>
                            <label className="text-xs opacity-80 mb-1 block">Giọng đọc</label>
                            <select
                                value={voice}
                                onChange={(e) => {
                                    setModel('piper-offline');
                                    setVoice(e.target.value);
                                    audioCacheRef.current = {};
                                    cacheVersionRef.current += 1;
                                }}
                                className="w-full text-xs px-2 py-1.5 rounded bg-transparent border focus:outline-none"
                                style={themeStyles?.bg ? { borderColor: themeStyles.text + '40', color: themeStyles.text } : { borderColor: 'var(--color-border)' }}
                            >
                                <option value="banmai" className="text-black">Ban Mai (Nữ)</option>
                                <option value="calmwoman3688" className="text-black">Calm Woman (Nữ)</option>
                                <option value="chieuthanh" className="text-black">Chiêu Thanh (Nam)</option>
                                <option value="deepman3909" className="text-black">Deep Man (Nam trầm)</option>
                                <option value="finetuning_pretrained_vi" className="text-black">Pretrained (Nữ)</option>
                                <option value="indo_goreng" className="text-black">Indo Goreng (Nam)</option>
                                <option value="john" className="text-black">John (Nam)</option>
                                <option value="lacphi" className="text-black">Lạc Phi (Nam)</option>
                                <option value="maiphuong" className="text-black">Mai Phương (Nữ)</option>
                                <option value="manhdung" className="text-black">Mạnh Dũng (Nam)</option>
                                <option value="mattheo" className="text-black">Mattheo (Nam)</option>
                                <option value="mattheo1" className="text-black">Mattheo 1 (Nam)</option>
                                <option value="minhkhang" className="text-black">Minh Khang (Nam)</option>
                                <option value="minhquang" className="text-black">Minh Quang (Nam)</option>
                                <option value="mytam2" className="text-black">Mỹ Tâm (Nữ)</option>
                                <option value="mytam2794" className="text-black">Mỹ Tâm 2794 (Nữ)</option>
                                <option value="ngochuyen" className="text-black">Ngọc Huyền (Nữ)</option>
                                <option value="ngochuyennew" className="text-black">Ngọc Huyền New (Nữ)</option>
                                <option value="ngocngan3701" className="text-black">Ngọc Ngạn (Nam trầm)</option>
                                <option value="phuongtrang" className="text-black">Phương Trang (Nữ)</option>
                                <option value="taian2" className="text-black">Tài Ân 2 (Nam)</option>
                                <option value="taian4" className="text-black">Tài Ân 4 (Nam)</option>
                                <option value="thanhphuong2" className="text-black">Thanh Phương 2 (Nữ)</option>
                                <option value="thientam" className="text-black">Thiện Tâm (Nam)</option>
                                <option value="tranthanh3870" className="text-black">Trấn Thành (Nam)</option>
                                <option value="vietthao3886" className="text-black">Việt Thảo (Nam)</option>
                                <option value="yannew" className="text-black">Yan New (Nữ)</option>
                            </select>
                        </div>
                        
                        <div className="pt-3 border-t space-y-3" style={themeStyles?.bg ? { borderColor: themeStyles.text + '20' } : { borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-3">
                                <label className="text-xs opacity-80 w-24">Tốc độ đọc:</label>
                                <input 
                                    type="range" min="0.5" max="2.0" step="0.1" 
                                    value={piperLengthScale} 
                                    onChange={(e) => { setPiperLengthScale(parseFloat(e.target.value)); audioCacheRef.current = {}; cacheVersionRef.current += 1; }}
                                    className="flex-1 accent-[var(--color-primary)]" 
                                />
                                <span className="text-xs w-8 text-right font-mono">{piperLengthScale}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs opacity-80 w-24">Độ biến thiên:</label>
                                <input 
                                    type="range" min="0.0" max="1.0" step="0.01" 
                                    value={piperNoiseScale} 
                                    onChange={(e) => { setPiperNoiseScale(parseFloat(e.target.value)); audioCacheRef.current = {}; cacheVersionRef.current += 1; }}
                                    className="flex-1 accent-[var(--color-primary)]" 
                                />
                                <span className="text-xs w-8 text-right font-mono">{piperNoiseScale.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs opacity-80 w-24">Phát âm:</label>
                                <input 
                                    type="range" min="0.0" max="1.0" step="0.01" 
                                    value={piperNoiseW} 
                                    onChange={(e) => { setPiperNoiseW(parseFloat(e.target.value)); audioCacheRef.current = {}; cacheVersionRef.current += 1; }}
                                    className="flex-1 accent-[var(--color-primary)]" 
                                />
                                <span className="text-xs w-8 text-right font-mono">{piperNoiseW.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Player Controls */}
                <div className="p-4 rounded-xl shadow-sm border" style={themeStyles?.bg ? { backgroundColor: themeStyles.bg, borderColor: themeStyles.text + '20' } : { backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    {errorMsg && (
                        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 dark:text-red-400">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={togglePlay}
                            disabled={isLoadingAudio && !isPlaying}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50 shrink-0 transition-transform active:scale-95"
                        >
                            {isLoadingAudio && !isPlaying ? <Loader2 size={24} className="animate-spin" /> :
                                isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs mb-1 opacity-80">
                                <span>Đoạn {paragraphs.length > 0 ? currentParaIdx + 1 : 0} / {paragraphs.length}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={paragraphs.length > 0 ? paragraphs.length - 1 : 0}
                                value={currentParaIdx}
                                onChange={handleSeek}
                                className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--color-primary)] outline-none"
                                style={{
                                    background: `linear-gradient(to right, var(--color-primary) ${progress}%, rgba(128,128,128,0.2) ${progress}%)`
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleResetAudio}
                                title="Làm mới bộ đệm âm thanh"
                                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 text-orange-500"
                            >
                                <RefreshCw size={18} />
                            </button>
                            <button
                                onClick={stopAudio}
                                title="Dừng đọc"
                                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                            >
                                <Square size={18} fill="currentColor" />
                            </button>
                            {onLockScreen && (
                                <button
                                    onClick={onLockScreen}
                                    title="Khóa màn hình (Chế độ bỏ túi)"
                                    className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 text-blue-500"
                                >
                                    <Lock size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 mt-3 flex-wrap gap-3" style={themeStyles?.bg ? { borderColor: themeStyles.text + '10' } : { borderColor: 'var(--color-border)' }}>
                        <label className="flex items-center gap-2 cursor-pointer text-xs opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={isAutoScrollSync}
                                onChange={(e) => setIsAutoScrollSync(e.target.checked)}
                                className="rounded border-gray-400 accent-[var(--color-primary)]"
                            />
                            Tự cuộn chữ
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={isAutoNextChapter}
                                onChange={(e) => setIsAutoNextChapter(e.target.checked)}
                                className="rounded border-gray-400 accent-[var(--color-primary)]"
                            />
                            Tự qua chương
                        </label>

                        <div className="flex items-center gap-2 flex-1 min-w-[200px] text-xs opacity-80">
                            <span className="whitespace-nowrap">Đồng bộ Highlight:</span>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={animSpeed}
                                onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
                                className="flex-1 accent-[var(--color-primary)]"
                                title="Giảm nếu màu chạy nhanh hơn tiếng, Tăng nếu màu chạy chậm hơn tiếng"
                            />
                            <span className="w-8 text-right font-mono">{Math.round(animSpeed * 100)}%</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs opacity-50 whitespace-nowrap hidden sm:flex">
                            <Volume2 size={14} /> {engine === 'gemini' ? 'Audio API' : 'WASM Engine'}
                        </div>
                    </div>
                </div>
            </div>

            <audio
                ref={audioRef}
                className="hidden"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
            />
        </div>
    );
};
