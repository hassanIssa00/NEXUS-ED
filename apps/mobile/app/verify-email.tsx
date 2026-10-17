import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, ErrorNotice, OutlineButton, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailScreen() {
  const { user, sendVerificationEmail, refreshVerifiedSession, signOut } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.emailVerified) router.replace('/');
  }, [router, user?.emailVerified]);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch (sendError: any) {
      setError(sendError?.message || 'تعذر إرسال رسالة التحقق.');
    } finally {
      setSending(false);
    }
  };

  const check = async () => {
    setChecking(true);
    setError('');
    try {
      const profile = await refreshVerifiedSession();
      if (profile?.emailVerified) router.replace('/');
      else setError('لم يتم التحقق بعد. افتح رابط الرسالة ثم أعد المحاولة.');
    } catch (checkError: any) {
      setError(checkError?.message || 'تعذر تحديث حالة التحقق.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppPage contentStyle={styles.page}>
      <BrandHeader />
      <View style={styles.body}>
        <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={27} color={BRAND.teal} /></View>
        <ScreenTitle title="تحقق من بريدك الإلكتروني" subtitle="اكتمل إعداد الحساب. التحقق من البريد هو الخطوة الأخيرة قبل فتح لوحة الحساب." />
        <Surface>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <View style={styles.mailSummary}><Ionicons name="mail-outline" size={19} color={BRAND.teal} /><Text style={styles.email}>{user?.email}</Text></View>
          <Text style={styles.note}>{sent ? 'أرسلنا رابط التحقق. افتحه من جهازك، ثم ارجع واضغط على «تحققت من بريدي».' : 'أرسل رابط التحقق إلى بريد الحساب. لن يُطلب منك إدخال بياناتك مرة أخرى.'}</Text>
          <PrimaryButton title={sent ? 'إعادة إرسال الرابط' : 'إرسال رابط التحقق'} icon="send-outline" onPress={() => void send()} loading={sending} />
          <OutlineButton title="تحققت من بريدي" icon="checkmark-circle-outline" onPress={() => void check()} disabled={checking} />
          <Text style={styles.checking}>{checking ? 'جارٍ تحديث حالة الحساب…' : ''}</Text>
        </Surface>
        <Text onPress={() => void signOut()} style={styles.signOut}>تسجيل الخروج</Text>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 10 },
  body: { gap: 17, marginTop: 38 },
  icon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: BRAND.tealSoft },
  mailSummary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, padding: 13, borderRadius: 12, backgroundColor: '#F1FAF7' },
  email: { flex: 1, color: BRAND.ink, fontSize: 14, textAlign: 'right' },
  note: { color: BRAND.muted, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  checking: { color: BRAND.muted, fontSize: 12, textAlign: 'center', minHeight: 15 },
  signOut: { color: BRAND.red, fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 10, writingDirection: 'rtl' },
});
