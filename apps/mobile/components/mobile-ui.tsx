import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/Config';

export function AppPage({ children, contentStyle, scroll = true, keyboardDismissMode }: { children: React.ReactNode; contentStyle?: ViewStyle; scroll?: boolean; keyboardDismissMode?: 'none' | 'on-drag' | 'interactive' }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? <ScrollView keyboardDismissMode={keyboardDismissMode ?? (Platform.OS === 'ios' ? 'interactive' : 'on-drag')} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView> : <View style={contentStyle}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BrandHeader({ eyebrow = 'مدارس الإخلاص الأهلية · جدة' }: { eyebrow?: string }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandCopy}>
        <Text style={styles.brandTitle}>نكسس التعليمية</Text>
        <Text style={styles.brandEyebrow}>{eyebrow}</Text>
      </View>
      <View style={styles.brandLogos}>
        <Image source={require('../assets/images/nexus-emblem.png')} style={styles.nexusLogo} resizeMode="contain" />
        <Image source={require('../assets/images/school-seal.webp')} style={styles.schoolLogo} resizeMode="contain" />
      </View>
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Field({ label, icon, style, secureTextEntry, ...props }: TextInputProps & { label: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputFrame}>
        {icon ? <Ionicons name={icon} size={18} color={BRAND.muted} /> : null}
        <TextInput
          {...props}
          secureTextEntry={secureTextEntry && !passwordVisible}
          autoCorrect={props.autoCorrect ?? false}
          underlineColorAndroid="transparent"
          keyboardAppearance="light"
          style={[styles.input, style]}
          placeholderTextColor="#95A2B2"
          textAlign="right"
          selectionColor={BRAND.teal}
        />
        {secureTextEntry ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onPress={() => setPasswordVisible((value) => !value)} hitSlop={10}>
          <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={19} color={BRAND.muted} />
        </TouchableOpacity> : null}
      </View>
    </View>
  );
}

export function PrimaryButton({ title, onPress, loading, disabled, icon, tone = 'teal' }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name']; tone?: 'teal' | 'blue' | 'ink';
}) {
  const bg = tone === 'blue' ? BRAND.blue : tone === 'ink' ? BRAND.ink : BRAND.teal;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.primary, { backgroundColor: bg }, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <>
        {icon ? <Ionicons name={icon} size={19} color="#FFFFFF" /> : null}
        <Text style={styles.primaryText}>{title}</Text>
      </>}
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, icon, disabled }: {
  title: string; onPress: () => void; icon?: React.ComponentProps<typeof Ionicons>['name']; disabled?: boolean;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={onPress} disabled={disabled} style={[styles.outline, disabled && styles.disabled]}>
      {icon ? <Ionicons name={icon} size={18} color={BRAND.ink} /> : null}
      <Text style={styles.outlineText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={BRAND.red} /><Text style={styles.errorText}>{children}</Text></View>;
}

export function EmptyState({ title, detail, icon = 'file-tray-outline' }: { title: string; detail?: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={27} color={BRAND.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.emptyDetail}>{detail}</Text> : null}
    </View>
  );
}

export function ChoiceButton({ title, selected, onPress, tone = 'teal' }: { title: string; selected?: boolean; onPress: () => void; tone?: 'teal' | 'blue' }) {
  const accent = tone === 'blue' ? BRAND.blue : BRAND.teal;
  return (
    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: Boolean(selected) }} onPress={onPress} activeOpacity={0.82} style={[styles.choice, selected && { borderColor: accent, backgroundColor: tone === 'blue' ? BRAND.blueSoft : BRAND.tealSoft }]}>
      <Text style={[styles.choiceText, selected && { color: accent }]}>{title}</Text>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? accent : '#A8B3C0'} />
    </TouchableOpacity>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return <View style={styles.sectionHeading}><View style={styles.sectionLabel}><View style={styles.sectionMarker} /><Text style={styles.sectionTitle}>{title}</Text></View>{action}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 38, gap: 16 },
  brandRow: { minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 2, paddingVertical: 4 },
  brandCopy: { flex: 1, alignItems: 'flex-end' },
  brandTitle: { color: BRAND.ink, fontSize: 18, fontWeight: '900', writingDirection: 'rtl', letterSpacing: 0.1 },
  brandEyebrow: { color: BRAND.muted, fontSize: 11, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  brandLogos: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  nexusLogo: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#FFFFFF' },
  schoolLogo: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF' },
  titleBlock: { alignItems: 'flex-end', gap: 6, marginTop: 4 },
  title: { color: BRAND.ink, fontSize: 25, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: BRAND.muted, fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  fieldWrap: { gap: 7 },
  label: { color: BRAND.ink, fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  inputFrame: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: BRAND.line, borderRadius: 14, backgroundColor: '#FBFCFD' },
  input: { flex: 1, minHeight: 48, color: '#111827', opacity: 1, backgroundColor: 'transparent', fontSize: 16, writingDirection: 'rtl', paddingVertical: 8, includeFontPadding: false },
  primary: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 54, paddingHorizontal: 16, borderRadius: 15, elevation: 2, shadowColor: BRAND.ink, shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', writingDirection: 'rtl' },
  outline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: BRAND.line, borderRadius: 15, backgroundColor: '#FFFFFF' },
  outlineText: { color: BRAND.ink, fontSize: 14, fontWeight: '700', writingDirection: 'rtl' },
  surface: { gap: 13, padding: 17, borderWidth: 1, borderColor: BRAND.line, borderRadius: 19, backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#203A4D', shadowOpacity: 0.035, shadowRadius: 11, shadowOffset: { width: 0, height: 4 } },
  disabled: { opacity: 0.55 },
  error: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF1F0', borderWidth: 1, borderColor: '#F3C7C3' },
  errorText: { flex: 1, color: BRAND.red, fontSize: 13, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  empty: { alignItems: 'center', gap: 9, padding: 24, borderWidth: 1, borderColor: BRAND.line, borderRadius: 17, backgroundColor: '#F9FBFA' },
  emptyTitle: { color: BRAND.ink, fontSize: 15, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  emptyDetail: { color: BRAND.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl' },
  choice: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: 13, borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: '#FFFFFF' },
  choiceText: { flex: 1, color: BRAND.ink, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  sectionHeading: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 },
  sectionLabel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  sectionMarker: { width: 3, height: 18, borderRadius: 2, backgroundColor: BRAND.teal },
  sectionTitle: { color: BRAND.ink, fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
});
