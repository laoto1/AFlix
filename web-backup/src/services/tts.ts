export interface GeminiKey {
    key: string;
    status: 'idle' | 'testing' | 'alive' | 'dead' | 'rate_limit';
    errorMessage?: string;
}

export interface PiperOptions {
    lengthScale: number; // 0.5 to 2.0
    noiseScale: number; // 0.0 to 1.0
    noiseW: number; // 0.0 to 1.0
}

// @ts-ignore
import { TtsSession } from '../lib/piper-tts-web.js';

let globalPiperSession: any = null;

// --- INDEXED DB CACHE FOR TTS AUDIO ---
const DB_NAME = 'FlixTTSCacheDB';
const STORE_NAME = 'audioChunks';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getCachedAudio = async (hashKey: string): Promise<string | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(hashKey);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return null;
    }
};

const setCachedAudio = async (hashKey: string, base64Audio: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(base64Audio, hashKey);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {}
};

export const clearTTSCache = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to clear TTS cache", e);
    }
};

const getTTSCacheKey = async (text: string, voice: string, model: string, optionsStr: string = ''): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(text + voice + model + optionsStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
// --------------------------------------

export const testGeminiKey = async (key: string, model: string): Promise<{status: 'alive' | 'dead' | 'rate_limit', message?: string}> => {
    try {
        const baseUrl = key.startsWith('gg-gcli-') ? 'https://gcli.ggchan.dev' : 'https://generativelanguage.googleapis.com';
        const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent?key=${key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Xin chào' }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                }
            })
        });
        
        if (response.ok) {
            return { status: 'alive' };
        } else if (response.status === 429) {
            return { status: 'rate_limit', message: 'Rate Limit (429): Quá giới hạn truy cập. \nGiải pháp: Chờ khoảng 1-2 phút rồi sử dụng lại.' };
        } else if (response.status === 400 || response.status === 403 || response.status === 404) {
            let msg = 'Lỗi không xác định.';
            try {
                const errJson = await response.json();
                msg = errJson.error?.message || msg;
            } catch (e) {}
            return { status: 'dead', message: `API Error (${response.status}): ${msg}\nGiải pháp: Kiểm tra lại API Key xem có copy dư khoảng trắng không, hoặc Key đã bị vô hiệu hóa.` };
        }
        return { status: 'dead', message: `Lỗi Server (${response.status}).` };
    } catch (e: any) {
        return { status: 'dead', message: e.message || 'Lỗi kết nối mạng.' };
    }
};

const pcmBase64ToWavBase64 = (pcmBase64: string, sampleRate = 24000, numChannels = 1): string => {
    const binaryStr = atob(pcmBase64);
    const pcmLength = binaryStr.length;
    const wavBuffer = new ArrayBuffer(44 + pcmLength);
    const view = new DataView(wavBuffer);
    
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmLength, true);
    writeString(view, 8, 'WAVE');
    
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    
    writeString(view, 36, 'data');
    view.setUint32(40, pcmLength, true);
    
    const wavBytes = new Uint8Array(wavBuffer);
    for (let i = 0; i < pcmLength; i++) {
        wavBytes[44 + i] = binaryStr.charCodeAt(i);
    }
    
    let base64 = '';
    const chunk = 32768;
    for (let i = 0; i < wavBytes.length; i += chunk) {
        base64 += String.fromCharCode.apply(null, wavBytes.subarray(i, i + chunk) as unknown as number[]);
    }
    return btoa(base64);
};

