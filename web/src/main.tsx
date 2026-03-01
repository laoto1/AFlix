import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import axios from 'axios'

// ── Multi-Worker Load Balancer ──
class WorkerPool {
    workers: string[];
    currentIndex: number = 0;
    
    constructor() {
        const workersStr = import.meta.env.VITE_CLOUDFLARE_WORKERS || '';
        this.workers = workersStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    
    getWorker(): string {
        if (this.workers.length === 0) return '';
        const worker = this.workers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.workers.length;
        return worker;
    }
}

const pool = new WorkerPool();

axios.interceptors.request.use((config) => {
    if (config.url?.startsWith('/api/')) {
        const workerUrl = pool.getWorker();
        if (workerUrl) {
           config.baseURL = workerUrl;
        }
    }
    return config;
});
// ────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
