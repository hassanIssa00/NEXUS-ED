import { Request, Response, NextFunction } from 'express';
import { examService } from './exam.service';
import { ExamError } from '../../types/exam.types';

/**
 * Exam Controller
 * HTTP request handlers for exam endpoints
 */
export class ExamController {
  /**
   * POST /api/exams
   * Create new exam (Teacher)
   */
  async createExam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const exam = await examService.createExam(userId, req.body);

      res.status(201).json({
        success: true,
        data: exam,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/exams
   * List exams with filters
   */
  async listExams(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const exams = await examService.listExams({
        classId: req.query.classId as string,
        subjectId: req.query.subjectId as string,
        userId,
        userRole,
      });

      res.json({
        success: true,
        data: exams,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/exams/:id
   * Get exam details
   */
  async getExam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const exam = await examService.getExam(req.params.id, userId, userRole);

      res.json({
        success: true,
        data: exam,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/exams/:id
   * Update exam (Teacher)
   */
  async updateExam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const exam = await examService.updateExam(
        req.params.id,
        userId,
        req.body,
      );

      res.json({
        success: true,
        data: exam,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/exams/:id
   * Delete exam (Teacher)
   */
  async deleteExam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      await examService.deleteExam(req.params.id, userId);

      res.json({
        success: true,
        message: 'Exam deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/exams/:id/questions
   * Add question to exam (Teacher)
   */
  async addQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const question = await examService.addQuestion(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/exams/:id/questions
   * Get exam questions
   */
  async getQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user.role;
      const questions = await examService.getExamQuestions(
        req.params.id,
        userRole,
      );

      res.json({
        success: true,
        data: questions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/exams/:id/start
   * Start exam (Student)
   */
  async startExam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const result = await examService.startExam(
        req.params.id,
        userId,
        ipAddress,
        userAgent,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/exams/:id/submit-answer
   * Submit answer to question (Student)
   */
  async submitAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const { submissionId } = req.body;
      const answer = await examService.submitAnswer(submissionId, req.body);

      res.json({
        success: true,
        data: answer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/exams/:id/finish
   * Finish exam (Student)
   */
  async finishExam(req: Request, res: Response, next: NextFunction) {
    try {
      const { submissionId } = req.body;
      const submission = await examService.finishExam(submissionId);

      res.json({
        success: true,
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/exams/:id/results
   * Get exam results (Student)
   */
  async getResults(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const results = await examService.getResults(req.params.id, userId);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/exams/:id/stats
   * Get exam statistics (Teacher)
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await examService.getExamStats(req.params.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const examController = new ExamController();
