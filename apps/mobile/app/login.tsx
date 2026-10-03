import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, loading } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('بيانات الدخول', 'أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.';
      Alert.alert('تعذر تسجيل الدخول', Array.isArray(message) ? message.join('، ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.brandMark}><Text style={styles.brandInitial}>N</Text></View>
          <Text style={styles.brand}>نكسس التعليمية</Text>
          <Text style={styles.subtitle}>سجّل الدخول إلى حساب المدرسة</Text>

          <View style={styles.form}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textAlign="right"
              accessibilityLabel="البريد الإلكتروني"
            />
            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              textAlign="right"
              accessibilityLabel="كلمة المرور"
            />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void handleLogin()}
              disabled={submitting || loading}
              style={[styles.button, (submitting || loading) && styles.disabled]}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>دخول</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { flex: 1, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 24 },
  brandMark: { width: 58, height: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#365CF5', marginBottom: 16 },
  brandInitial: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  brand: { color: '#182230', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#52627A', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 30 },
  form: { padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E9F0', borderRadius: 8 },
  label: { color: '#344054', fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 7, marginTop: 8 },
  input: { minHeight: 48, paddingHorizontal: 12, color: '#182230', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D7E2', borderRadius: 6, fontSize: 15 },
  button: { minHeight: 48, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#365CF5' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
