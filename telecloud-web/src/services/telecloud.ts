const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getHeaders() {
    const adminKey = localStorage.getItem('telecloud_admin_key');
    const headers: Record<string, string> = {};
    if (adminKey) {
        headers['x-admin-key'] = adminKey;
    }
    return headers;
}

export const TelecloudService = {
    async getFiles() {
        const response = await fetch(`${API_BASE_URL}/api/telecloud/files`, { headers: getHeaders() });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            throw new Error('Failed to fetch files');
        }
        const data = await response.json();
        return data.files;
    },

    async verifyAuth(key: string) {
        const response = await fetch(`${API_BASE_URL}/api/telecloud/files`, { 
            headers: { 'x-admin-key': key } 
        });
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        return true;
    },

    async uploadChunk(chunk: Blob): Promise<string> {
        const formData = new FormData();
        formData.append('chunk', chunk);

        const response = await fetch(`${API_BASE_URL}/api/telecloud/upload_chunk`, {
            method: 'POST',
            body: formData,
            headers: getHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to upload chunk');
        const data = await response.json();
        return data.fileId;
    },

    async finalizeUpload(filename: string, size: number, mimeType: string, chunks: string[]): Promise<string> {
        const headers = {
            ...getHeaders(),
            'Content-Type': 'application/json'
        };

        const response = await fetch(`${API_BASE_URL}/api/telecloud/finalize`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ filename, size, mimeType, chunks })
        });
        
        if (!response.ok) throw new Error('Failed to finalize upload');
        const data = await response.json();
        return data.id;
    },
    
    async deleteFile(id: string) {
        const response = await fetch(`${API_BASE_URL}/api/telecloud/files/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete file');
        return await response.json();
    },

    getDownloadUrl(id: string) {
        return `${API_BASE_URL}/api/telecloud/download/${id}`;
    }
};
