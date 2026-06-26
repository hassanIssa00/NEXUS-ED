'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
    id: string;
    file: File;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    preview?: string;
}

interface FileUploadProps {
    onFilesUploaded?: (files: File[]) => void;
    maxFiles?: number;
    maxSize?: number;
    accept?: Record<string, string[]>;
    title?: string;
    description?: string;
}

export function FileUpload({
    onFilesUploaded,
    maxFiles = 5,
    maxSize = 10485760, // 10MB
    accept = {
        'image/*': ['.webp', '.webp', '.webp', '.gif'],
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc', '.docx'],
        'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
        'text/*': ['.txt']
    },
    title = 'Upload Files',
    description = 'Drag and drop files here or click to browse'
}: FileUploadProps) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            progress: 0,
            status: 'uploading' as const,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);

        // Simulate upload progress
        newFiles.forEach(uploadedFile => {
            simulateUpload(uploadedFile.id);
        });

        if (onFilesUploaded) {
            onFilesUploaded(acceptedFiles);
        }
    }, [onFilesUploaded]);

    const simulateUpload = (fileId: string) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.id === fileId ? { ...f, progress: 100, status: 'success' } : f
                    )
                );
            } else {
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.id === fileId ? { ...f, progress } : f
                    )
                );
            }
        }, 200);
    };

    const removeFile = (fileId: string) => {
        setUploadedFiles(prev => {
            const file = prev.find(f => f.id === fileId);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter(f => f.id !== fileId);
        });
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles,
        maxSize,
        accept
    });

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragActive
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
          `}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3">
                        <div className={`
              p-4 rounded-full 
              ${isDragActive ? 'bg-primary-500' : 'bg-gray-100 dark:bg-gray-800'}
            `}>
                            <Upload className={`w-8 h-8 ${isDragActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                or click to browse from your computer
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            Max {maxFiles} files, up to {formatFileSize(maxSize)} each
                        </p>
                    </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Uploaded Files ({uploadedFiles.length})</h4>
                        <AnimatePresence>
                            {uploadedFiles.map((uploadedFile) => (
                                <motion.div
                                    key={uploadedFile.id}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                    {/* Preview or Icon */}
                                    {uploadedFile.preview ? (
                                        <img
                                            src={uploadedFile.preview}
                                            alt={uploadedFile.file.name}
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                            <File className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                        </div>
                                    )}

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {uploadedFile.file.name}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {formatFileSize(uploadedFile.file.size)}
                                        </p>

                                        {/* Progress Bar */}
                                        {uploadedFile.status === 'uploading' && (
                                            <Progress value={uploadedFile.progress} className="mt-2" />
                                        )}
                                    </div>

                                    {/* Status Icon */}
                                    {uploadedFile.status === 'success' && (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    )}
                                    {uploadedFile.status === 'error' && (
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    )}

                                    {/* Remove Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(uploadedFile.id)}
                                        className="hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Actions */}
                {uploadedFiles.length > 0 && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            onClick={() => setUploadedFiles([])}
                            variant="outline"
                            className="flex-1"
                        >
                            Clear All
                        </Button>
                        <Button
                            disabled={uploadedFiles.some(f => f.status === 'uploading')}
                            className="flex-1"
                        >
                            Submit Files
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
