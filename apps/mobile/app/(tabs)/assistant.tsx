import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { AppPage, BrandHeader, ErrorNotice } from '@/components/mobile-ui';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const suggestions = ['اشرح لي هذا المفهوم بطريقة مبسطة', 'ساعدني في تنظيم مذاكرة اليوم', 'اقترح نشاطًا تعليميًا مناسبًا'];

function errorMessage(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر الاتصال بمساعد نكسس. لم يتم إنشاء إجابة بديلة.';
}

export default function AssistantScreen() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const roleName = user?.role === 'TEACHER' ? 'المساعد التربوي للمعلم' : user?.role === 'PARENT' ? 'مساعد ولي الأمر' : user?.role === 'STUDENT' ? 'مساعد الطالب' : 'مساعد نكسس';

  const history = useMemo(() => messages.slice(-12), [messages]);
  const send = async (text = draft) => {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: 'user' as const, content: question }];
    setMessages(next);
    setDraft('');
    setError('');
    setBusy(true);
    try {
      const response = await apiClient.post<{ success: boolean; data: { answer: string } }>('/ai/ask', {
        question,
        history: history,
        portalPath: pathname,
      });
      const answer = response.data.data?.answer?.trim();
      if (!answer) throw new Error('لم ترجع خدمة المساعد إجابة نصية.');
      setMessages((current) => [...current, { role: 'assistant', content: answer }]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <AppPage scroll={false} contentStyle={styles.page}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <BrandHeader eyebrow="مساعد ذكي متصل بخدمات نكسس" />
          <View style={styles.titleRow}>
            <View style={styles.aiIcon}><Ionicons name="sparkles" size={21} color="#FFFFFF" /></View>
            <View style={styles.titleCopy}><Text style={styles.title}>{roleName}</Text><Text style={styles.subtitle}>إجابات من خدمة المنصة مع مراعاة دورك والصفحة التي تتصفحها.</Text></View>
          </View>
        </View>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 ? <View style={styles.intro}>
            <Ionicons name="chatbubbles-outline" size={29} color={BRAND.teal} />
            <Text style={styles.introTitle}>كيف أساعدك؟</Text>
            <Text style={styles.introDetail}>المحادثة لا تُحفظ في قاعدة المدرسة. لا ترسل بيانات هوية أو معلومات شخصية للطلاب.</Text>
            <View style={styles.suggestions}>{suggestions.map((item) => <TouchableOpacity key={item} onPress={() => void send(item)} style={styles.suggestion}><Text style={styles.suggestionText}>{item}</Text><Ionicons name="arrow-up-outline" size={16} color={BRAND.teal} /></TouchableOpacity>)}</View>
          </View> : messages.map((message, index) => <View key={`${index}-${message.role}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.messageText, message.role === 'user' && styles.userMessage]}>{message.content}</Text>
          </View>)}
          {busy ? <View style={styles.typing}><ActivityIndicator size="small" color={BRAND.teal} /><Text style={styles.typingText}>جارٍ إعداد الإجابة من الخدمة…</Text></View> : null}
          {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="اكتب سؤالك…" placeholderTextColor="#8795A7" multiline maxLength={2000} style={styles.input} textAlign="right" returnKeyType="send" onSubmitEditing={() => void send()} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="إرسال السؤال" onPress={() => void send()} disabled={!draft.trim() || busy} style={[styles.send, (!draft.trim() || busy) && styles.sendDisabled]}>
            {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="arrow-up" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  container: { flex: 1, gap: 12 },
  top: { gap: 12 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, backgroundColor: BRAND.ink },
  aiIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: BRAND.teal },
  titleCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: '#D5E1E8', fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  messages: { flexGrow: 1, gap: 10, paddingVertical: 8 },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 },
  introTitle: { color: BRAND.ink, fontSize: 19, fontWeight: '900', writingDirection: 'rtl' },
  introDetail: { maxWidth: 320, color: BRAND.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', writingDirection: 'rtl' },
  suggestions: { width: '100%', gap: 7, marginTop: 8 },
  suggestion: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: '#FFFFFF' },
  suggestionText: { flex: 1, color: BRAND.ink, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 15 },
  userBubble: { alignSelf: 'flex-end', borderBottomEndRadius: 4, backgroundColor: BRAND.teal },
  assistantBubble: { alignSelf: 'flex-start', borderBottomStartRadius: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line },
  messageText: { color: BRAND.ink, fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  userMessage: { color: '#FFFFFF' },
  typing: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-start', gap: 8, padding: 10 },
  typingText: { color: BRAND.muted, fontSize: 12, writingDirection: 'rtl' },
  composer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: 8, borderWidth: 1, borderColor: BRAND.line, borderRadius: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, maxHeight: 110, minHeight: 42, color: BRAND.ink, fontSize: 14, paddingHorizontal: 8, paddingTop: 10, writingDirection: 'rtl' },
  send: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: BRAND.teal },
  sendDisabled: { opacity: 0.45 },
});
