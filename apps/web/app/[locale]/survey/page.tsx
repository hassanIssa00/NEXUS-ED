'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { HeartHandshake, CheckCircle2, Sparkles, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface SurveySection {
  id: string;
  title: string;
  icon: string;
  questions: {
    id: string;
    text: string;
    options: string[];
  }[];
}

const SURVEY_SECTIONS: SurveySection[] = [
  {
    id: 'general',
    title: 'معلومات عامة وصحية',
    icon: '🩺',
    questions: [
      { id: 'q1', text: 'ما هو عمر الطفل الحالي؟', options: ['6 سنوات', '7 سنوات', 'أخرى'] },
      { id: 'q2', text: 'هل يعاني الطفل من أي حساسية غذائية أو أمراض مزمنة؟', options: ['لا توجد ولله الحمد', 'نعم، حساسية طعام', 'نعم، حالة صحية تحتاج متابعة'] },
      { id: 'q3', text: 'كم ساعة ينام الطفل يومياً في المتوسط؟', options: ['9 إلى 10 ساعات (كافٍ جداً)', '7 إلى 8 ساعات', 'أقل من 7 ساعات'] },
      { id: 'q4', text: 'كم الوقت التقريبي الذي يقضيه الطفل أمام الشاشات والأجهزة يومياً؟', options: ['أقل من ساعة', 'ساعة إلى ساعتين', 'أكثر من ساعتين'] },
    ],
  },
  {
    id: 'language',
    title: 'المهارات اللغوية والقراءة',
    icon: '📖',
    questions: [
      { id: 'q5', text: 'هل يستطيع الطفل التعبير عن نفسه بطلاقة وجمل واضحة؟', options: ['نعم بطلاقة تامة', 'نعم ولكن يحتاج تشجيعاً', 'بصعوبة أحياناً'] },
      { id: 'q6', text: 'هل يحب الطفل الاستماع إلى القصص والكتب المصورة؟', options: ['يحبها كثيراً وبشغف', 'يحبها باعتدال', 'يفضل الألعاب والحركة'] },
      { id: 'q7', text: 'هل يواجه صعوبة في نطق بعض الحروف الهجائية؟', options: ['لا، مخارج الحروف سليمة', 'أحياناً في بعض الحروف', 'نعم، توجد صعوبة ملحوظة'] },
    ],
  },
  {
    id: 'social',
    title: 'المهارات الاجتماعية والتواصل',
    icon: '🤝',
    questions: [
      { id: 'q8', text: 'كيف يتعامل الطفل مع أقرانه وزملائه الجدد؟', options: ['يتعرف ويكون صداقات بسهولة', 'خجول في البداية ثم يندمج', 'يفضل اللعب الفردي'] },
      { id: 'q9', text: 'هل يتقبل الطفل توجيهات وإرشادات المعلم والوالدين بسهولة؟', options: ['غالباً وبمرونة', 'أحياناً ويحتاج إقناعاً', 'يبدي بعض العناد'] },
      { id: 'q10', text: 'هل يستطيع الطفل انتظار دوره في الطابور والأنشطة الجماعية؟', options: ['نعم بكل هدوء', 'يحتاج تذكيراً بسيطاً', 'يجد صعوبة في الانتظار'] },
    ],
  },
  {
    id: 'behavior',
    title: 'السلوك والانتباه والتركيز',
    icon: '🧠',
    questions: [
      { id: 'q11', text: 'كيف تقيم قدرة الطفل على الجلوس والتركيز في مهمة تعليمية لمدة 20 دقيقة؟', options: ['ممتازة ومركز', 'جيدة مع قليل من التشتت', 'يحتاج حركة مستمرة'] },
      { id: 'q12', text: 'كيف تكون ردة فعل الطفل عند مواجهة صعوبة في حل مسألة أو نشاط؟', options: ['يحاول مرة أخرى بهدوء', 'يطلب المساعدة فوراً', 'ينزعج ويحبط سريعاً'] },
      { id: 'q13', text: 'هل يلتزم الطفل بالروتين اليومي المنزلي (النوم، الاستيقاظ، المذاكرة)؟', options: ['ملتزم جداً', 'ملتزم في الغالب', 'يحتاج متابعة حثيثة'] },
    ],
  },
  {
    id: 'academic',
    title: 'بيئة الدعم المنزلي والمذاكرة',
    icon: '🏠',
    questions: [
      { id: 'q14', text: 'من هو المسؤول المباشر عن متابعة واجبات الطفل في المنزل؟', options: ['الأب والأم معاً', 'الأم غالباً', 'الأب غالباً', 'معلم خاص / طرف آخر'] },
      { id: 'q15', text: 'ما هو التوقع والهدف الأهم بالنسبة لكم كولي أمر من هذا الفصل الدراسي؟', options: ['التميز الأكاديمي وحفظ القرآن', 'بناء الشخصية والثقة بالنفس', 'إتقان مهارات القراءة والكتابة والرياضيات', 'جميع ما سبق'] },
    ],
  },
];

