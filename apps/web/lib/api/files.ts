import { apiClient } from './client'

export interface UploadedFile {
    id: string
    reference: string
    filename: string
    originalName: string
    size: number
    mimeType: string
    url: string
    createdAt: string
}

/**
 * Upload a single file with progress tracking
 */
export async function uploadFile(
    file: File,
    onProgress?: (progress: number) => void
): Promise<UploadedFile> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<UploadedFile>('/upload/file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onProgress(progress)
            }
        },
    })

    return response.data
}

/**
 * Upload multiple files with real progress tracking
 */
export async function uploadFiles(
    files: File[],
    onProgress?: (progress: number) => void
): Promise<UploadedFile[]> {
    const formData = new FormData()
    files.forEach((file) => {
        formData.append('files', file)
    })

    const response = await apiClient.post<UploadedFile[]>('/upload/files', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onProgress(progress)
            }
        },
    })

    return response.data
}

/**
 * Get file by ID
 */
export async function getFile(id: string): Promise<UploadedFile> {
    const response = await apiClient.get<UploadedFile>(`/upload/${id}`)
    return response.data
}

/**
 * Get current user's files
 */
export async function getMyFiles(): Promise<UploadedFile[]> {
    const response = await apiClient.get<UploadedFile[]>('/upload/my-files')
    return response.data
}

/**
 * Delete file by ID
 */
export async function deleteFile(id: string): Promise<void> {
    await apiClient.delete(`/upload/${id}`)
}
