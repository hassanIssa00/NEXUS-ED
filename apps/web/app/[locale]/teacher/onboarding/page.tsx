'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';
import { Camera, Check, GraduationCap, LoaderCircle, UserRound } from 'lucide-react';

type SchoolClass = { id: string; name: string; academicYear: string | null; homeroomAvailable: boolean };
type TeacherProfileOptions = {
  classes: SchoolClass[];
  subjects: string[];
  avatar: string | null;
  profile: {
    specialization: string;
    qualification: string;
    yearsExperience: number;
    bio: string | null;
    classIds: string[];
    homeroomClassId: string;
  } | null;
};

const copy = {
  ar: {
    eyebrow: 'الخطوة الأخيرة لإعداد الحساب', title: 'أكمل ملفك كمعلم',
    intro: 'أضف بياناتك التعليمية، فصولك، وفصل الريادة لتجهيز لوحة المعلم.',
    photo: 'الصورة الشخصية', changePhoto: 'اختيار صورة', photoHint: 'JPEG أو PNG أو WebP، بحد أقصى 512 كيلوبايت',
    name: 'الاسم', email: 'البريد الإلكتروني', phone: 'رقم الجوال',
    subject: 'التخصص أو المادة', subjectHint: 'مثال: الرياضيات', chooseSubject: 'اكتب أو اختر المادة',
    qualification: 'المؤهل الدراسي', qualificationHint: 'مثال: بكالوريوس تربية',
    experience: 'سنوات الخبرة', bio: 'نبذة مهنية (اختياري)', bioHint: 'خبرات أو معلومات تساعد المدرسة على التعرف عليك',
    classes: 'الفصول التي تدرّسها', classesHint: 'يمكنك اختيار أكثر من فصل.',
    homeroom: 'فصل الريادة', homeroomHint: 'اختر فصلًا واحدًا تكون رائدًا له من الفصول المحددة أعلاه.',
    noClasses: 'لا توجد فصول مسجلة في المدرسة بعد. تواصل مع الإدارة لإضافة الفصول أولًا.',
    classLed: 'له رائد بالفعل',
    save: 'حفظ الملف والانتقال إلى لوحة المعلم', saving: 'جارٍ حفظ الملف...',
    loading: 'جارٍ تحميل بيانات المدرسة...',
    saved: 'تم حفظ ملف المعلم بنجاح.', loadError: 'تعذر تحميل فصول المدرسة. حاول تحديث الصفحة.',
    photoRequired: 'أضف صورتك الشخصية للمتابعة.', invalidPhoto: 'اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 512 كيلوبايت.',
    required: 'أكمل التخصص والمؤهل واختر فصلًا واحدًا على الأقل.',
  },
  en: {
    eyebrow: 'One last step to set up your account', title: 'Complete your teacher profile',
    intro: 'Add your teaching details, assigned classes, and the one class you lead.',
    photo: 'Profile photo', changePhoto: 'Choose a photo', photoHint: 'JPEG, PNG, or WebP, up to 512 KB',
    name: 'Name', email: 'Email', phone: 'Mobile number',
    subject: 'Subject or specialization', subjectHint: 'For example: Mathematics', chooseSubject: 'Type or choose a subject',
    qualification: 'Qualification', qualificationHint: 'For example: Bachelor of Education',
    experience: 'Years of experience', bio: 'Professional summary (optional)', bioHint: 'Experience or details that help the school know you',
    classes: 'Classes you teach', classesHint: 'Select all the classes you teach.',
    homeroom: 'Homeroom class', homeroomHint: 'Choose one of your selected classes to lead.',
    noClasses: 'There are no classes registered at this school yet. Ask the administration to add classes first.',
    classLed: 'Already has a homeroom teacher',
    save: 'Save profile and open teacher dashboard', saving: 'Saving your profile...',
    loading: 'Loading school information...',
    saved: 'Your teacher profile has been saved.', loadError: 'Could not load the school classes. Refresh and try again.',
    photoRequired: 'Add a profile photo to continue.', invalidPhoto: 'Choose a JPEG, PNG, or WebP image up to 512 KB.',
    required: 'Enter your subject and qualification, then select at least one class.',
  },
} as const;

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || fallback;
}

