const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const getAccessToken = () =>
    localStorage.getItem('access_token') || localStorage.getItem('token');

export interface UploadResponse {
    id: string;
    reference: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    url: string;
}

class UploadServiceClass {
    async uploadFile(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<UploadResponse> {
        const token = getAccessToken();
        const formData = new FormData();
        formData.append('file', file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Progress tracking
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const progress = (e.loaded / e.total) * 100;
                    onProgress(Math.round(progress));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${API_BASE_URL}/upload/file`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }

    async uploadFiles(
        files: File[],
        onProgress?: (progress: number) => void
    ): Promise<UploadResponse[]> {
        const token = getAccessToken();
        const formData = new FormData();

        files.forEach((file) => {
            formData.append('files', file);
        });

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const progress = (e.loaded / e.total) * 100;
                    onProgress(Math.round(progress));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${API_BASE_URL}/upload/files`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }

    async deleteFile(filename: string): Promise<void> {
        const token = getAccessToken();

        const response = await fetch(`${API_BASE_URL}/upload/${filename}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }

    getFileUrl(filename: string): string {
        return `${API_BASE_URL.replace(/\/api$/, '')}/uploads/${filename}`;
    }
}

export const uploadService = new UploadServiceClass();
