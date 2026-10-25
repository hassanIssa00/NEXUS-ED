import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, ChoiceButton, ErrorNotice, Field, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

const subjects = [
  ['ARABIC', 'اللغة العربية'], ['ISLAMIC_STUDIES', 'الدراسات الإسلامية'], ['MATHEMATICS', 'الرياضيات'],
  ['SCIENCE', 'العلوم'], ['ENGLISH', 'اللغة الإنجليزية'], ['SOCIAL_STUDIES', 'الدراسات الاجتماعية'],
  ['PHYSICAL_EDUCATION', 'التربية البدنية'], ['ART_EDUCATION', 'التربية الفنية'], ['DIGITAL_SKILLS', 'المهارات الرقمية'],
  ['LIFE_SKILLS', 'المهارات الحياتية والأسرية'], ['ACTIVITY', 'النشاط'],
] as const;

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [teacherPhoto, setTeacherPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const chooseTeacherPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('اسمح للتطبيق بالوصول إلى الصور لاختيار صورة المعلم.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!result.canceled) setTeacherPhoto(result.assets[0]);
  };

  const submit = async () => {
    if (name.trim().length < 2) return setError('اكتب الاسم الكامل.');
    if (!/^[+0-9()\-\s]{7,30}$/.test(phone.trim())) return setError('اكتب رقم جوال صحيحًا مع مفتاح الدولة عند الحاجة.');
    if (!email.trim() || !email.includes('@')) return setError('اكتب بريدًا إلكترونيًا صحيحًا.');
    if (password.length < 8) return setError('كلمة المرور يجب ألا تقل عن 8 أحرف.');
    if (password !== confirm) return setError('تأكيد كلمة المرور غير مطابق.');
    if (role === 'teacher') {
      if (!teacherCode.trim()) return setError('أدخل كود تسجيل المعلم الصادر من المدرسة.');
      if (!/^[12]\d{9}$/.test(nationalId)) return setError('رقم الهوية أو الإقامة يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2.');
      if (!subjects.some(([key]) => key === specialization)) return setError('اختر تخصصك من المواد المعتمدة للمرحلة الابتدائية.');
      if (!teacherPhoto) return setError('أضف صورة شخصية للمعلم لإكمال طلب التسجيل.');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(teacherPhoto.mimeType || '') || (teacherPhoto.fileSize ?? 0) > 512 * 1024) {
        return setError('الصورة يجب أن تكون JPEG أو PNG أو WebP وألا يتجاوز حجمها 512 كيلوبايت.');
      }
      const experience = yearsExperience.trim() ? Number(yearsExperience) : undefined;
      if (experience !== undefined && (!Number.isInteger(experience) || experience < 0 || experience > 60)) return setError('سنوات الخبرة يجب أن تكون بين 0 و60.');
    }
    setSubmitting(true);
    setError('');
    try {
      if (role === 'teacher') {
        const { data } = await apiClient.post<{ valid: boolean }>('/auth/teacher-registration/verify-code', { code: teacherCode.trim() });
        if (!data.valid) throw new Error('كود تسجيل المعلم غير صحيح. اطلب الكود من المدرسة.');
      }
      await register({
        email, password, name, phone, role,
        ...(role === 'teacher' ? {
          teacherCode: teacherCode.trim(),
          teacherProfile: { nationalId, specialization, ...(yearsExperience.trim() ? { yearsExperience: Number(yearsExperience) } : {}) },
          teacherPhoto: { uri: teacherPhoto!.uri, mimeType: teacherPhoto!.mimeType, fileName: teacherPhoto!.fileName },
        } : {}),
      });
      router.replace(role === 'student' || role === 'teacher' ? '/verify-email' : '/');
    } catch (registerError: any) {
      setError(registerError?.message || 'تعذر إنشاء الحساب. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPage contentStyle={styles.page}>
      <BrandHeader />
      <Animated.View entering={FadeInDown.duration(380)} style={styles.body}>
        <ScreenTitle title="إنشاء حساب جديد" subtitle="سجّل كطالب أو ولي أمر أو معلم بكود تسجيل المعلم." />
        <Surface style={styles.form}>
          <View style={styles.roles}>
            <TouchableOpacity onPress={() => setRole('student')} style={[styles.role, role === 'student' && styles.studentSelected]}>
              <Ionicons name="school-outline" size={19} color={role === 'student' ? BRAND.teal : BRAND.muted} />
              <Text style={[styles.roleText, role === 'student' && { color: BRAND.teal }]}>طالب</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRole('parent')} style={[styles.role, role === 'parent' && styles.parentSelected]}>
              <Ionicons name="people-outline" size={19} color={role === 'parent' ? BRAND.amber : BRAND.muted} />
              <Text style={[styles.roleText, role === 'parent' && { color: BRAND.amber }]}>ولي أمر</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRole('teacher')} style={[styles.role, role === 'teacher' && styles.teacherSelected]}>
              <Ionicons name="book-outline" size={19} color={role === 'teacher' ? BRAND.blue : BRAND.muted} />
              <Text style={[styles.roleText, role === 'teacher' && { color: BRAND.blue }]}>معلم</Text>
            </TouchableOpacity>
          </View>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <Field label={role === 'student' ? 'اسم الطالب الكامل' : role === 'parent' ? 'اسم ولي الأمر الكامل' : 'اسم المعلم الكامل'} icon="person-outline" value={name} onChangeText={setName} placeholder="الاسم كما في السجلات الرسمية" autoComplete="name" />
          <Field label="رقم الجوال" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" autoComplete="tel" />
          <Field label="البريد الإلكتروني" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          {role === 'teacher' ? <>
            <View style={styles.teacherPanel}>
              <Text style={styles.teacherHeading}>بيانات المعلم</Text>
              <Field label="كود تسجيل المعلم" icon="key-outline" value={teacherCode} onChangeText={setTeacherCode} placeholder="الكود الصادر من المدرسة" autoCapitalize="characters" />
              <Field label="رقم الهوية الوطنية أو الإقامة" icon="card-outline" value={nationalId} onChangeText={(value) => setNationalId(value.replace(/\D/g, '').slice(0, 10))} placeholder="10 أرقام" keyboardType="number-pad" maxLength={10} />
              <Text style={styles.subjectLabel}>التخصص أو المادة</Text>
              <View style={styles.subjects}>{subjects.map(([key, label]) => <ChoiceButton key={key} title={label} selected={specialization === key} onPress={() => setSpecialization(key)} />)}</View>
              <Field label="سنوات الخبرة (اختياري)" icon="briefcase-outline" value={yearsExperience} onChangeText={(value) => setYearsExperience(value.replace(/\D/g, '').slice(0, 2))} placeholder="0" keyboardType="number-pad" maxLength={2} />
              <View style={styles.photoRow}>
                <TouchableOpacity accessibilityRole="button" onPress={() => void chooseTeacherPhoto()} style={styles.photoButton}>
                  {teacherPhoto ? <Image source={{ uri: teacherPhoto.uri }} style={styles.photo} /> : <Ionicons name="camera-outline" size={22} color={BRAND.blue} />}
                </TouchableOpacity>
                <View style={styles.photoCopy}><Text style={styles.photoTitle}>الصورة الشخصية *</Text><Text style={styles.photoHint}>JPEG أو PNG أو WebP · حتى 512 كيلوبايت</Text></View>
              </View>
              <Text style={styles.teacherNote}>بعد تأكيد بريدك الإلكتروني يمكنك تسجيل الدخول. وستظهر لك المواد والفصول المرتبطة بحسابك.</Text>
            </View>
          </> : null}
          <Field label="كلمة المرور" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="8 أحرف على الأقل" secureTextEntry autoCapitalize="none" autoComplete="new-password" />
          <Field label="تأكيد كلمة المرور" icon="checkmark-circle-outline" value={confirm} onChangeText={setConfirm} placeholder="أعد كتابة كلمة المرور" secureTextEntry autoCapitalize="none" autoComplete="new-password" onSubmitEditing={() => void submit()} />
          <Text style={styles.privacy}>{role === 'student' ? 'بعد تأكيد البريد، أكمل الملف الدراسي ثم اختبار تحديد المستوى.' : role === 'parent' ? 'بعد إنشاء الحساب، أكمل بيانات ولي الأمر واربط الطالب برمزه ثم أجب عن الاستبيان.' : 'بعد تأكيد بريدك الإلكتروني يصبح حسابك جاهزًا لتسجيل الدخول.'}</Text>
          <PrimaryButton title="إنشاء الحساب ومتابعة الإعداد" icon="arrow-forward" onPress={() => void submit()} loading={submitting} tone={role === 'parent' ? 'blue' : 'teal'} />
          <View style={styles.loginRow}><Text style={styles.muted}>لديك حساب بالفعل؟</Text><Link href="/login" asChild><TouchableOpacity><Text style={styles.link}>تسجيل الدخول</Text></TouchableOpacity></Link></View>
        </Surface>
      </Animated.View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 10 },
  body: { gap: 16, marginTop: 20 },
  form: { padding: 17, gap: 15 },
  roles: { flexDirection: 'row-reverse', gap: 9 },
  role: { flex: 1, minHeight: 46, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: '#F8FAFB' },
  studentSelected: { borderColor: '#85D6C5', backgroundColor: BRAND.tealSoft },
  parentSelected: { borderColor: '#F1D3A0', backgroundColor: BRAND.amberSoft },
  teacherSelected: { borderColor: '#AACBFF', backgroundColor: BRAND.blueSoft },
  roleText: { color: BRAND.muted, fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  teacherPanel: { gap: 11, padding: 13, borderWidth: 1, borderColor: '#D6E5FF', borderRadius: 14, backgroundColor: '#F5F9FF' },
  teacherHeading: { color: BRAND.blue, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subjectLabel: { color: BRAND.ink, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  subjects: { gap: 7 },
  photoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  photoButton: { width: 56, height: 56, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#AACBFF', backgroundColor: '#FFFFFF' },
  photo: { width: 56, height: 56 },
  photoCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  photoTitle: { color: BRAND.ink, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  photoHint: { color: BRAND.muted, fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  teacherNote: { color: BRAND.muted, fontSize: 11, lineHeight: 17, textAlign: 'right', writingDirection: 'rtl' },
  privacy: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  loginRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, paddingTop: 2 },
  muted: { color: BRAND.muted, fontSize: 13, writingDirection: 'rtl' },
  link: { color: BRAND.blue, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
});
