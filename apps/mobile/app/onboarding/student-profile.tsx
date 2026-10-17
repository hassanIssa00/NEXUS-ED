import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppPage, BrandHeader, ChoiceButton, ErrorNotice, Field, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

const grades = [
  { id: 0, title: 'رياض الأطفال' },
  ...Array.from({ length: 6 }, (_, index) => ({ id: index + 1, title: `الصف ${index + 1} ابتدائي` })),
  ...Array.from({ length: 3 }, (_, index) => ({ id: index + 7, title: `الصف ${index + 1} متوسط` })),
  ...Array.from({ length: 3 }, (_, index) => ({ id: index + 10, title: `الصف ${index + 1} ثانوي` })),
];

export default function StudentProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const [gradeLevel, setGradeLevel] = useState<number | null>(user?.gradeLevel ?? null);
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const currentAvatar = user?.avatarUrl || user?.avatar;

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('اسمح للتطبيق بالوصول إلى الصور لاختيار صورة الطالب.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
      setError('');
    }
  };

  const submit = async () => {
    if (gradeLevel === null) return setError('حدد الصف الدراسي.');
    if (!/^\d{10}$/.test(nationalId)) return setError('رقم الهوية يجب أن يتكون من 10 أرقام.');
    if (!photo && !currentAvatar) return setError('أضف صورة واضحة للطالب لإكمال الملف.');
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return setError('اكتب تاريخ الميلاد بالصيغة سنة-شهر-يوم.');

    setSaving(true);
    setError('');
    try {
      if (photo) {
        const form = new FormData();
        const extension = photo.uri.split('.').pop()?.toLowerCase() || 'jpg';
        form.append('file', { uri: photo.uri, name: `student-avatar.${extension}`, type: photo.mimeType || 'image/jpeg' } as any);
        await apiClient.patch('/upload/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await apiClient.put('/users/me/student-profile', {
        gradeLevel,
        nationalId,
        ...(dateOfBirth ? { dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString() } : {}),
      });
      const profile = await refreshProfile();
      if (!profile) setError('تم حفظ البيانات، لكن تعذر تحديث خطوة الإعداد. اسحب للتحديث أو سجّل الدخول مجددًا.');
    } catch (saveError: any) {
      const message = saveError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join('، ') : message || saveError?.message || 'تعذر حفظ الملف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPage>
      <BrandHeader />
      <Animated.View entering={FadeInDown.duration(350)} style={styles.body}>
        <ScreenTitle title="الملف الدراسي للطالب" subtitle={`أهلًا ${user?.name || ''}، أكمل البيانات المطلوبة لبدء التقييم المناسب لصفك.`} />
        <Surface>
          <Text style={styles.section}>صورة الطالب</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity onPress={() => void choosePhoto()} style={styles.photoButton} accessibilityRole="button">
              {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} /> : currentAvatar ? <Image source={{ uri: currentAvatar }} style={styles.photo} /> : <Ionicons name="camera-outline" size={26} color={BRAND.teal} />}
            </TouchableOpacity>
            <View style={styles.photoCopy}><Text style={styles.photoTitle}>{photo || currentAvatar ? 'تغيير صورة الطالب' : 'أضف صورة واضحة'}</Text><Text style={styles.photoHint}>JPEG أو PNG · صورة شخصية فقط</Text></View>
          </View>
          <Text style={styles.section}>الصف الدراسي</Text>
          <View style={styles.grades}>
            {grades.map((grade) => (
              <View key={grade.id} style={styles.gradeCell}>
                <ChoiceButton title={grade.title} selected={gradeLevel === grade.id} onPress={() => setGradeLevel(grade.id)} />
              </View>
            ))}
          </View>
          <Field label="رقم الهوية الوطنية / الإقامة" icon="card-outline" value={nationalId} onChangeText={(value) => setNationalId(value.replace(/\D/g, '').slice(0, 10))} placeholder="10 أرقام" keyboardType="number-pad" maxLength={10} />
          <Field label="تاريخ الميلاد (اختياري)" icon="calendar-outline" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
          <PrimaryButton title="حفظ ومتابعة للاختبار" icon="arrow-forward" onPress={() => void submit()} loading={saving} />
        </Surface>
      </Animated.View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, marginTop: 18 },
  section: { color: BRAND.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  photoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, paddingBottom: 6 },
  photoButton: { width: 74, height: 74, borderRadius: 24, borderWidth: 1, borderColor: '#A8DED1', backgroundColor: BRAND.tealSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: 74, height: 74 },
  photoCopy: { flex: 1, gap: 4, alignItems: 'flex-end' },
  photoTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '700', writingDirection: 'rtl' },
  photoHint: { color: BRAND.muted, fontSize: 12, writingDirection: 'rtl' },
  grades: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  gradeCell: { width: '48.5%' },
});