export const generateGeminiAudio = async (text: string, keys: GeminiKey[], model: string = 'gemini-3.1-flash-tts-preview', voice: string = 'Puck', isRetry = false, piperOptions?: PiperOptions): Promise<{ audioBase64: string, usedKey: string } | null> => {
    // 1. First check the local IndexedDB cache
    const optionsStr = piperOptions ? `${piperOptions.lengthScale}_${piperOptions.noiseScale}_${piperOptions.noiseW}` : '';
    const cacheKey = await getTTSCacheKey(text, voice, model, optionsStr);
    const cachedAudio = await getCachedAudio(cacheKey);
    if (cachedAudio) {
        console.log('[TTS] Loaded audio from local cache (0 API Requests used)');
        return { audioBase64: cachedAudio, usedKey: 'CACHE' };
    }

    if (model === 'piper-offline') {
        try {
            if (!globalPiperSession || globalPiperSession.voiceId !== voice) {
                console.log(`Initializing Piper TTS Session with voice: ${voice}`);
                
                // Force clear the internal singleton instance to reload the new ONNX model
                if (globalPiperSession) {
                    try {
                        const { TtsSession } = await import('../lib/piper-tts-web.js');
                        if (TtsSession && (TtsSession as any)._instance) {
                            (TtsSession as any)._instance = null;
                        }
                    } catch (e) {}
                }

                globalPiperSession = await TtsSession.create({ voiceId: voice });
            }
            
            console.log(`Synthesizing with Piper (WASM)... text length: ${text.length}`);
            const blob = await globalPiperSession.predict(text, piperOptions || {});
            
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64data = (reader.result as string).split(',')[1];
                    // Cache the result
                    await setCachedAudio(cacheKey, base64data);
                    resolve({ audioBase64: base64data, usedKey: 'PIPER' });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err: any) {
            console.error("Piper TTS failed:", err);
            globalPiperSession = null; // Reset session on error
            
            if (err.message && (err.message.includes('protobuf') || err.message.includes('HTTP Error'))) {
                // Cache might be corrupted or download failed. Clear it!
                try {
                    // @ts-ignore
                    const piper = await import('../lib/piper-tts-web.js');
                    await piper.remove(voice);
                } catch (e) {}
                throw new Error('Tải giọng đọc thất bại hoặc dữ liệu bị lỗi do nghẽn mạng. Hệ thống đã tự dọn dẹp, VUI LÒNG NHẤN LẠI NÚT PLAY ĐỂ TẢI LẠI!');
            }
            throw new Error(`Lỗi PiperTTS: ${err.message}`);
        }
    }

    // Allow idle, alive, and rate_limit keys to be tried. Only exclude permanently dead keys.
    const aliveKeys = keys.filter(k => k.status !== 'dead');
    if (aliveKeys.length === 0) {
        throw new Error('All Gemini keys are dead or none available.');
    }

    // Shuffle keys for load balancing (Round-Robin / Random distribution)
    const shuffledKeys = [...aliveKeys].sort(() => Math.random() - 0.5);

    let hitRateLimit = false;

    for (const k of shuffledKeys) {
        try {
            const baseUrl = k.key.startsWith('gg-gcli-') ? 'https://gcli.ggchan.dev' : 'https://generativelanguage.googleapis.com';
            const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent?key=${k.key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: voice // "Puck", "Aoede", "Charon", "Fenrir", "Kore"
                                }
                            }
                        }
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
                if (audioPart) {
                    const wavBase64 = pcmBase64ToWavBase64(audioPart.inlineData.data);
                    // Save to local cache
                    await setCachedAudio(cacheKey, wavBase64);
                    return { audioBase64: wavBase64, usedKey: k.key };
                } else {
                    console.warn(`[TTS] No audio part in response for key ending in ${k.key.slice(-4)}:`, JSON.stringify(data));
                }
            } else if (response.status === 429) {
                console.warn(`[TTS] Rate limited (429) for key ending in ${k.key.slice(-4)}`);
                hitRateLimit = true;
                continue;
            } else {
                const errBody = await response.text();
                console.error(`[TTS] API Error (Status ${response.status}) for key ending in ${k.key.slice(-4)}:`, errBody);
                continue;
            }
        } catch (e) {
            console.error(`[TTS] Exception for key ending in ${k.key.slice(-4)}:`, e);
            continue;
        }
    }
    
    // Auto-retry once if we hit rate limits on all keys
    if (hitRateLimit && !isRetry) {
        console.warn('[TTS] All keys rate limited. Waiting 3 seconds and retrying once...');
        await new Promise(r => setTimeout(r, 3000));
        return generateGeminiAudio(text, keys, model, voice, true);
    }
    
    throw new Error('All keys failed to generate audio for this chunk. Vui lòng bật F12 (Console) để xem chi tiết lỗi API.');
};
