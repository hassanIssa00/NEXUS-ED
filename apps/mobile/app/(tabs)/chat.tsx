import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

type Person = { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string; role?: string };
type Participant = { userId: string; user: Person };
type Message = { id: string; senderId: string; content: string; createdAt: string; sender?: Person };
type Conversation = { id: string; participants: Participant[]; messages: Message[]; updatedAt?: string };

function personName(person?: Person) {
  if (!person) return 'المعلم';
  return person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || 'المعلم';
}

function errorMessage(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join('، ') : message || 'تعذر الاتصال بخدمة الرسائل.';
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const recipient = useMemo(
    () => selected?.participants.find((participant) => participant.userId !== user?.id)?.user,
    [selected, user?.id],
  );
  const canMessage = user?.role === 'STUDENT' || user?.role === 'PARENT';

  const loadConversations = useCallback(async () => {
    try {
      const response = await apiClient.get<Conversation[]>('/messages/conversations');
      const records = Array.isArray(response.data) ? response.data : [];
      setConversations(records);
      setSelectedId((current) => current && records.some((item) => item.id === current) ? current : records[0]?.id ?? null);
      setError(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await apiClient.get<Message[]>(`/messages/${encodeURIComponent(conversationId)}`);
      setMessages(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    if (!canMessage) {
      setLoading(false);
      return;
    }
    void loadConversations();
  }, [canMessage, loadConversations]);

  useEffect(() => {
    if (!selectedId || !canMessage) {
      setMessages([]);
      return;
    }
    let active = true;
    const refreshThread = async () => {
      try {
        const response = await apiClient.get<Message[]>(`/messages/${encodeURIComponent(selectedId)}`);
        if (active) {
          setMessages(Array.isArray(response.data) ? response.data : []);
          setError(null);
        }
      } catch (requestError) {
        if (active) setError(errorMessage(requestError));
      }
    };
    void refreshThread();
    const timer = setInterval(() => void refreshThread(), 20_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [canMessage, selectedId]);

  const openContacts = async () => {
    setContactsOpen(true);
    try {
      const response = await apiClient.get<Person[]>('/messages/contacts');
      setContacts(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const startConversation = async (contact: Person) => {
    try {
      const response = await apiClient.post<Conversation>('/messages/start', { targetUserId: contact.id });
      const conversation = response.data;
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setSelectedId(conversation.id);
      setContactsOpen(false);
      setMessages([]);
      setError(null);
      void loadConversations();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!selectedId || !content || sending) return;
    setSending(true);
    try {
      const response = await apiClient.post<Message>(`/messages/${encodeURIComponent(selectedId)}/send`, { content });
      setMessages((current) => [...current, response.data]);
      setDraft('');
      void loadConversations();
    } catch (requestError) {
      Alert.alert('تعذر الإرسال', errorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  if (!canMessage) {
    return <View style={styles.center}><Text style={styles.empty}>الرسائل متاحة حاليًا لحسابات الطلاب وأولياء الأمور فقط.</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {selected ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.backButton}>
              <Text style={styles.actionText}>المحادثات</Text>
            </TouchableOpacity>
            <Text numberOfLines={1} style={styles.headerTitle}>{personName(recipient)}</Text>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadMessages(selected.id).finally(() => setRefreshing(false)); }} />}
            contentContainerStyle={messages.length ? styles.messageList : styles.emptyList}
            ListEmptyComponent={<Text style={styles.empty}>لا توجد رسائل في هذه المحادثة بعد.</Text>}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.id;
              return (
                <View style={[styles.bubble, mine ? styles.myBubble : styles.otherBubble]}>
                  <Text style={[styles.messageText, mine && styles.myMessageText]}>{item.content}</Text>
                  <Text style={[styles.timestamp, mine && styles.myTimestamp]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
          <View style={styles.composer}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="إرسال" onPress={() => void sendMessage()} disabled={sending || !draft.trim()} style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]}>
              {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>إرسال</Text>}
            </TouchableOpacity>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="اكتب رسالة"
              multiline
              maxLength={2000}
              textAlign="right"
              style={styles.input}
              accessibilityLabel="نص الرسالة"
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>المحادثات</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void openContacts()} style={styles.actionButton}>
              <Text style={styles.actionText}>معلم جديد</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {loading ? <ActivityIndicator color="#365CF5" style={styles.loader} /> : null}
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadConversations(); }} />}
            contentContainerStyle={conversations.length ? styles.conversationList : styles.emptyList}
            ListEmptyComponent={<Text style={styles.empty}>لا توجد محادثات بعد. ابدأ محادثة مع أحد معلميك.</Text>}
            renderItem={({ item }) => {
              const other = item.participants.find((participant) => participant.userId !== user?.id)?.user;
              const latestMessage = item.messages?.[0];
              return (
                <TouchableOpacity accessibilityRole="button" onPress={() => setSelectedId(item.id)} style={styles.conversationRow}>
                  <Text style={styles.rowName}>{personName(other)}</Text>
                  <Text numberOfLines={1} style={styles.rowPreview}>{latestMessage?.content ?? 'ابدأ المحادثة'}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      <Modal visible={contactsOpen} animationType="slide" onRequestClose={() => setContactsOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setContactsOpen(false)} style={styles.backButton}>
              <Text style={styles.actionText}>إغلاق</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>معلموك</Text>
          </View>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.conversationList}
            ListEmptyComponent={<Text style={styles.empty}>لا يوجد معلمون مرتبطون بفصول حسابك.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity accessibilityRole="button" onPress={() => void startConversation(item)} style={styles.conversationRow}>
                <Text style={styles.rowName}>{personName(item)}</Text>
                <Text style={styles.rowPreview}>بدء محادثة</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  modal: { flex: 1, paddingTop: 36, backgroundColor: '#F5F7FA' },
  header: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E4E9F0' },
  headerTitle: { flex: 1, color: '#182230', fontSize: 18, fontWeight: '700', textAlign: 'right' },
  backButton: { minWidth: 82, paddingVertical: 12 },
  actionButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 8 },
  actionText: { color: '#365CF5', fontSize: 14, fontWeight: '600' },
  loader: { marginTop: 24 },
  error: { margin: 12, padding: 12, color: '#8A2C0D', backgroundColor: '#FFF4E5', borderRadius: 6, textAlign: 'right' },
  conversationList: { paddingHorizontal: 16, paddingBottom: 24 },
  conversationRow: { paddingVertical: 16, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E4E9F0' },
  rowName: { color: '#182230', fontSize: 16, fontWeight: '600', textAlign: 'right' },
  rowPreview: { color: '#52627A', fontSize: 13, marginTop: 6, textAlign: 'right' },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 },
  empty: { color: '#52627A', fontSize: 14, textAlign: 'center', lineHeight: 23 },
  center: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#F5F7FA' },
  messageList: { padding: 16, paddingBottom: 24 },
  bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-start', backgroundColor: '#365CF5' },
  otherBubble: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E9F0' },
  messageText: { color: '#182230', fontSize: 15, textAlign: 'right', lineHeight: 21 },
  myMessageText: { color: '#FFFFFF' },
  timestamp: { color: '#52627A', fontSize: 10, marginTop: 6, textAlign: 'left' },
  myTimestamp: { color: '#E5E9FF' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E4E9F0' },
  input: { flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, color: '#182230', backgroundColor: '#F5F7FA', borderRadius: 6 },
  sendButton: { minWidth: 64, height: 44, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: '#365CF5' },
  sendText: { color: '#FFFFFF', fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
