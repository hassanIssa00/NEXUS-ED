'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { assignmentService, Submission } from '@/lib/services/assignment.service';
import { VoiceRecorder } from '@/components/assignments/voice-recorder';

function parseStructuredAnswers(content?: string) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.kind !== 'nexus-assignment-answers' || !parsed.answers || typeof parsed.answers !== 'object') return null;
    const questions = Array.isArray(parsed.questions) ? parsed.questions as Array<{ id: string; prompt: string }> : [];
    return { answers: parsed.answers as Record<string, string>, questions, comments: typeof parsed.comments === 'string' ? parsed.comments : '' };
  } catch {
    return null;
  }
}

export default function SubmissionsPage() {
  const isEnglish = useLocale() === 'en';
  const t = useTranslations('teacher');
  const tAssign = useTranslations('assignment');
  const tCommon = useTranslations('common');
  const params = useParams();
  const assignmentId = params.id as string;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({ score: 0, feedback: '' });
  const [aiData, setAiData] = useState<{ strengths?: string[], weaknesses?: string[], isAiGenerated?: boolean } | null>(null);

  useEffect(() => {
    if (assignmentId) {
      fetchSubmissions();
    }
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    setSubmissionsError(false);
    try {
      const data = await assignmentService.getSubmissions(assignmentId);
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to fetch submissions', error);
      setSubmissionsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = (submission: Submission) => {
    setSelectedSubmission(submission);
    
    let fbText = submission.feedback || '';
    let aiMeta = null;
    
    try {
      if (fbText.startsWith('{')) {
        const parsed = JSON.parse(fbText);
        fbText = parsed.text || '';
        aiMeta = {
          strengths: parsed.strengths,
          weaknesses: parsed.weaknesses,
          isAiGenerated: parsed.isAiGenerated
        };
      }
    } catch (e) {}
    
    setGradeData({
      score: submission.score || 0,
      feedback: fbText,
    });
    setAiData(aiMeta);
  };

  const submitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      // Repackage AI Data if it existed so we don't lose it, or just send plain text if teacher edited heavily
      const finalFeedback = aiData 
        ? JSON.stringify({ text: gradeData.feedback, strengths: aiData.strengths, weaknesses: aiData.weaknesses, isAiGenerated: aiData.isAiGenerated })
        : gradeData.feedback;

      await assignmentService.gradeSubmission(selectedSubmission.id, {
        score: gradeData.score,
        feedback: finalFeedback
      });
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      alert(error.message || tAssign('gradeError'));
    }
  };

  const structuredSubmissionAnswers = parseStructuredAnswers(selectedSubmission?.content);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        {tAssign('submissions')}
      </h1>

      {loading ? (
        <p role="status" className="text-gray-500 dark:text-gray-400">{tAssign('loading')}</p>
      ) : submissionsError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <p>{tAssign('submissionsLoadError')}</p>
          <button type="button" onClick={fetchSubmissions} className="mt-3 rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800">
            {tAssign('retry')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {tAssign('studentName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {tAssign('submittedAt')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {tAssign('score')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {tCommon('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {tAssign('noSubmissions')}
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <Link href={`/teacher/students/${submission.student?.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                        {submission.student?.name || submission.student?.email}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {submission.score !== null ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {submission.score}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {tAssign('pending')}
                        </span>
                      )}
                      {submission.feedback?.includes('isAiGenerated') && (
                        <span className="ml-2 mr-2 px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          AI ✨
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleGrade(submission)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {tAssign('gradeSubmission')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {tAssign('gradeSubmission')}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {tAssign('studentName')}: {selectedSubmission.student?.name}
              </p>
              {selectedSubmission.content && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mb-2">
                  {structuredSubmissionAnswers ? (
                    <div className="space-y-3">
                      {Object.entries(structuredSubmissionAnswers.answers).map(([id, answer], index) => {
                        const prompt = structuredSubmissionAnswers.questions.find((question) => question.id === id)?.prompt;
                        return <div key={id} className="rounded border border-gray-200 p-2 dark:border-gray-600"><p className="text-xs font-semibold text-gray-500 dark:text-gray-300">{prompt || (isEnglish ? `Question ${index + 1}` : `السؤال ${index + 1}`)}</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{answer}</p></div>;
                      })}
                      {structuredSubmissionAnswers.comments && <p className="text-sm text-gray-700 dark:text-gray-200">{isEnglish ? 'Student note:' : 'ملاحظة الطالب:'} {structuredSubmissionAnswers.comments}</p>}
                    </div>
                  ) : <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{selectedSubmission.content}</p>}
                </div>
              )}
              {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                <div className="space-y-1">
                  {selectedSubmission.attachments.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm block"
                    >
                      {tAssign('files')} {idx + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {aiData?.isAiGenerated && (
              <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✨</span>
                  <h3 className="font-bold text-blue-800 dark:text-blue-300">{isEnglish ? 'AI-assisted grading' : 'التصحيح الذكي (AI)'}</h3>
                </div>
                
                {aiData.strengths && aiData.strengths.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{isEnglish ? 'Strengths:' : 'نقاط القوة:'}</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                      {aiData.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                
                {aiData.weaknesses && aiData.weaknesses.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{isEnglish ? 'Areas to improve:' : 'نقاط للتحسين:'}</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                      {aiData.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={submitGrade}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {tAssign('score')}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={gradeData.score}
                    onChange={(e) => setGradeData({ ...gradeData, score: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {tAssign('feedback')}
                  </label>
                  <textarea
                    rows={3}
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Voice Feedback */}
                <div className="mt-2">
                  <VoiceRecorder 
                    onAudioUpload={(url: string) => {
                      setGradeData(prev => ({
                        ...prev,
                        feedback: prev.feedback + `\n\n[🎤 ${isEnglish ? 'Voice note' : 'ملاحظة صوتية'}](${url})`
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {tCommon('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
