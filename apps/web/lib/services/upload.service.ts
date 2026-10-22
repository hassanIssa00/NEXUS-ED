import { getApiUrl, getStoredAccessToken } from '../api/endpoints';
const getAccessToken = getStoredAccessToken;

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
    async uploadProfileAvatar(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        return this.uploadStudentAvatar(file, onProgress)
    }

    async uploadStudentAvatar(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            throw new Error('اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 5 ميجابايت.')
        }

        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
            bitmap.close()
            throw new Error('تعذر تجهيز صورة الطالب.')
        }
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close()

        const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78))
        if (!compressed || compressed.size > 512 * 1024) {
            throw new Error('تعذر ضغط الصورة للحجم الآمن. اختر صورة أصغر أو أقل دقة.')
        }

        const token = getAccessToken()
        const formData = new FormData()
        formData.append('file', new File([compressed], 'student-avatar.jpg', { type: 'image/jpeg' }))

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
            })
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve()
                    return
                }
                try {
                    const response = JSON.parse(xhr.responseText)
                    const message = Array.isArray(response.message) ? response.message.join('، ') : response.message
                    reject(new Error(message || 'تعذر حفظ صورة الطالب.'))
                } catch {
                    reject(new Error('تعذر حفظ صورة الطالب.'))
                }
            })
            xhr.addEventListener('error', () => reject(new Error('تعذر الاتصال بخادم المنصة لحفظ الصورة.')))
            xhr.open('PATCH', getApiUrl('/upload/me/avatar'))
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
            xhr.send(formData)
        })
    }

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

            xhr.open('POST', getApiUrl('/upload/file'));
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

            xhr.open('POST', getApiUrl('/upload/files'));
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    }

    async deleteFile(filename: string): Promise<void> {
        const token = getAccessToken();

        const response = await fetch(getApiUrl(`/upload/${encodeURIComponent(filename)}`), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }

}

export const uploadService = new UploadServiceClass();
