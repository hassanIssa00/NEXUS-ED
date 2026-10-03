import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation middleware using Zod schemas
 */

// Million Dialogue Validation Schemas

export const createRoomSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title too long'),
  type: z.enum(['public', 'private'], {
    message: 'Type must be public or private',
  }),
  settings: z
    .object({
      maxPlayers: z.number().int().min(2).max(50).optional(),
      questionCount: z.number().int().min(1).max(50).optional(),
      timeLimit: z.number().int().min(5).max(120).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
    })
    .optional(),
});

export const joinRoomSchema = z.object({
  roomId: z.string().uuid('Invalid room ID format'),
});

export const submitAnswerSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  questionId: z.number().int().positive('Invalid question ID'),
  chosenIndex: z
    .number()
    .int()
    .min(0)
    .max(3, 'Answer index must be between 0 and 3'),
  timeTaken: z.number().int().min(0, 'Time taken cannot be negative'),
});

export const startRoundSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
});

// Sidebar Validation Schemas

export const getAssignmentsSchema = z.object({
  studentId: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'submitted', 'graded', 'late', 'missing'])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getGradesSchema = z.object({
  studentId: z.string().uuid().optional(),
  subject: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const getAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
});

export const getNotificationsSchema = z.object({
  userId: z.string().uuid().optional(),
  read: z.boolean().optional(),
  type: z
    .enum([
      'info',
      'success',
      'warning',
      'error',
      'assignment',
      'grade',
      'attendance',
      'announcement',
    ])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Generic validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body, query, and params
      const dataToValidate = {
        ...req.body,
        ...req.query,
        ...req.params,
      };

      // Parse and validate
      const validated = await schema.parseAsync(dataToValidate);

      // Replace request data with validated data
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Validation error occurred',
      });
    }
  };
};

// Sanitization middleware
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Remove any script tags or potentially dangerous HTML
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }

    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// Validate UUID middleware
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(uuid)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format. Must be a valid UUID.`,
      });
    }

    next();
  };
};

// Alias for validate function
export const validateRequest = validate;

export default {
  validate,
  validateRequest,
  sanitizeInput,
  validateUUID,
  // Export schemas
  schemas: {
    createRoom: createRoomSchema,
    joinRoom: joinRoomSchema,
    submitAnswer: submitAnswerSchema,
    startRound: startRoundSchema,
    getAssignments: getAssignmentsSchema,
    getGrades: getGradesSchema,
    getAttendance: getAttendanceSchema,
    getNotifications: getNotificationsSchema,
  },
};
