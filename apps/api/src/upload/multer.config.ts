import { memoryStorage } from 'multer';
import * as path from 'path';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

// Map each extension to its allowed MIME types (prevents MIME spoofing)
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

export const multerConfig = {
  storage: memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 10,
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimesForExt = EXTENSION_MIME_MAP[ext];

    // Both MIME and extension must be valid and consistent
    if (!mimeOk) {
      return cb(new Error(`نوع الملف غير مسموح به: ${file.mimetype}`), false);
    }

    if (!allowedMimesForExt || !allowedMimesForExt.includes(file.mimetype)) {
      return cb(new Error(`امتداد الملف لا يتطابق مع نوعه الفعلي`), false);
    }

    cb(null, true);
  },
};
