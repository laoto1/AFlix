const key = "AIzaSyCvAfYbbcjKdc2_YTLMQKHLkJkfpZRqF4Q";
const fetchTTS = async () => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: "Hãy đọc truyền cảm" }] },
                    { role: 'model', parts: [{ text: "Vâng, tôi sẽ đọc truyền cảm." }] },
                    { role: 'user', parts: [{ text: "Xin chào" }] }
                ],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                }
            })
        });
        const data = await response.text();
        console.log(`Status: ${response.status}`, data.slice(0, 200));
    } catch(e) { console.error(e); }
};
fetchTTS();
