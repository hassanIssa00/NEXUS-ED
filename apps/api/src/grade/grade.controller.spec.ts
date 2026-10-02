import type { Response } from 'express';
import { GradesController } from './grade.controller';
import { GradeService } from './grade.service';

describe('GradesController', () => {
  const studentRequest = {
    user: {
      id: 'student-1',
      userId: 'student-1',
      email: 'student@example.test',
    },
  } as never;

  it('does not report a zero average when no grades are recorded', async () => {
    const service = { findMyGrades: jest.fn().mockResolvedValue([]) };
    const controller = new GradesController(service as unknown as GradeService);

    await expect(controller.getGrades(studentRequest)).resolves.toEqual({
      grades: [],
      summary: {
        totalSubjects: 0,
        averageGrade: null,
        letterGrade: '-',
      },
    });
  });

  it('omits a percentage when a recorded maximum is invalid', async () => {
    const service = {
      findMyGrades: jest.fn().mockResolvedValue([
        { id: 'grade-1', grade: 0, maxScore: 0, subject: { name: 'Math' } },
      ]),
    };
    const controller = new GradesController(service as unknown as GradeService);

    const result = await controller.getGrades(studentRequest);

    expect(result.grades[0]).toMatchObject({ percentage: null, letterGrade: '-' });
    expect(result.summary.averageGrade).toBeNull();
  });

  it('calculates the summary from recorded precision, not rounded row percentages', async () => {
    const service = {
      findMyGrades: jest.fn().mockResolvedValue([
        { id: 'grade-1', grade: 1, maxScore: 7 },
        { id: 'grade-2', grade: 2, maxScore: 7 },
      ]),
    };
    const controller = new GradesController(service as unknown as GradeService);

    const result = await controller.getGrades(studentRequest);

    expect(result.grades.map(grade => grade.percentage)).toEqual([14, 29]);
    expect(result.summary.averageGrade).toBeCloseTo((3 / 14) * 100);
  });

  it('labels an empty text export as unavailable instead of 0%', async () => {
    const service = { findMyGrades: jest.fn().mockResolvedValue([]) };
    const controller = new GradesController(service as unknown as GradeService);
    const response = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response;

    await controller.downloadReport(studentRequest, response);

    const body = (response.send as jest.Mock).mock.calls[0][0] as Buffer;
    expect(body.toString()).toContain('No grades recorded.');
    expect(body.toString()).toContain('Overall Average: Not available');
    expect(body.toString()).not.toContain('0.00%');
  });
});
