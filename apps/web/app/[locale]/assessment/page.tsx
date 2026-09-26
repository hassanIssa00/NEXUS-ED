'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Trophy, Clock, ArrowLeft, ArrowRight, Star, Award, RotateCcw } from 'lucide-react';

interface Question {
  id: number;
  category: string;
  categoryLabel: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
}

const ASSESSMENT_QUESTIONS: Question[] = [
  // اللغة العربية
  { id: 1, category: 'arabic', categoryLabel: 'اللغة العربية', prompt: 'ما الحرف الأول في كلمة (أَسَد)؟', options: ['أ', 'ب', 'ت', 'س'], correct: 0, explanation: 'كلمة أسد تبدأ بحرف وصوت الألف (أ).' },
  { id: 2, category: 'arabic', categoryLabel: 'اللغة العربية', prompt: 'اختر كلمة تبدأ بحرف (ب):', options: ['باب', 'تفاحة', 'قلم', 'شمس'], correct: 0, explanation: 'باب تبدأ بحرف الباء المفتوحة.' },
  { id: 3, category: 'arabic', categoryLabel: 'اللغة العربية', prompt: 'ما الحرف الناقص في كلمة (قـ ... م) لتصبح (قلم)؟', options: ['ل', 'س', 'ر', 'ن'], correct: 0, explanation: 'حرف اللام في وسط الكلمة يكمل (قلم).' },
  { id: 4, category: 'arabic', categoryLabel: 'اللغة العربية', prompt: 'كلمة (كِـتَـاب) تحتوي على مد بـ:', options: ['الألف', 'الواو', 'الياء', 'النون'], correct: 0, explanation: 'حرف التاء ممدود بالألف (تَا).' },
  { id: 5, category: 'arabic', categoryLabel: 'اللغة العربية', prompt: 'أي كلمتين لهما نفس الصوت الأول؟', options: ['قلم وقمر', 'باب وشمس', 'تفاح وقلم', 'كتاب وجمل'], correct: 0, explanation: 'قلم وقمر يبدآن بحرف وصوت القاف (ق).' },

  // الرياضيات
  { id: 6, category: 'math', categoryLabel: 'الرياضيات', prompt: 'كم عدد النجوم التالية: ⭐ ⭐ ⭐ ⭐ ⭐ ؟', options: ['5', '4', '3', '6'], correct: 0, explanation: 'عدد النجوم خمسة.' },
  { id: 7, category: 'math', categoryLabel: 'الرياضيات', prompt: 'ما العدد الذي يأتي بعد الرقم 4 مباشرة؟', options: ['5', '3', '6', '2'], correct: 0, explanation: 'في خط الأعداد بعد 4 يأتي 5.' },
  { id: 8, category: 'math', categoryLabel: 'الرياضيات', prompt: 'ما ناتج جمع: 2 + 3 = ؟', options: ['5', '4', '6', '3'], correct: 0, explanation: 'جمع اثنين وثلاثة يعطي 5.' },
  { id: 9, category: 'math', categoryLabel: 'الرياضيات', prompt: 'أي عدد هو الأكبر بين الأعداد التالية؟', options: ['8', '3', '5', '1'], correct: 0, explanation: 'العدد 8 هو الأكبر.' },
  { id: 10, category: 'math', categoryLabel: 'الرياضيات', prompt: 'إذا كان معك 4 تفاحات وأكلت منها واحدة، كم تفاحة تتبقى معك؟', options: ['3', '2', '4', '1'], correct: 0, explanation: '4 ناقص 1 يساوي 3.' },

  // القرآن الكريم والتربية الإسلامية
  { id: 11, category: 'quran', categoryLabel: 'القرآن والإسلامية', prompt: 'ما هي أول سورة في المصحف الشريف؟', options: ['سورة الفاتحة', 'سورة الناس', 'سورة الإخلاص', 'سورة الفلق'], correct: 0, explanation: 'سورة الفاتحة هي فاتحة الكتاب والسبع المثاني.' },
  { id: 12, category: 'quran', categoryLabel: 'القرآن والإسلامية', prompt: 'كم عدد أركان الإسلام؟', options: ['5 أركان', '3 أركان', '6 أركان', '4 أركان'], correct: 0, explanation: 'بُني الإسلام على خمسة أركان.' },
  { id: 13, category: 'quran', categoryLabel: 'القرآن والإسلامية', prompt: 'ما اسم نبينا ورسولنا الكريم؟', options: ['محمد صلى الله عليه وسلم', 'إبراهيم عليه السلام', 'موسى عليه السلام', 'عيسى عليه السلام'], correct: 0, explanation: 'نبينا هو محمد بن عبد الله صلى الله عليه وسلم.' },
  { id: 14, category: 'quran', categoryLabel: 'القرآن والإسلامية', prompt: 'ماذا نقول قبل البدء في الأكل والشرب؟', options: ['باسم الله', 'الحمد لله', 'أستغفر الله', 'لا إله إلا الله'], correct: 0, explanation: 'من آداب الطعام التسمية في أوله.' },
  { id: 15, category: 'quran', categoryLabel: 'القرآن والإسلامية', prompt: 'كم عدد الصلوات المفروضة في اليوم والليلة؟', options: ['5 صلوات', '3 صلوات', '4 صلوات', '6 صلوات'], correct: 0, explanation: 'الصلوات الخمس: الفجر، الظهر، العصر، المغرب، العشاء.' },

  // القدرات والعلوم
  { id: 16, category: 'science', categoryLabel: 'العلوم والذكاء', prompt: 'أي شكل هندسي له 3 أضلاع فقط؟', options: ['المثلث', 'المربع', 'الدائرة', 'المستطيل'], correct: 0, explanation: 'المثلث يتكون من ثلاثة أضلاع وثلاث زوايا.' },
  { id: 17, category: 'science', categoryLabel: 'العلوم والذكاء', prompt: 'أي من الكائنات التالية يطير في الهواء؟', options: ['العصفور', 'السمكة', 'السلحفاة', 'الأرنب'], correct: 0, explanation: 'العصفور من الطيور وله جناحان يطير بهما.' },
  { id: 18, category: 'science', categoryLabel: 'العلوم والذكاء', prompt: 'ما الشيء الذي نستخدمه لمعرفة الوقت؟', options: ['الساعة', 'المسطرة', 'الميزان', 'المصباح'], correct: 0, explanation: 'الساعة هي أداة قياس الوقت.' },
  { id: 19, category: 'science', categoryLabel: 'العلوم والذكاء', prompt: 'ما هو لون السماء في يوم مشمس صافٍ؟', options: ['أزرق', 'أخضر', 'أصفر', 'أحمر'], correct: 0, explanation: 'لون السماء الطبيعي نهاراً أزرق.' },
  { id: 20, category: 'science', categoryLabel: 'العلوم والذكاء', prompt: 'أكمل النمط: أحمر، أزرق، أحمر، أزرق، ...', options: ['أحمر', 'أصفر', 'أخضر', 'أسود'], correct: 0, explanation: 'النمط يتكرر بالتبادل بين الأحمر والأزرق.' },
];

