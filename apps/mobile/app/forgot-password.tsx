import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, ErrorNotice, Field, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !email.includes('@')) return setError('أدخل البريد الإلكتروني المسجل.');
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (resetError: any) {
      setError(resetError?.message || 'تعذر إرسال رابط الاستعادة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppPage contentStyle={styles.page}>
      <BrandHeader />
      <View style={styles.body}>
        <View style={styles.icon}><Ionicons name="key-outline" size={26} color={BRAND.blue} /></View>
        <ScreenTitle title="استعادة كلمة المرور" subtitle="سنرسل إلى بريدك رابطًا آمنًا لإعادة تعيين كلمة المرور." />
        <Surface>
          {sent ? <View style={styles.success}><Ionicons name="mail-open-outline" size={27} color={BRAND.teal} /><Text style={styles.successTitle}>تم إرسال طلب الاستعادة</Text><Text style={styles.successCopy}>افتح رسالة نكسس في بريدك واتبع الرابط. إذا لم تظهر، افحص مجلد الرسائل غير المرغوب فيها.</Text></View> : <>
            {error ? <ErrorNotice>{error}</ErrorNotice> : null}
            <Field label="البريد الإلكتروني" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <PrimaryButton title="إرسال رابط الاستعادة" icon="send-outline" onPress={() => void submit()} loading={loading} tone="blue" />
          </>}
          <Link href="/login" style={styles.back}>العودة لتسجيل الدخول</Link>
        </Surface>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 10 },
  body: { gap: 17, marginTop: 40 },
  icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: BRAND.blueSoft },
  success: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  successTitle: { color: BRAND.ink, fontSize: 17, fontWeight: '800', writingDirection: 'rtl' },
  successCopy: { color: BRAND.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', writingDirection: 'rtl' },
  back: { color: BRAND.blue, fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: 4, writingDirection: 'rtl' },
});
