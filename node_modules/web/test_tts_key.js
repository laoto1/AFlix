const key = "AIzaSyAWHhXGXDvwLzJASAmwIXa7Bb0IxKGS0lE";
const fetchTTS = async (contents) => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    responseModalities: ["TEXT", "AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                }
            })
        });
        const data = await response.text();
        console.log(`Status: ${response.status}`, data.substring(0, 500));
    } catch(e) { console.error(e); }
};

fetchTTS([
    { role: 'user', parts: [{ text: "Trả lời 'OK' bằng chữ. Sau đó dùng giọng truyền cảm đọc đoạn: Trời hôm nay đẹp." }] }
]);
