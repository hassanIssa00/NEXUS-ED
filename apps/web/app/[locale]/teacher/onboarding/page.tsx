'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api/client';
import { Camera, Check, GraduationCap, LoaderCircle, Plus, UserRound, X } from 'lucide-react';

type AssignedClass = { id: string; name: string; academicYear: string | null; classCode: string };
type TeacherProfileOptions = {
  classes: AssignedClass[];
  avatar: string | null;
  profile: {
    specialization: string;
    residenceNumber: string | null;
    classCodes: string[];
    homeroomCode: string;
  } | null;
};

const PRIMARY_SUBJECTS = [
  { value: 'القرآن الكريم والدراسات الإسلامية', en: 'Qur’an and Islamic Studies' },
  { value: 'اللغة العربية', en: 'Arabic Language' },
  { value: 'الرياضيات', en: 'Mathematics' },
  { value: 'العلوم', en: 'Science' },
  { value: 'اللغة الإنجليزية', en: 'English Language' },
  { value: 'الدراسات الاجتماعية', en: 'Social Studies' },
  { value: 'المهارات الرقمية', en: 'Digital Skills' },
  { value: 'التربية الفنية', en: 'Art Education' },
  { value: 'التربية البدنية والدفاع عن النفس', en: 'Physical Education and Self-Defense' },
  { value: 'المهارات الحياتية والأسرية', en: 'Life and Family Skills' },
] as const;

