import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, ChoiceButton, ErrorNotice, Field, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

const relationships = [
  { value: 'father', title: 'الأب' },
  { value: 'mother', title: 'الأم' },
  { value: 'guardian', title: 'ولي / وصي' },
] as const;

export default function LinkStudentScreen() {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const [canSetName, setCanSetName] = useState(false);
  const [code, setCode] = useState('');
  const [relationship, setRelationship] = useState<'father' | 'mother' | 'guardian'>('father');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiClient.get<{ name?: string; firstName?: string; lastName?: string; phone?: string }>('/users/me')
      .then(({ data }) => {
        if (!mounted) return;
        const registeredName = data.name?.trim() || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
        setName(registeredName);
        setCanSetName(!registeredName);
        setPhone(data.phone ?? '');
        setProfileReady(true);
      })
      .catch((loadError: any) => {
        if (mounted) {
          const message = loadError?.response?.data?.message;
          setError(Array.isArray(message) ? message.join('، ') : message || 'تعذر تحميل بيانات ولي الأمر.');
        }
      });
    return () => { mounted = false; };
  }, []);

  const submit = async () => {
    if (canSetName && name.trim().length < 2) return setError('أدخل اسم ولي الأمر الكامل.');
    if (!/^[+0-9()\-\s]{7,30}$/.test(phone.trim())) return setError('أدخل رقم جوال صحيحًا.');
    if (!/^[a-fA-F0-9]{16}$/.test(code.trim())) return setError('رمز الطالب يتكون من 16 خانة من الأرقام والحروف A-F.');
    setLoading(true);
    setError('');
    try {
      await apiClient.patch('/users/me', { ...(canSetName ? { name: name.trim() } : {}), phone: phone.trim() });
      await apiClient.post('/users/link-student', { code: code.trim().toUpperCase(), relationship });
      await refreshProfile();
    } catch (linkError: any) {
      const message = linkError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('، ') : message || 'تعذر ربط الطالب. تحقق من الرمز ثم حاول مجددًا.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppPage>
      <BrandHeader />
      <Animated.View entering={FadeInDown.duration(350)} style={styles.body}>
        <View style={styles.titleRow}><View style={styles.icon}><Ionicons name="people-outline" size={24} color={BRAND.amber} /></View><View style={styles.titleText}><ScreenTitle title="ربط حساب ولي الأمر" subtitle="أدخل رمز الربط الذي يصدره الطالب من حسابه. لا نطابق الحسابات بالأسماء أو أرقام الجوال." /></View></View>
        <Surface>
          <Text style={styles.sectionTitle}>بيانات ولي الأمر</Text>
          <Field label="الاسم الكامل" icon="person-outline" value={name} onChangeText={setName} placeholder="الاسم كما في الهوية" editable={profileReady && canSetName} />
          {profileReady && !canSetName ? <Text style={styles.noticeText}>الاسم مسجل لدى المدرسة ولا يمكن تغييره من الحساب.</Text> : null}
          <Field label="رقم الجوال" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" editable={profileReady} />
          <Text style={styles.sectionTitle}>بيانات الربط</Text>
          <Field label="رمز الطالب" icon="key-outline" value={code} onChangeText={(value) => setCode(value.replace(/[^a-fA-F0-9]/g, '').slice(0, 16))} placeholder="16 خانة" autoCapitalize="characters" maxLength={16} />
          <View style={styles.relationships}>
            {relationships.map((item) => <View key={item.value} style={styles.relationshipChoice}><ChoiceButton title={item.title} selected={relationship === item.value} onPress={() => setRelationship(item.value)} /></View>)}
          </View>
          <View style={styles.notice}><Ionicons name="lock-closed-outline" size={17} color={BRAND.teal} /><Text style={styles.noticeText}>الرمز صالح لمدة 7 أيام ويُستخدم مرة واحدة. شاركه مع ولي الأمر المقصود فقط.</Text></View>
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <PrimaryButton title="ربط الطالب ومتابعة الاستبيان" icon="link-outline" onPress={() => void submit()} loading={loading} tone="blue" />
        </Surface>
      </Animated.View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, marginTop: 18 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  titleText: { flex: 1 },
  icon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: BRAND.amberSoft },
  sectionTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  relationships: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  relationshipChoice: { flex: 1, minWidth: '30%' },
  notice: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 11, borderRadius: 11, backgroundColor: '#EEF8F5' },
  noticeText: { flex: 1, color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
});
