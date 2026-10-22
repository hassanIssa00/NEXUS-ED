import React, { useEffect } from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppPage, OutlineButton, PrimaryButton } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';

export default function WelcomeScreen() {
  const router = useRouter();
  const logoScale = useSharedValue(0.78);
  const haloPulse = useSharedValue(0);

  useEffect(() => {
    // The logo completes its reveal and three gentle pulses in about five seconds.
    logoScale.value = withSequence(
      withTiming(1, { duration: 700 }),
      withRepeat(
        withSequence(
          withTiming(1.07, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        3,
        false,
      ),
    );
    haloPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 800 }),
      ),
      3,
      false,
    );
  }, [haloPulse, logoScale]);

  const logoAnimation = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));
  const haloAnimation = useAnimatedStyle(() => ({
    opacity: interpolate(haloPulse.value, [0, 1], [0.32, 0.04]),
    transform: [{ scale: interpolate(haloPulse.value, [0, 1], [0.9, 1.42]) }],
  }));

  return (
    <AppPage contentStyle={styles.page}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.brandBar}>
        <View style={styles.brandCopy}>
          <Text style={styles.englishName}>NEXUS EDU</Text>
          <Text style={styles.brandCaption}>نكسس التعليمية</Text>
        </View>
        <View style={styles.brandMarks}>
          <Image source={require('../assets/images/nexus-emblem.png')} style={styles.nexusLogo} resizeMode="contain" />
          <Image source={require('../assets/images/school-seal.webp')} style={styles.schoolLogo} resizeMode="contain" />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(650)} style={styles.hero}>
        <ImageBackground
          source={require('../assets/images/school-hero.webp')}
          style={styles.heroImage}
          imageStyle={styles.heroImageCrop}
          resizeMode="cover"
        >
          <View style={styles.heroShade} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles-outline" size={14} color="#FFF0BC" />
              <Text style={styles.heroPillText}>بوابتك المدرسية المتكاملة</Text>
            </View>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.logoStage}>
            <Animated.View pointerEvents="none" style={[styles.logoHalo, haloAnimation]} />
            <Animated.View style={[styles.logoMedallion, logoAnimation]}>
              <Image source={require('../assets/images/nexus-emblem.png')} style={styles.heroNexusLogo} resizeMode="contain" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(250).duration(650)} style={styles.schoolSealMedallion}>
              <Image source={require('../assets/images/school-seal.webp')} style={styles.heroSchoolLogo} resizeMode="contain" />
            </Animated.View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.schoolName}>مدارس الإخلاص الأهلية · جدة</Text>
            <Text style={styles.title}>كل مدرستك في مكان واحد</Text>
            <Text style={styles.subtitle}>فصولك، واجباتك، وحضورك… تجربة تعليمية أسهل مع نكسس.</Text>
          </View>
        </ImageBackground>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(650)} style={styles.featureRow}>
        <Feature icon="people-outline" label="مجتمع المدرسة" />
        <Feature icon="book-outline" label="فصول وواجبات" />
        <Feature icon="calendar-outline" label="متابعة يومية" />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(180).duration(650)} style={styles.actions}>
        <View style={styles.actionsHeading}>
          <View style={styles.welcomeBadge}>
            <Ionicons name="hand-right-outline" size={18} color={BRAND.teal} />
          </View>
          <View style={styles.actionsCopy}>
            <Text style={styles.prompt}>أهلًا بك في نكسس</Text>
            <Text style={styles.description}>ادخل إلى حسابك أو أنشئ حسابًا جديدًا للانضمام إلى مدرستك.</Text>
          </View>
        </View>
        <PrimaryButton title="تسجيل الدخول" icon="arrow-forward" tone="blue" onPress={() => router.push('/login')} />
        <OutlineButton title="إنشاء حساب جديد" icon="person-add-outline" onPress={() => router.push('/register')} />
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Text style={styles.footerText}>منصة نكسس التعليمية · مدارس الإخلاص الأهلية</Text>
      </View>
    </AppPage>
  );
}

function Feature({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={16} color={BRAND.teal} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 16,
    backgroundColor: BRAND.canvas,
  },
  brandBar: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  brandCopy: { flex: 1, alignItems: 'flex-end', gap: 2 },
  englishName: { color: BRAND.ink, fontSize: 15, fontWeight: '900', letterSpacing: 1.1 },
  brandCaption: { color: BRAND.muted, fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  brandMarks: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  nexusLogo: { width: 42, height: 42, borderRadius: 12, backgroundColor: BRAND.paper },
  schoolLogo: { width: 44, height: 44 },
  hero: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 27,
    backgroundColor: BRAND.ink,
    elevation: 5,
    shadowColor: '#14233B',
    shadowOpacity: 0.17,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroImage: { width: '100%', minHeight: 368, justifyContent: 'space-between', padding: 18 },
  heroImageCrop: { borderRadius: 27 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12, 29, 49, 0.59)' },
  heroTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#75E3C0' },
  logoStage: { height: 132, alignItems: 'center', justifyContent: 'center' },
  logoHalo: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: '#A9F0DD',
    backgroundColor: 'rgba(169,240,221,0.12)',
  },
  logoMedallion: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.58)',
    elevation: 10,
    shadowColor: '#06182B',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  heroNexusLogo: { width: 69, height: 69, borderRadius: 18 },
  schoolSealMedallion: {
    position: 'absolute',
    right: '29%',
    bottom: 4,
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D6F5EA',
    elevation: 5,
  },
  heroSchoolLogo: { width: 36, height: 36 },
  heroCopy: { alignItems: 'flex-end', gap: 7, paddingTop: 8 },
  schoolName: { color: '#F4D88B', fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  title: { color: '#FFFFFF', fontSize: 25, lineHeight: 34, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: '#E5EDF3', fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  featureRow: { width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 7 },
  feature: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 5,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDEBE8',
    backgroundColor: '#FFFFFF',
  },
  featureText: { color: '#526579', fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  actions: {
    width: '100%',
    gap: 11,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.paper,
    elevation: 2,
    shadowColor: '#14233B',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  actionsHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 1 },
  welcomeBadge: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: BRAND.tealSoft },
  actionsCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  prompt: { color: BRAND.ink, fontSize: 19, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  description: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  footer: { width: '100%', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 1 },
  footerRule: { width: '100%', height: 1, backgroundColor: BRAND.line },
  footerText: { color: '#8795A7', fontSize: 10, textAlign: 'center', writingDirection: 'rtl' },
});
