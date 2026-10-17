import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, ChoiceButton, ErrorNotice, Field, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) return setError('اكتب الاسم الكامل.');
    if (!/^[+0-9()\-\s]{7,30}$/.test(phone.trim())) return setError('اكتب رقم جوال صحيحًا مع مفتاح الدولة عند الحاجة.');
    if (!email.trim() || !email.includes('@')) return setError('اكتب بريدًا إلكترونيًا صحيحًا.');
    if (password.length < 8) return setError('كلمة المرور يجب ألا تقل عن 8 أحرف.');
    if (password !== confirm) return setError('تأكيد كلمة المرور غير مطابق.');
    setSubmitting(true);
    setError('');
    try {
      await register({ email, password, name, phone, role });
      router.replace('/');
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
        <ScreenTitle title="إنشاء حساب جديد" subtitle="حسابات التسجيل الذاتي متاحة للطالب وولي الأمر." />
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
          </View>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <Field label={role === 'student' ? 'اسم الطالب الكامل' : 'اسم ولي الأمر الكامل'} icon="person-outline" value={name} onChangeText={setName} placeholder="الاسم كما في السجلات الرسمية" autoComplete="name" />
          <Field label="رقم الجوال" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" autoComplete="tel" />
          <Field label="البريد الإلكتروني" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="كلمة المرور" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="8 أحرف على الأقل" secureTextEntry autoCapitalize="none" autoComplete="new-password" />
          <Field label="تأكيد كلمة المرور" icon="checkmark-circle-outline" value={confirm} onChangeText={setConfirm} placeholder="أعد كتابة كلمة المرور" secureTextEntry autoCapitalize="none" autoComplete="new-password" onSubmitEditing={() => void submit()} />
          <Text style={styles.privacy}>بعد إنشاء الحساب، أكمل الملف الدراسي. ويُستخدم رمز المدرسة لإثبات ربط ولي الأمر بالطالب.</Text>
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
  roleText: { color: BRAND.muted, fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  privacy: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  loginRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, paddingTop: 2 },
  muted: { color: BRAND.muted, fontSize: 13, writingDirection: 'rtl' },
  link: { color: BRAND.blue, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
});
