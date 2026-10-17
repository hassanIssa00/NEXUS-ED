import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppPage, BrandHeader, ErrorNotice, OutlineButton, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

const roleLabels: Record<string, string> = {
  STUDENT: 'طالب', PARENT: 'ولي أمر', TEACHER: 'معلم', ADMIN: 'إدارة المدرسة',
  PRINCIPAL: 'مدير المدرسة', VICE_PRINCIPAL: 'وكيل المدرسة', COUNSELOR: 'التوجيه الطلابي',
  SUPERVISOR: 'الإشراف التربوي', ACCOUNTANT: 'المحاسبة المالية', HR: 'الموارد البشرية',
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const displayName = user?.name || user?.email || 'حساب نكسس';
  const avatar = user?.avatarUrl || user?.avatar;

  const logout = async () => {
    setBusy(true);
    setError('');
    try { await signOut(); }
    catch { setError('تعذر إنهاء الجلسة محليًا. حاول مرة أخرى.'); }
    finally { setBusy(false); }
  };

  return <AppPage>
    <BrandHeader />
    <Surface style={styles.profile}>
      {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatar}><Ionicons name="person-outline" size={31} color={BRAND.teal} /></View>}
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.role}>{user?.role ? roleLabels[user.role] ?? user.role : '—'}</Text>
    </Surface>

    <Surface>
      <Text style={styles.sectionTitle}>بيانات الحساب</Text>
      <Detail label="البريد الإلكتروني" value={user?.email || '—'} />
      <Detail label="رقم الجوال" value={user?.phone || '—'} />
      <Detail label="نوع الحساب" value={user?.role ? roleLabels[user.role] ?? user.role : '—'} />
    </Surface>

    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    <OutlineButton title="تسجيل الخروج" icon="log-out-outline" onPress={() => void logout()} disabled={busy} />
  </AppPage>;
}

function Detail({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <View style={styles.detailRow}>
    <Text style={[styles.value, accent && styles.pending]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', paddingVertical: 26 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: BRAND.tealSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { color: BRAND.ink, fontSize: 20, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  role: { color: BRAND.muted, fontSize: 14, marginTop: 5, writingDirection: 'rtl' },
  sectionTitle: { color: BRAND.ink, fontSize: 16, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BRAND.line },
  label: { color: BRAND.muted, fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  value: { flex: 1, color: BRAND.ink, fontSize: 13, textAlign: 'left' },
  pending: { color: BRAND.amber },
});
