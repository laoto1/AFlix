const fs = require('fs');

function createWavHeader(dataLength, sampleRate = 24000, numChannels = 1) {
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // format chunk length
    buffer.writeUInt16LE(1, 20); // sample format (PCM)
    buffer.writeUInt16LE(numChannels, 22); // channels
    buffer.writeUInt32LE(sampleRate, 24); // sample rate
    buffer.writeUInt32LE(sampleRate * numChannels * 2, 28); // byte rate
    buffer.writeUInt16LE(numChannels * 2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    return buffer;
}

const key = "AIzaSyCvAfYbbcjKdc2_YTLMQKHLkJkfpZRqF4Q";
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Đọc: Xin chào` }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
        }
    })
}).then(r => r.json()).then(d => {
    const parts = d.candidates[0].content.parts;
    const audio = parts.find(p => p.inlineData);
    if (audio) {
        const pcmBuffer = Buffer.from(audio.inlineData.data, 'base64');
        const wavHeader = createWavHeader(pcmBuffer.length);
        const finalWav = Buffer.concat([wavHeader, pcmBuffer]);
        fs.writeFileSync('test_audio.wav', finalWav);
        console.log('Saved to test_audio.wav, length:', finalWav.length);
    }
}).catch(console.error);
