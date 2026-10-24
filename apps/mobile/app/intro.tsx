import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/constants/Config';

const INTRO_DURATION_MS = 5000;

function destinationForRole(user: ReturnType<typeof useAuth>['user']) {
  if (!user) return '/welcome';
  if ((user.role === 'STUDENT' || user.role === 'TEACHER') && user.emailVerified === false) return '/verify-email';
  if (user.role === 'STUDENT' && user.onboardingStep === 'student-profile') return '/onboarding/student-profile';
  if (user.role === 'STUDENT' && user.onboardingStep === 'placement-assessment') return '/onboarding/placement-assessment';
  if (user.role === 'PARENT' && user.onboardingStep === 'link-student') return '/onboarding/link-student';
  if (user.role === 'PARENT' && user.onboardingStep === 'parent-survey') return '/onboarding/parent-survey';
  return '/(tabs)';
}

export default function IntroScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { width } = useWindowDimensions();
  const [introElapsed, setIntroElapsed] = useState(false);
  const reveal = useSharedValue(0);
  const logoScale = useSharedValue(0.78);
  const orbit = useSharedValue(0);
  const progressWidth = Math.min(width - 104, 260);

  useEffect(() => {
    reveal.value = withTiming(1, { duration: INTRO_DURATION_MS - 250 });
    logoScale.value = withSequence(
      withSpring(1, { damping: 12, stiffness: 100, mass: 0.8 }),
      withRepeat(withSequence(withTiming(1.045, { duration: 720 }), withTiming(1, { duration: 720 })), 2, true),
    );
    orbit.value = withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })), 1, true);

  }, [logoScale, orbit, reveal]);

  useEffect(() => {
    const timeout = setTimeout(() => setIntroElapsed(true), INTRO_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!introElapsed || loading) return;
    router.replace(destinationForRole(user) as never);
  }, [introElapsed, loading, router, user]);

  const logoAnimated = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const orbitAnimated = useAnimatedStyle(() => ({
    opacity: interpolate(orbit.value, [0, 1], [0.3, 0.08]),
    transform: [{ scale: interpolate(orbit.value, [0, 1], [0.88, 1.42]) }],
  }));
  const progressAnimated = useAnimatedStyle(() => ({ width: progressWidth * reveal.value }));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.canvas} />
      <View style={styles.stage}>
        <View pointerEvents="none" style={styles.lightField} />
        <View pointerEvents="none" style={styles.lightFieldSecond} />

        <Animated.View entering={FadeInDown.duration(760)} style={styles.identity}>
          <View style={styles.logoStage}>
            <Animated.View pointerEvents="none" style={[styles.logoHalo, orbitAnimated]} />
            <Animated.View style={[styles.nexusLogoPlate, logoAnimated]}>
              <Image source={require('../assets/images/nexus-emblem.png')} style={styles.nexusLogo} resizeMode="contain" />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(260).duration(700)} style={styles.schoolLogoPlate}>
              <Image source={require('../assets/images/school-seal.webp')} style={styles.schoolLogo} resizeMode="contain" />
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(220).duration(700)} style={styles.brandCopy}>
            <Text style={styles.wordmark}>NEXUS EDU</Text>
            <Text style={styles.arabicBrand}>نكسس التعليمية</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(430).duration(700)} style={styles.schoolCard}>
            <View style={styles.schoolIcon}><Ionicons name="school-outline" size={19} color={BRAND.teal} /></View>
            <View style={styles.schoolCopy}>
              <Text style={styles.schoolName}>مدارس الإخلاص الأهلية</Text>
              <Text style={styles.schoolLocation}>جدة · المملكة العربية السعودية</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(640).duration(720)} style={styles.promiseRow}>
            <View style={styles.promiseMark}><Ionicons name="git-network-outline" size={16} color={BRAND.teal} /></View>
            <Text style={styles.promise}>تجربة تعليمية مترابطة من البداية إلى الإنجاز</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(800).duration(800)} style={styles.footer}>
          <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, progressAnimated]} /></View>
          <Text style={styles.credit}>Developed by Eng. Hassan Issa</Text>
          <Text style={styles.creditArabic}>بواسطة مدارس الإخلاص الأهلية</Text>
          <View style={styles.loadingLabel}><View style={styles.loadingDot} /><Text style={styles.loadingText}>جاري تجهيز بوابتك التعليمية</Text></View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20 },
  lightField: { position: 'absolute', top: '12%', right: -105, width: 290, height: 290, borderRadius: 145, backgroundColor: '#D9EBE7', opacity: 0.56 },
  lightFieldSecond: { position: 'absolute', bottom: '13%', left: -120, width: 280, height: 280, borderRadius: 140, backgroundColor: '#E9E9DE', opacity: 0.5 },
  identity: { width: '100%', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  logoStage: { width: 190, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  logoHalo: { position: 'absolute', width: 124, height: 124, borderRadius: 62, borderWidth: 1, borderColor: '#A7CFC5', backgroundColor: '#E8F4F0' },
  nexusLogoPlate: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', borderRadius: 30, borderWidth: 1, borderColor: '#E3ECEA', backgroundColor: '#FFFFFF', elevation: 8, shadowColor: '#173149', shadowOpacity: 0.13, shadowRadius: 17, shadowOffset: { width: 0, height: 8 } },
  nexusLogo: { width: 78, height: 78, borderRadius: 18 },
  schoolLogoPlate: { position: 'absolute', right: 15, bottom: 9, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', elevation: 5, shadowColor: '#173149', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  schoolLogo: { width: 44, height: 44, borderRadius: 22 },
  brandCopy: { alignItems: 'center', gap: 3 },
  wordmark: { color: BRAND.ink, fontSize: 18, fontWeight: '900', letterSpacing: 3.5 },
  arabicBrand: { color: BRAND.teal, fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  schoolCard: { width: '100%', maxWidth: 360, minHeight: 72, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: '#DEE8E5', backgroundColor: 'rgba(255,255,255,0.88)' },
  schoolIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: BRAND.tealSoft },
  schoolCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  schoolName: { color: BRAND.ink, fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  schoolLocation: { color: BRAND.muted, fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  promiseRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  promiseMark: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#E5F0EC' },
  promise: { color: '#536B78', fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  footer: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 6, paddingTop: 10 },
  progressTrack: { width: '100%', height: 4, overflow: 'hidden', alignItems: 'flex-end', marginBottom: 8, borderRadius: 3, backgroundColor: '#E1E9E7' },
  progressFill: { height: 4, borderRadius: 3, backgroundColor: BRAND.teal },
  credit: { color: BRAND.ink, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  creditArabic: { color: BRAND.muted, fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  loadingLabel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 3 },
  loadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.amber },
  loadingText: { color: BRAND.muted, fontSize: 10, writingDirection: 'rtl' },
});