export default function TeacherOnboardingPage() {
  const locale = useLocale();
  const isEnglish = locale === 'en';
  const t = copy[isEnglish ? 'en' : 'ar'];
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [options, setOptions] = useState<TeacherProfileOptions | null>(null);
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [bio, setBio] = useState('');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [homeroomClassId, setHomeroomClassId] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get<TeacherProfileOptions>('/auth/teacher-profile/options')
      .then(({ data }) => {
        if (!active) return;
        setOptions(data);
        setAvatar(data.avatar);
        if (data.profile) {
          setSpecialization(data.profile.specialization);
          setQualification(data.profile.qualification);
          setYearsExperience(String(data.profile.yearsExperience));
          setBio(data.profile.bio || '');
          setClassIds(data.profile.classIds);
          setHomeroomClassId(data.profile.homeroomClassId);
        }
      })
      .catch((fetchError) => {
        if (active) setError(errorMessage(fetchError, t.loadError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t.loadError]);

  const selectedClassSet = useMemo(() => new Set(classIds), [classIds]);
  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 512 * 1024) {
      setError(t.invalidPhoto);
      return;
    }
    setError('');
    setSuccess('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiClient.patch('/upload/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatar(URL.createObjectURL(file));
      setAvatarFile(file);
    } catch (uploadError) {
      setError(errorMessage(uploadError, t.invalidPhoto));
    } finally {
      setUploading(false);
    }
  };

  const toggleClass = (classId: string) => {
    setClassIds((current) => {
      if (current.includes(classId)) {
        const next = current.filter((id) => id !== classId);
        if (homeroomClassId === classId) setHomeroomClassId(next[0] || '');
        return next;
      }
      const next = [...current, classId];
      if (!homeroomClassId) setHomeroomClassId(classId);
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!avatar && !avatarFile) { setError(t.photoRequired); return; }
    if (!specialization.trim() || !qualification.trim() || classIds.length === 0) { setError(t.required); return; }
    if (!homeroomClassId || !classIds.includes(homeroomClassId)) { setError(t.homeroomHint); return; }

    setSaving(true);
    try {
      await apiClient.put('/auth/teacher-profile', {
        specialization: specialization.trim(),
        qualification: qualification.trim(),
        yearsExperience: Math.max(0, Math.min(60, Number(yearsExperience) || 0)),
        bio: bio.trim() || undefined,
        classIds,
        homeroomClassId,
      });
      await refreshProfile();
      setSuccess(t.saved);
      router.replace('/teacher');
    } catch (saveError) {
      setError(errorMessage(saveError, t.required));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';

  if (loading) return <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{t.loading}</div>;

  return (
    <main className="mx-auto max-w-3xl" dir={isEnglish ? 'ltr' : 'rtl'}>
      <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 bg-gradient-to-br from-teal-50 to-white px-6 py-7 sm:px-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800"><GraduationCap className="h-4 w-4" />{t.eyebrow}</div>
          <h1 className="text-2xl font-black text-slate-900">{t.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t.intro}</p>
        </header>

        <div className="space-y-6 px-6 py-7 sm:px-8">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-400">
              {avatar ? <img src={avatar} alt={t.photo} className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{t.photo}</h2>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Camera className="h-4 w-4" />{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t.changePhoto}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={choosePhoto} disabled={uploading} />
              </label>
              <p className="mt-1.5 text-xs text-slate-500">{t.photoHint}</p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">{t.name}</label><input className={inputClass} value={profile?.full_name || ''} readOnly /></div>
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">{t.email}</label><input className={inputClass} value={profile?.email || ''} readOnly dir="ltr" /></div>
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">{t.phone}</label><input className={inputClass} value={profile?.phone || ''} readOnly dir="ltr" /></div>
            <div>
              <label htmlFor="teacher-specialization" className="mb-1.5 block text-xs font-bold text-slate-600">{t.subject} *</label>
              <input id="teacher-specialization" list="school-subjects" className={inputClass} value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder={t.chooseSubject} required />
              <datalist id="school-subjects">{options?.subjects.map((subject) => <option key={subject} value={subject} />)}</datalist>
              <p className="mt-1 text-xs text-slate-500">{t.subjectHint}</p>
            </div>
            <div>
              <label htmlFor="teacher-qualification" className="mb-1.5 block text-xs font-bold text-slate-600">{t.qualification} *</label>
              <input id="teacher-qualification" className={inputClass} value={qualification} onChange={(event) => setQualification(event.target.value)} placeholder={t.qualificationHint} required />
            </div>
            <div>
              <label htmlFor="teacher-experience" className="mb-1.5 block text-xs font-bold text-slate-600">{t.experience}</label>
              <input id="teacher-experience" type="number" min="0" max="60" className={inputClass} value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} />
            </div>
          </section>

          <div>
            <label htmlFor="teacher-bio" className="mb-1.5 block text-xs font-bold text-slate-600">{t.bio}</label>
            <textarea id="teacher-bio" rows={3} maxLength={500} className={inputClass} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={t.bioHint} />
          </div>

          <section>
            <h2 className="font-bold text-slate-900">{t.classes} *</h2>
            <p className="mb-3 mt-1 text-xs text-slate-500">{t.classesHint}</p>
            {!options?.classes.length ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t.noClasses}</p> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {options.classes.map((schoolClass) => (
                  <label key={schoolClass.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${selectedClassSet.has(schoolClass.id) ? 'border-teal-500 bg-teal-50 text-teal-950' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selectedClassSet.has(schoolClass.id)} onChange={() => toggleClass(schoolClass.id)} className="h-4 w-4 accent-teal-700" />
                    <span className="font-semibold">{schoolClass.name}</span>
                    {schoolClass.academicYear && <span className="ms-auto text-xs text-slate-500">{schoolClass.academicYear}</span>}
                  </label>
                ))}
              </div>
            )}
          </section>

          <section>
            <label htmlFor="teacher-homeroom" className="mb-1.5 block text-sm font-bold text-slate-900">{t.homeroom} *</label>
            <select id="teacher-homeroom" className={inputClass} value={homeroomClassId} onChange={(event) => setHomeroomClassId(event.target.value)} disabled={!classIds.length} required>
              <option value="">{t.homeroomHint}</option>
              {options?.classes.filter((schoolClass) => classIds.includes(schoolClass.id)).map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id} disabled={!schoolClass.homeroomAvailable}>{schoolClass.name}{schoolClass.homeroomAvailable ? '' : ` (${t.classLed})`}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">{t.homeroomHint}</p>
          </section>

          <button type="submit" disabled={saving || uploading || !options?.classes.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? t.saving : t.save}
          </button>
        </div>
      </form>
    </main>
  );
}
