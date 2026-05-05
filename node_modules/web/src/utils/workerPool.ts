import axios, { AxiosError } from 'axios';

// ── Multi-Worker Load Balancer with Failover ──
// Distributes API requests evenly across Cloudflare Workers via round-robin.
// When a worker returns 429 (rate limited) or 5xx (server error), it is marked
// as "dead" and skipped for 5 minutes. Failed requests are automatically retried
// on the next healthy worker.

class WorkerPool {
    workers: string[];
    currentIndex: number = 0;
    deadWorkers: Map<string, number> = new Map(); // worker → timestamp when marked dead
    readonly HEAL_TIME = 5 * 60 * 1000; // 5 minutes before retrying a dead worker

    constructor() {
        const workersStr = 'https://share.laoto.workers.dev';
        this.workers = workersStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    getWorker(): string {
        if (this.workers.length === 0) return '';

        // Try to find a non-dead worker via round-robin
        const startIdx = this.currentIndex;
        do {
            const worker = this.workers[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.workers.length;

            const deadTime = this.deadWorkers.get(worker);
            if (!deadTime || Date.now() - deadTime > this.HEAL_TIME) {
                // Worker is alive or healed
                if (deadTime) this.deadWorkers.delete(worker);
                return worker;
            }
        } while (this.currentIndex !== startIdx);

        // All workers dead — reset and try again
        this.deadWorkers.clear();
        const worker = this.workers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.workers.length;
        return worker;
    }

    markDead(worker: string) {
        this.deadWorkers.set(worker, Date.now());
        const alive = this.workers.length - this.deadWorkers.size;
        console.warn(`[WorkerPool] ${worker} marked dead (429/5xx). Alive: ${alive}/${this.workers.length}`);
    }

    get aliveCount(): number {
        let count = 0;
        for (const w of this.workers) {
            const deadTime = this.deadWorkers.get(w);
            if (!deadTime || Date.now() - deadTime > this.HEAL_TIME) count++;
        }
        return count;
    }
}

export const workerPool = new WorkerPool();

// ── Axios Request Interceptor ──
// Attaches the Worker base URL and stamps which worker was used (for failover)
axios.interceptors.request.use((config) => {
    const workerUrl = workerPool.getWorker();

    if (workerUrl) {
        if (config.url?.startsWith('/api/')) {
            config.baseURL = workerUrl;
        } else if (config.baseURL?.startsWith('/api/')) {
            config.baseURL = workerUrl + config.baseURL;
        }
    }

    // Stamp the worker URL and retry count on the config for the response interceptor
    (config as any).__workerUrl = workerUrl;
    (config as any).__retryCount = (config as any).__retryCount || 0;

    return config;
});

// ── Axios Response Interceptor ──
// On 429 or 5xx, mark the worker as dead and retry on the next healthy worker.
axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as any;
        if (!config) return Promise.reject(error);

        const status = error.response?.status;
        const usedWorker = config.__workerUrl;
        const retryCount = config.__retryCount || 0;
        const maxRetries = Math.max(workerPool.workers.length - 1, 0);

        // Only retry on rate limit or server errors, and only if we have more workers to try
        if (usedWorker && (status === 429 || (status && status >= 500)) && retryCount < maxRetries) {
            workerPool.markDead(usedWorker);

            // Retry with new worker
            config.__retryCount = retryCount + 1;
            // Clear baseURL so the request interceptor picks a new worker
            delete config.baseURL;
            return axios(config);
        }

        return Promise.reject(error);
    }
);
