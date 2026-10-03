'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { ArrowRight, CheckCircle2, HeartHandshake, LoaderCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { getCurrentUser } from '@/lib/firebase/auth';
import { saveParentSurvey } from '@/lib/firebase/registration';

const sections = [
  {
    title: 'صحة الطالب وعاداته',
    questions: [
      { id: 'q1', text: 'ما عمر الطالب الحالي؟', options: ['أقل من 6 سنوات', '6 إلى 10 سنوات', '11 إلى 15 سنة', 'أكثر من 15 سنة'] },
      { id: 'q2', text: 'هل توجد حالة صحية أو حساسية تحتاج المدرسة إلى معرفتها؟', options: ['لا توجد', 'حساسية طعام', 'حالة صحية تحتاج متابعة'] },
      { id: 'q3', text: 'كم ساعة ينام الطالب في المتوسط؟', options: ['9 إلى 10 ساعات', '7 إلى 8 ساعات', 'أقل من 7 ساعات'] },
      { id: 'q4', text: 'ما متوسط الوقت اليومي أمام الشاشات؟', options: ['أقل من ساعة', 'ساعة إلى ساعتين', 'أكثر من ساعتين'] },
    ],
  },
  {
    title: 'التواصل والقراءة',
    questions: [
      { id: 'q5', text: 'كيف يعبّر الطالب عن نفسه؟', options: ['بطلاقة', 'يحتاج إلى تشجيع', 'يواجه صعوبة أحياناً'] },
      { id: 'q6', text: 'ما مدى اهتمامه بالقصص والكتب؟', options: ['اهتمام كبير', 'اهتمام متوسط', 'يفضل أنشطة أخرى'] },
      { id: 'q7', text: 'هل توجد صعوبات في نطق بعض الحروف؟', options: ['لا توجد', 'أحياناً', 'توجد صعوبة ملحوظة'] },
    ],
  },
  {
    title: 'التفاعل والتعلّم',
    questions: [
      { id: 'q8', text: 'كيف يتعامل الطالب مع زملائه الجدد؟', options: ['يندمج بسهولة', 'يحتاج وقتاً للاندماج', 'يفضل الأنشطة الفردية'] },
      { id: 'q9', text: 'كيف يستجيب للتوجيهات؟', options: ['بمرونة غالباً', 'يحتاج إلى تذكير', 'يحتاج إلى متابعة إضافية'] },
      { id: 'q10', text: 'كيف ينتظر دوره في الأنشطة الجماعية؟', options: ['بهدوء', 'يحتاج تذكيراً بسيطاً', 'يجد صعوبة في الانتظار'] },
      { id: 'q11', text: 'كيف يركز في نشاط تعليمي قصير؟', options: ['يركز باستمرار', 'يتشتت أحياناً', 'يحتاج فواصل حركة'] },
      { id: 'q12', text: 'كيف يتعامل مع مسألة أو نشاط صعب؟', options: ['يحاول مرة أخرى', 'يطلب المساعدة', 'ينزعج ويحتاج تشجيعاً'] },
      { id: 'q13', text: 'كيف يلتزم بالروتين المنزلي؟', options: ['ملتزم غالباً', 'يحتاج تذكيراً', 'يحتاج متابعة مستمرة'] },
    ],
  },
  {
    title: 'الشراكة الأسرية',
    questions: [
      { id: 'q14', text: 'من يتابع واجبات الطالب في المنزل غالباً؟', options: ['الأب والأم معاً', 'الأم غالباً', 'الأب غالباً', 'شخص آخر'] },
      { id: 'q15', text: 'ما الهدف الأهم للأسرة هذا الفصل؟', options: ['التحصيل الدراسي', 'بناء الشخصية والثقة', 'تنمية المهارات الأساسية', 'جميع ما سبق'] },
    ],
  },
];

function SurveyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const studentId = searchParams.get('student');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const section = sections[sectionIndex];
  const complete = section.questions.every((question) => answers[question.id]);

  const moveForward = async () => {
    setError('');
    if (sectionIndex < sections.length - 1) {
      setSectionIndex((index) => index + 1);
      return;
    }
    if (!studentId) {
      setError('اختر ملف الطالب من بوابة ولي الأمر ثم أعد فتح الاستبيان.');
      return;
    }
    if (!consent) {
      setError('يلزم تأكيد موافقتك قبل إرسال الإجابات.');
      return;
    }

    setSubmitting(true);
    try {
      const firebaseUser = getCurrentUser();
      if (firebaseUser?.uid === profile?.id) {
        await saveParentSurvey(studentId, answers, consent);
      } else {
        await apiClient.post('/users/parent-survey', { studentId, answers, consent });
      }
      setSubmitted(true);
    } catch (submitError: any) {
      const message = submitError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('، ') : message || 'تعذر حفظ الاستبيان. لم يتم اعتماد أي إجابة.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir="rtl">
      <section className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-black text-gray-900 dark:text-white">تم حفظ الاستبيان</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">أُرسلت الإجابات إلى قاعدة بيانات المدرسة، ويمكن للمختصين المخولين مراجعتها ضمن ملف الطالب.</p>
            <button type="button" onClick={() => router.push(profile?.status === 'pending' ? '/account/pending' : '/parent')} className="mt-6 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">{profile?.status === 'pending' ? 'متابعة حالة الحساب' : 'العودة إلى بوابة ولي الأمر'}</button>
          </div>
        ) : (
          <>
            <header className="border-b border-gray-200 pb-5 dark:border-white/10">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"><HeartHandshake className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">ملف الطالب · استبيان ولي الأمر</p>
                  <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">معلومات تساعد المدرسة على المتابعة</h1>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">تُحفظ إجاباتك للطالب المرتبط بالحساب، ولا تمثل تشخيصاً طبياً أو نفسياً.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2" aria-label={`المحور ${sectionIndex + 1} من ${sections.length}`}>
                {sections.map((item, index) => <div key={item.title} className={`h-1.5 rounded-full ${index <= sectionIndex ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-white/10'}`} />)}
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-500">المحور {sectionIndex + 1} من {sections.length}: {section.title}</p>
            </header>

            <div className="space-y-6 py-6">
              {section.questions.map((question, questionIndex) => (
                <fieldset key={question.id} className="space-y-3">
                  <legend className="text-sm font-bold text-gray-900 dark:text-white">{questionIndex + 1}. {question.text}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option;
                      return <button key={option} type="button" aria-pressed={selected} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))} className={`min-h-11 rounded-lg border px-3 py-2 text-right text-sm font-medium transition ${selected ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5'}`}>
                        {option}
                      </button>;
                    })}
                  </div>
                </fieldset>
              ))}

              {sectionIndex === sections.length - 1 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm leading-6 dark:border-white/10">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />
                  <span className="flex gap-2 text-gray-700 dark:text-gray-200"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> أوافق على مشاركة هذه الإجابات مع المختصين المخولين بالمدرسة لأغراض دعم الطالب ومتابعته.</span>
                </label>
              )}
            </div>

            {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <footer className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
              <button type="button" disabled={sectionIndex === 0 || submitting} onClick={() => setSectionIndex((index) => Math.max(0, index - 1))} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 disabled:opacity-40 dark:border-white/10 dark:text-gray-200">السابق</button>
              <button type="button" disabled={!complete || submitting || (sectionIndex === sections.length - 1 && !consent)} onClick={() => void moveForward()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {sectionIndex === sections.length - 1 ? 'حفظ الاستبيان' : 'المحور التالي'}
                {!submitting && sectionIndex < sections.length - 1 ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}

export default function SurveyPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">جارٍ تحميل الاستبيان...</div>}><SurveyForm /></Suspense>;
}
