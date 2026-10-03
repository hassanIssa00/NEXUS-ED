import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as zlib from 'zlib';

const COMPRESSION_THRESHOLD = 1024; // 1KB minimum to compress

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Check if client accepts gzip
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }

    // Store original write and end methods
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    const chunks: Buffer[] = [];

    // Override write to collect chunks
    res.write = function (
      chunk: unknown,
      encodingOrCallback?:
        | BufferEncoding
        | ((error: Error) => void),
      callback?: (error: Error) => void,
    ): boolean {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(
              chunk as string,
              typeof encodingOrCallback === 'string'
                ? encodingOrCallback
                : 'utf8',
            );
        chunks.push(buffer);
      }

      // Handle different overload signatures
      if (typeof encodingOrCallback === 'function') {
        encodingOrCallback(null);
      } else if (typeof callback === 'function') {
        callback(null);
      }

      return true;
    };

    // Override end to compress and send
    res.end = function (
      chunk?: unknown,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void,
    ): Response {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(
              chunk as string,
              typeof encodingOrCallback === 'string'
                ? encodingOrCallback
                : 'utf8',
            );
        chunks.push(buffer);
      }

      const body = Buffer.concat(chunks);

      // Only compress if body is large enough
      if (body.length < COMPRESSION_THRESHOLD) {
        res.setHeader('Content-Length', body.length);
        originalWrite(body);
        return originalEnd();
      }

      // Compress with gzip
      zlib.gzip(body, (err, compressed) => {
        if (err) {
          // Fall back to uncompressed
          res.setHeader('Content-Length', body.length);
          originalWrite(body);
          originalEnd();
          return;
        }

        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', compressed.length);
        res.removeHeader('Content-Length'); // Let client handle it
        res.setHeader('Vary', 'Accept-Encoding');

        originalWrite(compressed);
        originalEnd();
      });

      return res;
    };

    next();
  }
}

/**
 * Simple compression utility function for on-demand compression
 */
export async function compressData(data: string | Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    zlib.gzip(buffer, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Decompress gzip data
 */
export async function decompressData(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.gunzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
