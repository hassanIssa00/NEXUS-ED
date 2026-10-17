import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, ErrorNotice, Field, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';

const REMEMBERED_CREDENTIALS_KEY = 'nexus.remembered_login';

type Portal = 'STUDENT' | 'PARENT' | 'STAFF';
const portalOptions: Array<{ id: Portal; title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { id: 'STUDENT', title: 'طالب', icon: 'school-outline' },
  { id: 'PARENT', title: 'ولي أمر', icon: 'people-outline' },
  { id: 'STAFF', title: 'موظف المدرسة', icon: 'briefcase-outline' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [portal, setPortal] = useState<Portal>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync(REMEMBERED_CREDENTIALS_KEY).then((value) => {
      if (!value) return;
      const saved = JSON.parse(value) as { email?: string; password?: string; portal?: Portal };
      if (saved.email && saved.password) {
        setEmail(saved.email);
        setPassword(saved.password);
        if (saved.portal) setPortal(saved.portal);
        setRemember(true);
      }
    }).catch(() => undefined);
  }, []);

  const submit = async () => {
    if (!email.trim() || !password) return setError('أدخل البريد الإلكتروني وكلمة المرور.');
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password, portal);
      try {
        if (remember) await SecureStore.setItemAsync(REMEMBERED_CREDENTIALS_KEY, JSON.stringify({ email: email.trim(), password, portal }));
        else await SecureStore.deleteItemAsync(REMEMBERED_CREDENTIALS_KEY);
      } catch {
        // A failed opt-in credential save must not undo a valid sign-in.
      }
      router.replace('/');
    } catch (loginError: any) {
      setError(loginError?.message || 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPage contentStyle={styles.page}>
      <BrandHeader />
      <View style={styles.body}>
        <View style={styles.intro}>
          <View style={styles.mark}><Ionicons name="book" size={25} color={BRAND.teal} /></View>
          <ScreenTitle title="مرحبًا بعودتك" subtitle="اختر بوابتك وسجّل الدخول إلى حساب نكسس." />
        </View>
        <Surface style={styles.form}>
          <View style={styles.segment}>
            {portalOptions.map((option) => (
              <TouchableOpacity key={option.id} accessibilityRole="button" accessibilityState={{ selected: portal === option.id }} onPress={() => setPortal(option.id)} style={[styles.segmentOption, portal === option.id && styles.segmentSelected]}>
                <Ionicons name={option.icon} size={17} color={portal === option.id ? '#FFFFFF' : BRAND.muted} />
                <Text style={[styles.segmentText, portal === option.id && styles.segmentTextSelected]}>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <Field label="البريد الإلكتروني" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next" />
          <Field label="كلمة المرور" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="أدخل كلمة المرور" secureTextEntry autoCapitalize="none" autoComplete="current-password" onSubmitEditing={() => void submit()} />
          <View style={styles.forgotRow}>
            <Link href="/forgot-password" asChild><TouchableOpacity><Text style={styles.link}>نسيت كلمة المرور؟</Text></TouchableOpacity></Link>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => {
              setRemember((current) => !current);
              if (remember) void SecureStore.deleteItemAsync(REMEMBERED_CREDENTIALS_KEY).catch(() => undefined);
            }} style={styles.remember}>
              <Ionicons name={remember ? 'checkbox' : 'square-outline'} size={19} color={remember ? BRAND.teal : BRAND.muted} />
              <Text style={styles.helper}>تذكرني على هذا الجهاز</Text>
            </TouchableOpacity>
          </View>
          <PrimaryButton title="تسجيل الدخول" icon="arrow-forward" onPress={() => void submit()} loading={submitting} />
          <Link href="/register" asChild>
            <TouchableOpacity style={styles.registerLink}><Ionicons name="person-add-outline" size={17} color={BRAND.blue} /><Text style={styles.registerText}>إنشاء حساب طالب أو ولي أمر</Text></TouchableOpacity>
          </Link>
          <Text style={styles.staffNote}>حسابات المعلمين والموظفين تصدرها إدارة المدرسة.</Text>
        </Surface>
      </View>
      <Text style={styles.footer}>Nexus EDU · مدارس الإخلاص الأهلية</Text>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 10, paddingBottom: 24, gap: 18 },
  body: { width: '100%', gap: 18 },
  intro: { alignItems: 'flex-end', gap: 10, paddingHorizontal: 4 },
  mark: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: BRAND.tealSoft },
  form: { padding: 18, gap: 16 },
  segment: { flexDirection: 'row-reverse', gap: 5, padding: 4, borderRadius: 14, backgroundColor: '#F0F3F5' },
  segmentOption: { flex: 1, minHeight: 42, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 11 },
  segmentSelected: { backgroundColor: BRAND.ink },
  segmentText: { color: BRAND.muted, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  segmentTextSelected: { color: '#FFFFFF' },
  forgotRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: -5, gap: 8 },
  remember: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, minHeight: 36 },
  link: { color: BRAND.blue, fontSize: 13, fontWeight: '700', writingDirection: 'rtl' },
  helper: { color: BRAND.muted, fontSize: 11, writingDirection: 'rtl' },
  registerLink: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 42 },
  registerText: { color: BRAND.blue, fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  staffNote: { color: BRAND.muted, fontSize: 12, textAlign: 'center', writingDirection: 'rtl' },
  footer: { color: '#8795A7', fontSize: 11, textAlign: 'center', marginBottom: 4 },
});
