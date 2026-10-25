'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { ArrowRight, CheckCircle2, HeartHandshake, LoaderCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { useLocale } from 'next-intl';

const surveyEnglish: Record<string, string> = {
  'صحة الطالب وعاداته': 'Student health and habits', 'ما عمر الطالب الحالي؟': 'How old is the student?', 'أقل من 6 سنوات': 'Under 6 years', '6 إلى 10 سنوات': '6 to 10 years', '11 إلى 15 سنة': '11 to 15 years', 'أكثر من 15 سنة': 'Over 15 years',
  'هل توجد حالة صحية أو حساسية تحتاج المدرسة إلى معرفتها؟': 'Is there a health condition or allergy the school should know about?', 'لا توجد': 'None', 'حساسية طعام': 'Food allergy', 'حالة صحية تحتاج متابعة': 'A health condition that needs follow-up', 'كم ساعة ينام الطالب في المتوسط؟': 'How many hours does the student usually sleep?', '9 إلى 10 ساعات': '9 to 10 hours', '7 إلى 8 ساعات': '7 to 8 hours', 'أقل من 7 ساعات': 'Under 7 hours', 'ما متوسط الوقت اليومي أمام الشاشات؟': 'How much time does the student spend in front of screens each day?', 'أقل من ساعة': 'Less than 1 hour', 'ساعة إلى ساعتين': '1 to 2 hours', 'أكثر من ساعتين': 'More than 2 hours',
  'التواصل والقراءة': 'Communication and reading', 'كيف يعبّر الطالب عن نفسه؟': 'How does the student express themselves?', 'بطلاقة': 'Fluently', 'يحتاج إلى تشجيع': 'Needs encouragement', 'يواجه صعوبة أحياناً': 'Sometimes has difficulty', 'ما مدى اهتمامه بالقصص والكتب؟': 'How interested is the student in stories and books?', 'اهتمام كبير': 'Very interested', 'اهتمام متوسط': 'Moderately interested', 'يفضل أنشطة أخرى': 'Prefers other activities', 'هل توجد صعوبات في نطق بعض الحروف؟': 'Does the student have difficulty pronouncing any letters?', 'أحياناً': 'Sometimes', 'توجد صعوبة ملحوظة': 'Noticeable difficulty',
  'التفاعل والتعلّم': 'Social interaction and learning', 'كيف يتعامل الطالب مع زملائه الجدد؟': 'How does the student interact with new classmates?', 'يندمج بسهولة': 'Settles in easily', 'يحتاج وقتاً للاندماج': 'Needs time to settle in', 'يفضل الأنشطة الفردية': 'Prefers individual activities', 'كيف يستجيب للتوجيهات؟': 'How does the student respond to instructions?', 'بمرونة غالباً': 'Usually responds flexibly', 'يحتاج إلى تذكير': 'Needs reminders', 'يحتاج إلى متابعة إضافية': 'Needs additional support', 'كيف ينتظر دوره في الأنشطة الجماعية؟': 'How does the student wait for their turn in group activities?', 'بهدوء': 'Calmly', 'يحتاج تذكيراً بسيطاً': 'Needs a gentle reminder', 'يجد صعوبة في الانتظار': 'Finds waiting difficult', 'كيف يركز في نشاط تعليمي قصير؟': 'How does the student focus on a short learning activity?', 'يركز باستمرار': 'Stays focused', 'يتشتت أحياناً': 'Sometimes gets distracted', 'يحتاج فواصل حركة': 'Needs movement breaks', 'كيف يتعامل مع مسألة أو نشاط صعب؟': 'How does the student handle a difficult problem or activity?', 'يحاول مرة أخرى': 'Tries again', 'يطلب المساعدة': 'Asks for help', 'ينزعج ويحتاج تشجيعاً': 'Gets frustrated and needs encouragement', 'كيف يلتزم بالروتين المنزلي؟': 'How does the student follow the home routine?', 'ملتزم غالباً': 'Usually follows it', 'يحتاج متابعة مستمرة': 'Needs ongoing follow-up',
  'الشراكة الأسرية': 'Family partnership', 'من يتابع واجبات الطالب في المنزل غالباً؟': 'Who usually supports the student with homework at home?', 'الأب والأم معاً': 'Both parents', 'الأم غالباً': 'Usually the mother', 'الأب غالباً': 'Usually the father', 'شخص آخر': 'Someone else', 'ما الهدف الأهم للأسرة هذا الفصل؟': 'What is the family’s most important goal this term?', 'التحصيل الدراسي': 'Academic progress', 'بناء الشخصية والثقة': 'Building confidence and character', 'تنمية المهارات الأساسية': 'Developing core skills', 'جميع ما سبق': 'All of the above',
};

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
  const isEnglish = useLocale() === 'en';
  const t = (value: string) => isEnglish ? (surveyEnglish[value] ?? value) : value;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile, markParentSurveyComplete } = useAuth();
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
      setError(isEnglish ? 'Select a student profile in the parent portal, then reopen the survey.' : 'اختر ملف الطالب من بوابة ولي الأمر ثم أعد فتح الاستبيان.');
      return;
    }
    if (!consent) {
      setError(isEnglish ? 'Please confirm your consent before submitting your answers.' : 'يلزم تأكيد موافقتك قبل إرسال الإجابات.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/users/parent-survey', { studentId, answers, consent });
      try {
        await refreshProfile();
      } catch (refreshError) {
        console.warn('Survey saved, but the parent profile refresh failed.', refreshError);
      }
      markParentSurveyComplete();
      setSubmitted(true);
    } catch (submitError: any) {
      const message = submitError?.response?.data?.message;
      setError(isEnglish ? 'The survey could not be saved. No answers were submitted.' : (Array.isArray(message) ? message.join('، ') : message || 'تعذر حفظ الاستبيان. لم يتم اعتماد أي إجابة.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-[#0f1015]" dir={isEnglish ? 'ltr' : 'rtl'}>
      <section className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1e1e2d] md:p-8">
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-black text-gray-900 dark:text-white">{isEnglish ? 'Survey saved' : 'تم حفظ الاستبيان'}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">{isEnglish ? 'Your answers were saved to the school database. Authorized staff can review them in the student record.' : 'أُرسلت الإجابات إلى قاعدة بيانات المدرسة، ويمكن للمختصين المخولين مراجعتها ضمن ملف الطالب.'}</p>
            <button type="button" onClick={() => router.push('/parent')} className="mt-6 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">{isEnglish ? 'Return to the parent portal' : 'العودة إلى بوابة ولي الأمر'}</button>
          </div>
        ) : (
          <>
            <header className="border-b border-gray-200 pb-5 dark:border-white/10">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"><HeartHandshake className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{isEnglish ? 'Student record · Parent survey' : 'ملف الطالب · استبيان ولي الأمر'}</p>
                  <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{isEnglish ? 'Information to help the school support the student' : 'معلومات تساعد المدرسة على المتابعة'}</h1>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{isEnglish ? 'Your answers are saved for the student linked to your account. They are not a medical or psychological diagnosis.' : 'تُحفظ إجاباتك للطالب المرتبط بالحساب، ولا تمثل تشخيصاً طبياً أو نفسياً.'}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2" aria-label={isEnglish ? `Section ${sectionIndex + 1} of ${sections.length}` : `المحور ${sectionIndex + 1} من ${sections.length}`}>
                {sections.map((item, index) => <div key={item.title} className={`h-1.5 rounded-full ${index <= sectionIndex ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-white/10'}`} />)}
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-500">{isEnglish ? `Section ${sectionIndex + 1} of ${sections.length}: ${t(section.title)}` : `المحور ${sectionIndex + 1} من ${sections.length}: ${section.title}`}</p>
            </header>

            <div className="space-y-6 py-6">
              {section.questions.map((question, questionIndex) => (
                <fieldset key={question.id} className="space-y-3">
                  <legend className="text-sm font-bold text-gray-900 dark:text-white">{questionIndex + 1}. {t(question.text)}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option;
                      return <button key={option} type="button" aria-pressed={selected} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))} className={`min-h-11 rounded-lg border px-3 py-2 text-right text-sm font-medium transition ${selected ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5'}`}>
                        {t(option)}
                      </button>;
                    })}
                  </div>
                </fieldset>
              ))}

              {sectionIndex === sections.length - 1 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm leading-6 dark:border-white/10">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />
                  <span className="flex gap-2 text-gray-700 dark:text-gray-200"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> {isEnglish ? 'I agree to share these answers with authorized school staff to support and follow up on the student.' : 'أوافق على مشاركة هذه الإجابات مع المختصين المخولين بالمدرسة لأغراض دعم الطالب ومتابعته.'}</span>
                </label>
              )}
            </div>

            {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <footer className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
              <button type="button" disabled={sectionIndex === 0 || submitting} onClick={() => setSectionIndex((index) => Math.max(0, index - 1))} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 disabled:opacity-40 dark:border-white/10 dark:text-gray-200">{isEnglish ? 'Previous' : 'السابق'}</button>
              <button type="button" disabled={!complete || submitting || (sectionIndex === sections.length - 1 && !consent)} onClick={() => void moveForward()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {sectionIndex === sections.length - 1 ? (isEnglish ? 'Submit survey' : 'حفظ الاستبيان') : (isEnglish ? 'Next section' : 'المحور التالي')}
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
  const isEnglish = useLocale() === 'en';
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">{isEnglish ? 'Loading survey...' : 'جارٍ تحميل الاستبيان...'}</div>}><SurveyForm /></Suspense>;
}
