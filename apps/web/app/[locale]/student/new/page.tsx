'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Calendar, IdCard, Users, ArrowLeft, Camera, Sparkles, CheckCircle2, Upload, Trash2, GraduationCap } from 'lucide-react';
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<'kindergarten' | 'elementary' | 'middle' | 'high'>('elementary');

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
            if (photoUrl) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('nexus_student_photo', photoUrl);
          try {
            const uStr = localStorage.getItem('nexus_user');
            if (uStr) {
              const u = JSON.parse(uStr);
              u.photoUrl = photoUrl;
              u.stage = stage;
              localStorage.setItem('nexus_user', JSON.stringify(u));
            }
          } catch {}
          window.dispatchEvent(new CustomEvent('nexus:data-changed'));
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_student_stage', stage);
      }
      let uName = 'طالب مسجل';
      let uEmail = '';
      let uPhone = '';
      let uId = requestedStudentId || `std_${Date.now()}`;
      try {
        const uStr = localStorage.getItem('nexus_user');
        if (uStr) {
          const u = JSON.parse(uStr);
          if (u.name) uName = u.name;
          if (u.email) uEmail = u.email;
          if (u.phone) uPhone = u.phone;
        }
      } catch {}

      const stageGrade = stage === 'kindergarten' ? 'الروضة' : stage === 'middle' ? 'المرحلة المتوسطة' : stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الابتدائية';
      
      const updatedOrNewStudent = {
        id: student?.id || uId,
        universalId: student?.universalId || nexusBridge.generateUniversalId('STD'),
        fullName: student?.fullName || uName,
        fullNameEn: student?.fullNameEn || '',
        grade: student?.grade || stageGrade,
        classId: student?.classId || 'CLS-101',
        nationalId: nationalId.trim() || student?.nationalId || '',
        dateOfBirth: dateOfBirth || student?.dateOfBirth || '2018-01-01',
        parentName: student?.parentName || '',
        parentPhone: student?.parentPhone || uPhone,
        parentEmail: student?.parentEmail || uEmail,
        photoUrl: photoUrl || student?.photoUrl || undefined,
        notes: notes.trim() || student?.notes || '',
        averageGrade: student?.averageGrade ?? 100,
        attendanceRate: student?.attendanceRate ?? 100,
        rank: student?.rank ?? 1,
        assignedProgram: stage === 'kindergarten' ? 'مسار رياض الأطفال' : 'المسار العام',
        status: student?.status || ('excellent' as const),
        studentAccountId: student?.studentAccountId || uId,
        parentAccountId: student?.parentAccountId || '',
      };

      nexusBridge.saveClassStudent(updatedOrNewStudent);

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

                    {/* ─── STAGE SELECTION FOR STUDENT ─── */}
          {!isParent && (
            <div>
              <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
                المرحلة الدراسية للطالب *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'kindergarten', label: 'رياض الأطفال', emoji: '🧸' },
                  { id: 'elementary', label: 'المرحلة الابتدائية', emoji: '📚' },
                  { id: 'middle', label: 'المرحلة المتوسطة', emoji: '🔬' },
                  { id: 'high', label: 'المرحلة الثانوية', emoji: '🎓' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setStage(s.id as any)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      stage === s.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── PERSONAL PHOTO UPLOAD (اختياري) ─── */}
          <div>
            <label className="text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 block">
              الصورة الشخصية (تظهر في البطاقة ولوحة التحكم — اختياري)
            </label>
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-white/20 flex-shrink-0 shadow-inner">
                {photoUrl ? (
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition-all shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-teal-600" />
                    <span>{photoUrl ? 'تغيير الصورة' : 'اختر صورة من جهازك'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              setPhotoUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  إذا تركتها فارغة، ستظل الخانة جاهزة لتضع صورتك في أي وقت لاحقاً من داخل بطاقتك.
                </p>
              </div>
            </div>
          </div>

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