export default function SurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('student') || 'cls-std-2';

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentSection = SURVEY_SECTIONS[currentSectionIdx];

  const handleSelect = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const isSectionComplete = currentSection.questions.every(q => answers[q.id]);

  const handleNext = () => {
    if (currentSectionIdx < SURVEY_SECTIONS.length - 1) {
      setCurrentSectionIdx(prev => prev + 1);
    } else {
      finishSurvey();
    }
  };

  const handlePrev = () => {
    if (currentSectionIdx > 0) {
      setCurrentSectionIdx(prev => prev - 1);
    }
  };

  const finishSurvey = async () => {
    setSubmitting(true);
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge');
      
      // Save observation for teacher & counselor
      nexusBridge.saveObservation({
        studentId,
        studentName: 'أحمد فيصل الغامدي',
        authorName: 'ولي أمر الطالب',
        authorRole: 'ولي أمر',
        text: 'أكمل ولي الأمر استبيان القياس التربوي الشامل بنجاح، مما يعكس اهتماماً ودعماً أسرياً عالياً.',
        category: 'guidance',
        severity: 'positive',
      });

      window.dispatchEvent(new CustomEvent('nexus:data-changed'));
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1015] flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
        
        {!submitted ? (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 text-xs font-bold mb-3">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>الخطوة 3 من 3: استبيان الشراكة الأسرية</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                استبيان ولي الأمر التربوي والنفسي
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                معلوماتك تساعد د. إسماعيل عيسى والموجه الطلابي في تفصيل الخطة الأكاديمية والتربوية لابنك
              </p>
            </div>

            {/* Stepper */}
            <div className="flex gap-2 mb-8">
              {SURVEY_SECTIONS.map((sec, idx) => (
                <div key={sec.id} className="flex-1 text-center">
                  <div className={`h-2 rounded-full mb-1.5 transition-all ${
                    idx === currentSectionIdx
                      ? 'bg-amber-500'
                      : idx < currentSectionIdx
                      ? 'bg-emerald-500'
                      : 'bg-gray-100 dark:bg-white/10'
                  }`} />
                  <span className={`text-[10px] font-bold block truncate ${
                    idx === currentSectionIdx ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'
                  }`}>{sec.title}</span>
                </div>
              ))}
            </div>

            {/* Current Section Questions */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
                <span className="text-2xl">{currentSection.icon}</span>
                <h3 className="font-black text-base text-gray-900 dark:text-white">{currentSection.title}</h3>
              </div>

              {currentSection.questions.map((q, qi) => (
                <div key={q.id} className="space-y-2.5">
                  <label className="text-xs font-black text-gray-800 dark:text-gray-200 block">
                    {qi + 1}. {q.text}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {q.options.map(opt => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button key={opt} type="button" onClick={() => handleSelect(q.id, opt)}
                          className={`p-3 rounded-2xl border text-right text-xs font-bold transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/30'
                              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:border-amber-300'
                          }`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button onClick={handlePrev} disabled={currentSectionIdx === 0}
                className="px-5 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold text-xs disabled:opacity-40 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <button onClick={handleNext} disabled={!isSectionComplete || submitting}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-lg shadow-amber-500/30 disabled:opacity-40 flex items-center justify-center gap-2">
                {submitting ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>{currentSectionIdx === SURVEY_SECTIONS.length - 1 ? 'إرسال الاستبيان واعتماد الملف' : 'المحور التالي'}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation Screen */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center text-white text-4xl shadow-xl shadow-emerald-500/30 mb-5">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">شكراً لك! تم اعتماد الاستبيان بنجاح</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              تم تسليم استبيان ولي الأمر بنجاح إلى د. إسماعيل عيسى والموجه الطلابي لمتابعة مسيرة ابنك الأكاديمية والتربوية.
            </p>

            <button onClick={() => router.push('/parent')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm shadow-xl shadow-amber-500/30">
              الدخول إلى بوابة ولي الأمر الآن 👨‍👩‍👧‍👦
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
