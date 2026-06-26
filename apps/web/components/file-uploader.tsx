'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, FileText, Video, Image as ImageIcon, Check, XCircle, RefreshCw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileWithPreview extends File {
    preview?: string
    uploadProgress?: number
    uploadStatus?: 'pending' | 'uploading' | 'success' | 'error'
    error?: string
}

interface FileUploaderProps {
    onUpload?: (files: File[], onProgress?: (progress: number) => void) => Promise<any[]>
    onFileUploaded?: (file: any) => void
    maxSize?: number // in MB
    maxFiles?: number
    acceptedFileTypes?: {
        [key: string]: string[]
    }
    className?: string
    autoUpload?: boolean
}

export function FileUploader({
    onUpload,
    onFileUploaded,
    maxSize = 10,
    maxFiles = 5,
    acceptedFileTypes = {
        'image/*': ['.webp', '.webp', '.webp', '.gif'],
        'application/pdf': ['.pdf'],
        'video/*': ['.mp4', '.webm', '.mov'],
    },
    className,
    autoUpload = false,
}: FileUploaderProps) {
    const [files, setFiles] = useState<FileWithPreview[]>([])
    const [uploading, setUploading] = useState(false)
    const [overallProgress, setOverallProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: any[]) => {
            setError(null)

            if (rejectedFiles.length > 0) {
                const errors = rejectedFiles.map((file) => {
                    if (file.errors[0]?.code === 'file-too-large') {
                        return `${file.file.name} is too large (max ${maxSize}MB)`
                    }
                    if (file.errors[0]?.code === 'file-invalid-type') {
                        return `${file.file.name} has invalid type`
                    }
                    return `${file.file.name} was rejected`
                })
                setError(errors.join(', '))
                return
            }

            if (files.length + acceptedFiles.length > maxFiles) {
                setError(`Maximum ${maxFiles} files allowed`)
                return
            }

            const filesWithPreviews = acceptedFiles.map((file) => {
                const fileWithPreview = file as FileWithPreview
                if (file.type.startsWith('image/')) {
                    fileWithPreview.preview = URL.createObjectURL(file)
                }
                fileWithPreview.uploadProgress = 0
                fileWithPreview.uploadStatus = 'pending'
                return fileWithPreview
            })

            setFiles((prev) => [...prev, ...filesWithPreviews])

            if (autoUpload && filesWithPreviews.length > 0) {
                setTimeout(() => handleUpload(filesWithPreviews), 100)
            }
        },
        [files, maxFiles, maxSize, autoUpload]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedFileTypes,
        maxSize: maxSize * 1024 * 1024,
        maxFiles,
        disabled: uploading,
    })

    const removeFile = (index: number) => {
        setFiles((prev) => {
            const newFiles = [...prev]
            const file = newFiles[index]
            if (file && file.preview) {
                URL.revokeObjectURL(file.preview)
            }
            newFiles.splice(index, 1)
            return newFiles
        })
    }

    const retryFile = async (index: number) => {
        const fileToRetry = files[index]
        if (!fileToRetry) return

        setFiles((prev) => {
            const newFiles = [...prev]
            if (newFiles[index]) {
                newFiles[index] = {
                    ...fileToRetry,
                    lastModified: fileToRetry.lastModified || Date.now(),
                    uploadStatus: 'pending',
                    uploadProgress: 0,
                    error: undefined
                }
            }
            return newFiles
        })
        await handleUpload([fileToRetry], index)
    }

    const handleUpload = async (filesToUpload?: FileWithPreview[], startIndex?: number) => {
        const targetFiles = filesToUpload || files.filter(f => f.uploadStatus !== 'success')

        if (targetFiles.length === 0) {
            setError('Please select files to upload')
            return
        }

        setUploading(true)
        setOverallProgress(0)
        setError(null)
        abortControllerRef.current = new AbortController()

        try {
            if (onUpload) {
                const progressCallback = (progress: number) => {
                    setOverallProgress(progress)
                }

                const results = await onUpload(targetFiles, progressCallback)

                // Update file statuses
                setFiles((prev) => {
                    const newFiles = [...prev]
                    results.forEach((result, idx) => {
                        const targetFile = targetFiles[idx]
                        if (!targetFile) return

                        const fileIndex = startIndex !== undefined ? startIndex :
                            newFiles.findIndex(f => f.name === targetFile.name)
                        
                        if (fileIndex !== -1 && newFiles[fileIndex]) {
                            newFiles[fileIndex].uploadStatus = 'success'
                            newFiles[fileIndex].uploadProgress = 100
                        }
                    })
                    return newFiles
                })

                // Notify parent
                if (onFileUploaded && results) {
                    results.forEach(result => onFileUploaded(result))
                }

                setOverallProgress(100)

                // Clear after success
                setTimeout(() => {
                    setFiles([])
                    setOverallProgress(0)
                    setUploading(false)
                }, 1500)
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Upload failed'
            setError(errorMessage)

            // Mark files as error
            setFiles((prev) => {
                const newFiles = [...prev]
                targetFiles.forEach((file) => {
                    const fileIndex = newFiles.findIndex(f => f.name === file.name)
                    if (fileIndex !== -1 && newFiles[fileIndex]) {
                        newFiles[fileIndex].uploadStatus = 'error'
                        newFiles[fileIndex].error = errorMessage
                    }
                })
                return newFiles
            })
        } finally {
            setUploading(false)
            abortControllerRef.current = null
        }
    }

    const cancelUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            setUploading(false)
            setError('Upload cancelled')
        }
    }

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return ImageIcon
        if (file.type.startsWith('video/')) return Video
        if (file.type === 'application/pdf') return FileText
        return File
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    const allUploaded = files.length > 0 && files.every(f => f.uploadStatus === 'success')
    const hasErrors = files.some(f => f.uploadStatus === 'error')

    return (
        <div className={cn('w-full space-y-4', className)}>
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
                    isDragActive
                        ? 'border-primary bg-primary/10 scale-[1.02]'
                        : 'border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    uploading && 'pointer-events-none opacity-50'
                )}
            >
                <input {...getInputProps()} />
                <Upload className={cn(
                    "w-12 h-12 mx-auto mb-4 transition-colors",
                    isDragActive ? "text-primary" : "text-gray-400"
                )} />
                {isDragActive ? (
                    <p className="text-lg font-medium text-primary">Drop files here...</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            Drag & drop files here, or click to select
                        </p>
                        <p className="text-sm text-gray-500">
                            Max {maxSize}MB per file • Up to {maxFiles} files
                        </p>
                        <p className="text-xs text-gray-400">
                            Accepted: {Object.values(acceptedFileTypes).flat().join(', ')}
                        </p>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* File previews */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Selected Files ({files.length})
                    </h4>
                    <div className="space-y-2">
                        {files.map((file, index) => {
                            const FileIconComponent = getFileIcon(file)
                            const status = file.uploadStatus || 'pending'

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg transition-all",
                                        status === 'success' && "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
                                        status === 'error' && "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
                                        status === 'uploading' && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
                                        status === 'pending' && "bg-gray-50 dark:bg-gray-800"
                                    )}
                                >
                                    {/* Preview */}
                                    {file.preview ? (
                                        <img
                                            src={file.preview}
                                            alt={file.name}
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded">
                                            <FileIconComponent className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                        </div>
                                    )}

                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                        {file.error && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{file.error}</p>
                                        )}
                                    </div>

                                    {/* Status indicator */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {status === 'success' && (
                                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        )}
                                        {status === 'error' && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => retryFile(index)}
                                                className="h-8 w-8"
                                            >
                                                <RefreshCw className="w-4 h-4 text-red-600" />
                                            </Button>
                                        )}
                                        {status === 'pending' && !uploading && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeFile(index)}
                                                className="h-8 w-8"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Upload progress */}
            {uploading && overallProgress < 100 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Uploading...</span>
                        <span className="font-medium text-primary">{Math.round(overallProgress)}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelUpload}
                        className="w-full"
                    >
                        Cancel Upload
                    </Button>
                </div>
            )}

            {/* Upload button */}
            {files.length > 0 && !uploading && !allUploaded && !autoUpload && (
                <Button onClick={() => handleUpload()} className="w-full" size="lg">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {files.filter(f => f.uploadStatus !== 'success').length} {files.length === 1 ? 'File' : 'Files'}
                </Button>
            )}

            {/* Success message */}
            {allUploaded && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        All files uploaded successfully!
                    </p>
                </div>
            )}

            {/* Retry all button */}
            {hasErrors && !uploading && (
                <Button
                    onClick={() => handleUpload(files.filter(f => f.uploadStatus === 'error'))}
                    variant="outline"
                    className="w-full"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Failed Uploads
                </Button>
            )}
        </div>
    )
}
