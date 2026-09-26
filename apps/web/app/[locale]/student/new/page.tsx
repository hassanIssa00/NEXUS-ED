'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Calendar, IdCard, Users, ArrowLeft, Camera, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ClassStudentRecord } from '@/lib/nexusDataBridge';

export default function StudentNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get('flow') || 'parent';
  const requestedStudentId = searchParams.get('student') || 'cls-std-2';

  const [student, setStudent] = useState<ClassStudentRecord | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2020-04-15');
  const [parentAge, setParentAge] = useState('38');
  const [childrenCount, setChildrenCount] = useState('3');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/lib/nexusDataBridge');
        const s = nexusBridge.getStudentById(requestedStudentId);
        if (s) {
          setStudent(s);
          if (s.nationalId) setNationalId(s.nationalId);
          if (s.dateOfBirth) setDateOfBirth(s.dateOfBirth);
          if (s.notes) setNotes(s.notes);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [requestedStudentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge');
      if (student) {
        nexusBridge.saveClassStudent({
          ...student,
          nationalId: nationalId.trim() || student.nationalId,
          dateOfBirth,
          notes: notes.trim() || student.notes,
        });
      }

      if (flow === 'student') {
        router.push(`/assessment?student=${requestedStudentId}&flow=student`);
      } else {
        router.push(`/survey?student=${requestedStudentId}&flow=parent`);
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const isParent = flow === 'parent';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1015] flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
        
        <div className="text-center mb-6">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
            isParent ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-teal-50 dark:bg-teal-500/10 text-teal-600'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>الخطوة 2 من 3: استكمال البيانات الرسمية</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            {isParent ? 'بيانات ولي الأمر والأسرة' : 'بيانات الطالب الشخصية'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isParent
              ? `استكمال بيانات رب الأسرة للطالب: ${student?.fullName || 'أحمد فيصل الغامدي'}`
              : 'يرجى تزويدنا برقم الهوية وتاريخ الميلاد لإصدار السجلات المعتمدة'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
              {isParent ? 'رقم الهوية الوطنية / الإقامة لولي الأمر' : 'رقم الهوية الوطنية / شهادة الميلاد للطالب'} *
            </label>
            <div className="relative">
              <IdCard className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
              <input required value={nationalId} onChange={e => setNationalId(e.target.value)}
                placeholder="10XXXXXXXX" dir="ltr"
                className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">تاريخ ميلاد الطفل</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full pr-10 pl-3 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>

            {isParent ? (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">عمر ولي الأمر (سنة)</label>
                <input type="number" min={20} max={80} value={parentAge} onChange={e => setParentAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">الصف الدراسي</label>
                <input disabled value="الصف الأول الابتدائي"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-xs font-bold text-gray-700 dark:text-gray-300" />
              </div>
            )}
          </div>

          {isParent && (
            <div>
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">عدد الأبناء في الأسرة</label>
              <div className="relative">
                <Users className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                <input type="number" min={1} max={15} value={childrenCount} onChange={e => setChildrenCount(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">ملاحظات إضافية أو تنبيهات صحية خاصة (اختياري)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="أي ملاحظات يرغب ولي الأمر أو الطالب في إطلاع المعلم عليها..."
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-none focus:ring-2 focus:ring-blue-500/50" />
          </div>

          <div className="pt-3">
            <button type="submit" disabled={saving}
              className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-all ${
                isParent
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-teal-500/30'
              }`}>
              {saving ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  <span>{isParent ? 'حفظ والانتقال إلى استبيان ولي الأمر الشامل' : 'حفظ وبدء الاختبار التشخيصي التفاعلي'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