export default function AssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('student') || 'cls-std-2';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const currentQ = ASSESSMENT_QUESTIONS[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionIndex }));
  };

  const handleNext = () => {
    if (currentIndex < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishAssessment();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const finishAssessment = async () => {
    let correctCount = 0;
    ASSESSMENT_QUESTIONS.forEach(q => {
      if (answers[q.id] === q.correct) correctCount += 1;
    });

    const calculatedScore = Math.round((correctCount / ASSESSMENT_QUESTIONS.length) * 100);
    setScore(calculatedScore);
    setIsCompleted(true);

    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge');
      nexusBridge.issueCertificate({
        studentId,
        studentName: 'أحمد فيصل الغامدي',
        programTitle: 'شهادة اجتياز الاختبار التشخيصي للقبول',
        achievement: `أتم الطالب الاختبار التشخيصي الشامل للصف الأول الابتدائي بمعدل ${calculatedScore}%`,
        score: calculatedScore,
        completionDate: new Date().toISOString().split('T')[0],
        doctorName: 'د. إسماعيل عيسى',
        doctorTitle: 'المعلم والمشرف الأكاديمي',
        badge: '🏆',
      });
      window.dispatchEvent(new CustomEvent('nexus:data-changed'));
    } catch (e) {
      console.error(e);
    }
  };

  const getLevelBadge = (s: number) => {
    if (s >= 90) return { label: 'مستوى استثنائي متميز 🌟', color: 'from-emerald-500 to-teal-600', text: 'جاهزية كاملة وتفوق ملحوظ' };
    if (s >= 75) return { label: 'مستوى متقدم وجيد جداً 👍', color: 'from-blue-500 to-indigo-600', text: 'تمكن عالٍ من المفاهيم الأساسية' };
    return { label: 'مستوى تأسيسي واعد 🚀', color: 'from-amber-500 to-orange-600', text: 'يحتاج تعزيز بعض مهارات القراءة والكتابة' };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1015] flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
        
        {!isCompleted ? (
          <div>
            {/* Header info */}
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentQ.categoryLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-gray-500">
                <span>السؤال {currentIndex + 1} من {ASSESSMENT_QUESTIONS.length}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }} />
            </div>

            {/* Question Prompt */}
            <div className="bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-500/20 rounded-3xl p-6 mb-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-relaxed text-center">
                {currentQ.prompt}
              </h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQ.id] === optIdx;
                return (
                  <button key={optIdx} type="button" onClick={() => handleSelectOption(optIdx)}
                    className={`p-4 rounded-2xl border-2 text-right font-black text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 hover:border-teal-300'
                    }`}>
                    <span>{opt}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-white bg-white text-teal-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4">
              <button onClick={handlePrev} disabled={currentIndex === 0}
                className="px-5 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold text-xs disabled:opacity-40 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <button onClick={handleNext} disabled={answers[currentQ.id] === undefined}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black text-sm shadow-lg shadow-teal-500/30 disabled:opacity-40 flex items-center justify-center gap-2">
                <span>{currentIndex === ASSESSMENT_QUESTIONS.length - 1 ? 'إنهاء وحساب النتيجة' : 'السؤال التالي'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Result Screen */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 mx-auto flex items-center justify-center text-5xl shadow-xl shadow-amber-500/30 mb-5">
              🏆
            </div>

            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">أحسنت! أتممت الاختبار بنجاح</h2>
            <p className="text-sm text-gray-500 mb-6">نتائج التقييم التشخيصي للقبول بمدرسة د. إسماعيل عيسى</p>

            <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-6 mb-6">
              <div className="text-5xl font-black text-teal-600 mb-2">{score}%</div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r text-white text-xs font-black mb-2 shadow-md">
                {getLevelBadge(score).label}
              </div>
              <p className="text-xs text-gray-500">{getLevelBadge(score).text}</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-6 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم إصدار شهادة اجتياز تشخيصية معتمدة وإضافتها لسجل إنجازاتك تلقائياً!</span>
            </div>

            <button onClick={() => router.push('/student')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black text-sm shadow-xl shadow-teal-500/30">
              الدخول إلى لوحة تحكم الطالب الآن 🚀
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
