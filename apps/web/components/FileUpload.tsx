'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { uploadService, UploadResponse } from '@/lib/services/upload.service';

interface FileUploadProps {
    accept?: string;
    maxSize?: number; // in MB
    maxFiles?: number;
    onUploadComplete: (files: UploadResponse[]) => void;
    multiple?: boolean;
}

export default function FileUpload({
    accept = 'image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx',
    maxSize = 100,
    maxFiles = 10,
    onUploadComplete,
    multiple = true,
}: FileUploadProps) {
    const isEnglish = useLocale() === 'en';
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<UploadResponse[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<{ [key: string]: number }>({});
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).slice(0, maxFiles);
            setFiles(selectedFiles);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files) {
            const droppedFiles = Array.from(e.dataTransfer.files).slice(0, maxFiles);
            setFiles(droppedFiles);
        }
    }, [maxFiles]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const uploaded: UploadResponse[] = [];

        try {
            for (const file of files) {
                const result = await uploadService.uploadFile(file, (prog) => {
                    setProgress((prev) => ({ ...prev, [file.name]: prog }));
                });
                uploaded.push(result);
            }

            setUploadedFiles(uploaded);
            onUploadComplete(uploaded);
            setFiles([]);
            setProgress({});
        } catch (error) {
            console.error('Upload failed:', error);
            alert(isEnglish ? 'File upload failed.' : 'فشل رفع الملفات');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="w-full">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
            >
                <div className="text-4xl mb-4">📁</div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {isEnglish ? 'Drag files here or click to browse' : 'اسحب الملفات هنا أو اضغط للاختيار'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    {isEnglish ? `Maximum: ${maxFiles} files, ${maxSize} MB each` : `الحد الأقصى: ${maxFiles} ملفات، ${maxSize} MB لكل ملف`}
                </p>
                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-block"
                >
                    {isEnglish ? 'Choose files' : 'اختر ملفات'}
                </label>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">
                        {isEnglish ? `Selected files (${files.length}):` : `ملفات محددة (${files.length}):`}
                    </h4>
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800 dark:text-white">
                                            {file.name}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            ({formatFileSize(file.size)})
                                        </span>
                                    </div>
                                    {uploading && progress[file.name] !== undefined && (
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${progress[file.name]}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {progress[file.name]}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {!uploading && (
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-red-600 hover:text-red-800 ml-2"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={uploadFiles}
                        disabled={uploading}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (isEnglish ? 'Uploading…' : 'جاري الرفع...') : (isEnglish ? 'Upload files' : 'رفع الملفات')}
                    </button>
                </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-green-600">
                        {isEnglish ? 'Uploaded successfully ✓' : 'تم الرفع بنجاح ✓'}
                    </h4>
                    <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                            <div
                                key={index}
                                className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm"
                            >
                                <span className="text-gray-800 dark:text-white">
                                    {file.originalName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
