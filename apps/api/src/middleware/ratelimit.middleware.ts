import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { PrismaRateLimitStore } from '../common/persistent-quota-storage';

/**
 * Rate limiting configuration for different endpoints
 */

// General API rate limiter - 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-general'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error:
        'Too many requests from this IP, please try again after 15 minutes',
    });
  },
});

// Strict limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-auth'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again after 15 minutes',
    });
  },
});

// Million Dialogue answer submission limiter - prevent spam
export const answerLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-answer'),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Max 20 answers per minute (reasonable for multiple questions)
  message: {
    success: false,
    error: 'Too many answer submissions. Please slow down.',
    retryAfter: '1 minute',
  },
  keyGenerator: (req: Request) => {
    // Rate limit per user instead of IP for authenticated endpoints
    return (req as any).user?.id || req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error:
        'Answer submission rate limit exceeded. Please wait before submitting again.',
    });
  },
});

// Room creation limiter - prevent spam room creation
export const roomCreationLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-room-creation'),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 rooms per 10 minutes
  message: {
    success: false,
    error: 'Too many rooms created. Please wait before creating another.',
    retryAfter: '10 minutes',
  },
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error:
        'Room creation rate limit exceeded. Maximum 5 rooms per 10 minutes.',
    });
  },
});

// Question generation limiter (for AI/LLM endpoints)
export const questionGenerationLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-question-generation'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 generation requests per hour
  message: {
    success: false,
    error: 'Question generation quota exceeded.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error:
        'AI question generation quota exceeded. Maximum 10 requests per hour.',
    });
  },
});

// File upload limiter
export const uploadLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-upload'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Max 50 uploads per hour
  message: {
    success: false,
    error: 'Upload rate limit exceeded.',
    retryAfter: '1 hour',
  },
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
});

// WebSocket connection rate limiter (use with socket.io handshake)
export const socketConnectionLimiter = rateLimit({
  store: new PrismaRateLimitStore('http-socket-connection'),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 connections per 5 minutes
  message: {
    success: false,
    error: 'Too many WebSocket connection attempts.',
    retryAfter: '5 minutes',
  },
});

export default {
  generalLimiter,
  authLimiter,
  answerLimiter,
  roomCreationLimiter,
  questionGenerationLimiter,
  uploadLimiter,
  socketConnectionLimiter,
};
