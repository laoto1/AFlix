declare module '../lib/piper-tts-web.js' {
    export class TtsSession {
        constructor(params: {
            voiceId: string;
            progressCallback?: (e: any) => void;
            logger?: (e: string) => void;
        });
        predict(text: string): Promise<any>;
    }
}
