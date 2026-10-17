import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { AppPage, OutlineButton, PrimaryButton } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <AppPage contentStyle={styles.page}>
      <Animated.View entering={FadeIn.duration(350)} style={styles.brandBar}>
        <View style={styles.brandCopy}>
          <Text style={styles.englishName}>NEXUS EDU</Text>
          <Text style={styles.brandCaption}>نكسس التعليمية</Text>
        </View>
        <View style={styles.brandMarks}>
          <Image source={require('../assets/images/nexus-emblem.png')} style={styles.nexusLogo} resizeMode="contain" />
          <Image source={require('../assets/images/school-seal.webp')} style={styles.schoolLogo} resizeMode="contain" />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(420)} style={styles.hero}>
        <ImageBackground
          source={require('../assets/images/school-hero.webp')}
          style={styles.heroImage}
          imageStyle={styles.heroImageCrop}
          resizeMode="cover"
        >
          <View style={styles.heroShade} />
          <View style={styles.heroCopy}>
            <Text style={styles.schoolName}>مدارس الإخلاص الأهلية · جدة</Text>
            <Text style={styles.title}>رحلتك التعليمية تبدأ من هنا</Text>
            <Text style={styles.subtitle}>بوابة واحدة للطالب وولي الأمر وموظفي المدرسة.</Text>
          </View>
        </ImageBackground>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(420)} style={styles.actions}>
        <Text style={styles.prompt}>أهلًا بك في نكسس</Text>
        <Text style={styles.description}>سجّل الدخول إلى حسابك، أو ابدأ بإنشاء حساب طالب أو ولي أمر.</Text>
        <PrimaryButton title="تسجيل الدخول" icon="arrow-forward" onPress={() => router.push('/login')} />
        <OutlineButton title="إنشاء حساب طالب أو ولي أمر" icon="person-add-outline" onPress={() => router.push('/register')} />
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Text style={styles.footerText}>نكسس التعليمية · مدارس الإخلاص الأهلية</Text>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 22, backgroundColor: BRAND.canvas },
  brandBar: { width: '100%', minHeight: 54, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  brandCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  englishName: { color: BRAND.ink, fontSize: 15, fontWeight: '900' },
  brandCaption: { color: BRAND.muted, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  brandMarks: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  nexusLogo: { width: 44, height: 44, borderRadius: 11, backgroundColor: '#FFFFFF' },
  schoolLogo: { width: 46, height: 46 },
  hero: { width: '100%', overflow: 'hidden', borderRadius: 18, backgroundColor: BRAND.ink },
  heroImage: { width: '100%', minHeight: 270, justifyContent: 'flex-end' },
  heroImageCrop: { borderRadius: 18 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12, 29, 49, 0.54)' },
  heroCopy: { alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingVertical: 22 },
  schoolName: { color: '#F4D88B', fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  title: { color: '#FFFFFF', fontSize: 27, lineHeight: 37, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: '#E5EDF3', fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  actions: { width: '100%', gap: 12, paddingTop: 2 },
  prompt: { color: BRAND.ink, fontSize: 21, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  description: { color: BRAND.muted, fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl', marginBottom: 3 },
  footer: { width: '100%', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 4 },
  footerRule: { width: '100%', height: 1, backgroundColor: BRAND.line },
  footerText: { color: '#8795A7', fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
});