const copy = {
  ar: {
    eyebrow: 'إعداد حساب المعلم', title: 'بيانات المعلم',
    intro: 'أضف رقم الهوية أو الإقامة وصورتك والمادة التي تدرّسها. ربط الفصول بالكود اختياري ويمكنك عمله لاحقًا.',
    photo: 'الصورة الشخصية', changePhoto: 'اختيار صورة', photoHint: 'JPEG أو PNG أو WebP، بحد أقصى 512 كيلوبايت',
    name: 'الاسم', email: 'البريد الإلكتروني', phone: 'رقم الجوال',
    residenceNumber: 'رقم الهوية الوطنية أو الإقامة', residenceHint: 'أدخل الرقم المكوّن من 10 أرقام',
    subject: 'التخصص أو المادة', chooseSubject: 'اختر المادة التي تدرّسها',
    classes: 'ربط الفصول (اختياري)', classesHint: 'أدخل كودًا لكل فصل تدرّسه. يمكنك تخطي الخطوة وإضافة الأكواد لاحقًا من إعدادات المعلم.',
    codePlaceholder: 'مثال: CLS-AB12-CD34-EF56', addCode: 'إضافة الكود', removeCode: 'حذف الكود',
    codeHint: 'تحصل على أكواد الفصول من إدارة المدرسة.', homeroom: 'كود فصل الريادة (اختياري)',
    noHomeroom: 'لا تحدد فصل ريادة الآن', homeroomHint: 'اختر أحد أكواد الفصول التي أضفتها، أو حدده لاحقًا.',
    save: 'حفظ البيانات والانتقال إلى لوحة المعلم', saving: 'جارٍ حفظ البيانات...',
    loading: 'جارٍ تحميل البيانات...', saved: 'تم حفظ بيانات المعلم بنجاح.',
    loadError: 'تعذر تحميل ملف المعلم. حاول تحديث الصفحة.',
    photoRequired: 'أضف صورتك الشخصية للمتابعة.', invalidPhoto: 'اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 512 كيلوبايت.',
    invalidResidence: 'أدخل رقم هوية أو إقامة صحيحًا من 10 أرقام.', required: 'اختر المادة وأدخل رقم الهوية أو الإقامة.',
    duplicateCode: 'هذا الكود مضاف بالفعل.', invalidClassCode: 'تأكد من إدخال كود فصل صحيح.',
  },
  en: {
    eyebrow: 'Teacher account setup', title: 'Teacher details',
    intro: 'Add your national ID or residency number, photo, and subject. Linking classes is optional and can be done later.',
    photo: 'Profile photo', changePhoto: 'Choose a photo', photoHint: 'JPEG, PNG, or WebP, up to 512 KB',
    name: 'Name', email: 'Email', phone: 'Mobile number',
    residenceNumber: 'National ID or residency number', residenceHint: 'Enter the 10-digit number',
    subject: 'Subject or specialization', chooseSubject: 'Choose the subject you teach',
    classes: 'Link classes (optional)', classesHint: 'Enter a code for each class you teach. Skip this step and add codes later from teacher settings.',
    codePlaceholder: 'Example: CLS-AB12-CD34-EF56', addCode: 'Add code', removeCode: 'Remove code',
    codeHint: 'Get class codes from the school administration.', homeroom: 'Homeroom class code (optional)',
    noHomeroom: 'Do not choose a homeroom class yet', homeroomHint: 'Choose one of your class codes, or set it later.',
    save: 'Save details and open teacher dashboard', saving: 'Saving details...',
    loading: 'Loading your details...', saved: 'Teacher details saved.',
    loadError: 'Could not load your teacher profile. Refresh the page.',
    photoRequired: 'Add a profile photo to continue.', invalidPhoto: 'Choose a JPEG, PNG, or WebP image up to 512 KB.',
    invalidResidence: 'Enter a valid 10-digit national ID or residency number.', required: 'Choose a subject and enter your ID or residency number.',
    duplicateCode: 'This class code has already been added.', invalidClassCode: 'Enter a valid class code.',
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
  const [residenceNumber, setResidenceNumber] = useState('');
  const [classCodeInput, setClassCodeInput] = useState('');
  const [classCodes, setClassCodes] = useState<string[]>([]);
  const [homeroomCode, setHomeroomCode] = useState('');
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
          setSpecialization(PRIMARY_SUBJECTS.some((subject) => subject.value === data.profile?.specialization) ? data.profile.specialization : '');
          setResidenceNumber(data.profile.residenceNumber || '');
          setClassCodes(data.profile.classCodes);
          setHomeroomCode(data.profile.homeroomCode);
        }
      })
      .catch((fetchError) => {
        if (active) setError(errorMessage(fetchError, t.loadError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t.loadError]);

  const assignedClassByCode = useMemo(() => new Map((options?.classes ?? []).map((item) => [item.classCode, item])), [options?.classes]);

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

  const addClassCode = () => {
    const code = classCodeInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^CLS-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
      setError(t.invalidClassCode);
      return;
    }
    if (classCodes.includes(code)) {
      setError(t.duplicateCode);
      return;
    }
    setError('');
    setClassCodes((current) => [...current, code]);
    setClassCodeInput('');
  };

  const removeClassCode = (code: string) => {
    setClassCodes((current) => current.filter((item) => item !== code));
    if (homeroomCode === code) setHomeroomCode('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!avatar && !avatarFile) { setError(t.photoRequired); return; }
    if (!specialization || !residenceNumber) { setError(t.required); return; }
    if (!/^[12]\d{9}$/.test(residenceNumber)) { setError(t.invalidResidence); return; }
    if (homeroomCode && !classCodes.includes(homeroomCode)) { setError(t.homeroomHint); return; }

    setSaving(true);
    try {
      await apiClient.put('/auth/teacher-profile', {
        specialization,
        residenceNumber,
        classCodes,
        homeroomCode: homeroomCode || undefined,
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
              <label htmlFor="teacher-residence-number" className="mb-1.5 block text-xs font-bold text-slate-600">{t.residenceNumber} *</label>
              <input id="teacher-residence-number" type="text" inputMode="numeric" autoComplete="off" maxLength={10} pattern="[12][0-9]{9}" dir="ltr" className={inputClass} value={residenceNumber} onChange={(event) => setResidenceNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={t.residenceHint} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="teacher-specialization" className="mb-1.5 block text-xs font-bold text-slate-600">{t.subject} *</label>
              <select id="teacher-specialization" className={inputClass} value={specialization} onChange={(event) => setSpecialization(event.target.value)} required>
                <option value="">{t.chooseSubject}</option>
                {PRIMARY_SUBJECTS.map((subject) => <option key={subject.value} value={subject.value}>{isEnglish ? subject.en : subject.value}</option>)}
              </select>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <h2 className="font-bold text-slate-900">{t.classes}</h2>
              <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{t.classesHint}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className={inputClass} value={classCodeInput} onChange={(event) => setClassCodeInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addClassCode(); } }} placeholder={t.codePlaceholder} dir="ltr" />
                <button type="button" onClick={addClassCode} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />{t.addCode}</button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{t.codeHint}</p>
            </div>

            {classCodes.length > 0 && <div className="flex flex-wrap gap-2">{classCodes.map((code) => {
              const schoolClass = assignedClassByCode.get(code);
              return <span key={code} className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900" dir="ltr"><span>{schoolClass ? `${schoolClass.name} · ` : ''}{code}</span><button type="button" onClick={() => removeClassCode(code)} aria-label={`${t.removeCode} ${code}`} className="rounded-full p-0.5 hover:bg-teal-100"><X className="h-3.5 w-3.5" /></button></span>;
            })}</div>}

            <div>
              <label htmlFor="teacher-homeroom-code" className="mb-1.5 block text-sm font-bold text-slate-900">{t.homeroom}</label>
              <select id="teacher-homeroom-code" className={inputClass} value={homeroomCode} onChange={(event) => setHomeroomCode(event.target.value)} disabled={!classCodes.length}>
                <option value="">{t.noHomeroom}</option>
                {classCodes.map((code) => <option key={code} value={code}>{assignedClassByCode.get(code)?.name || code}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">{t.homeroomHint}</p>
            </div>
          </section>

          <button type="submit" disabled={saving || uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? t.saving : t.save}
          </button>
        </div>
      </form>
    </main>
  );
}
