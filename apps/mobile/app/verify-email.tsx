import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppPage, BrandHeader, ErrorNotice, OutlineButton, PrimaryButton, ScreenTitle, Surface } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailScreen() {
  const { user, sendVerificationEmail, refreshVerifiedSession, uploadTeacherRegistrationAvatar, signOut } = useAuth();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('اسمح للتطبيق بالوصول إلى الصور لاختيار صورة المعلم.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const retryPhotoUpload = async () => {
    if (!photo) return setError('اختر صورة JPEG أو PNG أو WebP أولًا.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType || '') || (photo.fileSize ?? 0) > 512 * 1024) {
      return setError('الصورة يجب أن تكون JPEG أو PNG أو WebP وألا يتجاوز حجمها 512 كيلوبايت.');
    }
    setUploadingPhoto(true);
    setError('');
    try {
      await uploadTeacherRegistrationAvatar({ uri: photo.uri, mimeType: photo.mimeType, fileName: photo.fileName });
    } catch (uploadError: any) {
      setError(uploadError?.response?.data?.message || uploadError?.message || 'تعذر حفظ صورة المعلم. حاول مرة أخرى.');
    } finally {
      setUploadingPhoto(false);
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
          {user?.role === 'TEACHER' && user.teacherAvatarUploadPending ? <View style={styles.photoPending}>
            <Text style={styles.note}>تعذر حفظ الصورة أثناء التسجيل. يمكنك إعادة اختيارها هنا؛ تأكيد البريد هو خطوة تفعيل الحساب.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void choosePhoto()} style={styles.photoPicker}>
              {photo ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : <Ionicons name="camera-outline" size={20} color={BRAND.blue} />}
              <Text style={styles.photoPickerText}>{photo ? 'تغيير الصورة' : 'اختيار الصورة الشخصية'}</Text>
            </TouchableOpacity>
            <OutlineButton title="حفظ صورة المعلم" icon="cloud-upload-outline" onPress={() => void retryPhotoUpload()} disabled={uploadingPhoto || !photo} />
          </View> : null}
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
  photoPending: { gap: 9, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#C6D9FF', backgroundColor: '#F4F8FF' },
  photoPicker: { minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#C6D9FF', backgroundColor: '#FFFFFF' },
  photoPickerText: { color: BRAND.blue, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  photoPreview: { width: 34, height: 34, borderRadius: 17 },
  signOut: { color: BRAND.red, fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 10, writingDirection: 'rtl' },
});
