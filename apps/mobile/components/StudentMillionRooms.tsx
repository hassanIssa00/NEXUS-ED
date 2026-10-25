import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, type Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { BRAND, SOCKET_URL } from '@/constants/Config';
import { apiClient } from '@/lib/api';
import { ACCESS_TOKEN_KEY } from '@/lib/session';
import { ChoiceButton, EmptyState, PrimaryButton, SectionHeading, Surface } from '@/components/mobile-ui';
import { useAuth } from '@/context/AuthContext';

type Row = Record<string, any>;
type QuestionPayload = { question: { id: number; text_ar: string; options: string[] }; timeLimit: number; orderIndex: number; totalQuestions: number };
type AnswerResult = { questionId: number; correctIndex: number; scores?: Array<{ userId: string; points: number; isCorrect: boolean }> };

function rowsOf(value: any): Row[] {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function errorOf(error: any) {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join('، ') : message ?? 'تعذر إكمال طلب اللعبة.';
}

export function StudentMillionRooms({ fail, notify }: { fail: (message: string) => void; notify: (message: string) => void }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Row[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Row | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [questionPayload, setQuestionPayload] = useState<QuestionPayload | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<Row[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [roundFinished, setRoundFinished] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const connectPromiseRef = useRef<Promise<Socket> | null>(null);
  const activeRoomRef = useRef<Row | null>(null);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try { setRooms(rowsOf((await apiClient.get('/million/rooms')).data)); }
    catch (error) { setRooms([]); fail(errorOf(error)); }
    finally { setLoadingRooms(false); }
  }, [fail]);

  useEffect(() => {
    void loadRooms();
    const timer = setInterval(() => void loadRooms(), 15000);
    return () => clearInterval(timer);
  }, [loadRooms]);

  useEffect(() => {
    activeRoomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!questionPayload || answerResult || roundFinished) { setSecondsLeft(0); return; }
    const startAt = questionStartedAt || Date.now();
    const limit = Math.max(1, questionPayload.timeLimit || 15);
    const update = () => setSecondsLeft(Math.max(0, limit - Math.floor((Date.now() - startAt) / 1000)));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [answerResult, questionPayload, questionStartedAt, roundFinished]);

  const ensureSocket = useCallback(async () => {
    if (socketRef.current?.connected) return socketRef.current;
    if (connectPromiseRef.current) return connectPromiseRef.current;
    if (!SOCKET_URL) throw new Error('خدمة اللعب المباشر غير مهيأة لهذا الإصدار.');
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) throw new Error('انتهت جلسة الدخول. سجّل الدخول مجددًا.');

    const pending = new Promise<Socket>((resolve, reject) => {
      const socket = io(`${SOCKET_URL}/million`, { auth: { token }, path: '/socket.io', transports: ['websocket', 'polling'], timeout: 10000, reconnection: true });
      socketRef.current = socket;
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('تعذر الاتصال بخدمة اللعب المباشر. حاول مرة أخرى.'));
      }, 12000);

      socket.on('connect', () => {
        setConnected(true);
        const currentRoom = activeRoomRef.current;
        if (currentRoom?.id) socket.emit('join-room', { roomId: currentRoom.id }, (response: any) => {
          if (response?.success) setParticipantCount(Number(response.room?.participant_count ?? 1));
        });
        if (!settled) { settled = true; clearTimeout(timeout); resolve(socket); }
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', (error) => {
        setConnected(false);
        if (!settled) { settled = true; clearTimeout(timeout); reject(error); }
      });
      socket.on('room.joined', (event: any) => {
        if (event?.roomId === activeRoomRef.current?.id) setParticipantCount(Number(event.participantCount ?? 1));
      });
      socket.on('room.left', (event: any) => {
        if (event?.roomId === activeRoomRef.current?.id) setParticipantCount(Number(event.participantCount ?? 1));
      });
      socket.on('round.started', (event: any) => {
        if (event?.roomId !== activeRoomRef.current?.id) return;
        setQuestionPayload(null); setSelectedOption(null); setAnswerResult(null); setRoundFinished(false); setLeaderboard([]);
      });
      socket.on('question.sent', (event: QuestionPayload & { roomId?: string }) => {
        if (event?.roomId && event.roomId !== activeRoomRef.current?.id) return;
        setQuestionPayload(event); setSelectedOption(null); setAnswerResult(null); setQuestionStartedAt(Date.now());
      });
      socket.on('question.result', (event: AnswerResult) => {
        if (event?.questionId === questionIdRef.current) setAnswerResult(event);
      });
      socket.on('leaderboard.updated', (event: any) => {
        if (event?.roomId === activeRoomRef.current?.id) setLeaderboard(Array.isArray(event.leaderboard) ? event.leaderboard : []);
      });
      socket.on('round.finished', (event: any) => {
        if (event?.roomId !== activeRoomRef.current?.id) return;
        setRoundFinished(true); setQuestionPayload(null); setLeaderboard(Array.isArray(event.finalLeaderboard) ? event.finalLeaderboard : []);
      });
    });
    connectPromiseRef.current = pending;
    try { return await pending; }
    finally { connectPromiseRef.current = null; }
  }, []);

  const questionIdRef = useRef<number | null>(null);
  useEffect(() => { questionIdRef.current = questionPayload?.question?.id ?? null; }, [questionPayload?.question?.id]);

  useEffect(() => () => { socketRef.current?.disconnect(); socketRef.current = null; }, []);

  const emit = async (event: string, payload: Row) => {
    const socket = await ensureSocket();
    return new Promise<Row>((resolve, reject) => {
      socket.emit(event, payload, (response: Row) => response?.success ? resolve(response) : reject(new Error(response?.error ?? 'تعذر تنفيذ الإجراء.')));
    });
  };

  const createRoom = async () => {
    if (title.trim().length < 3) return fail('اكتب عنوانًا للغرفة من 3 أحرف على الأقل.');
    setBusy(true);
    try {
      const response = await emit('create-room', { title: title.trim(), type: 'public', settings: { maxPlayers: 10, questionCount: 10, timeLimit: 15, difficulty: 'mixed' } });
      setRoom(response.room); setParticipantCount(Number(response.room?.participant_count ?? 1)); setTitle(''); setRoundFinished(false); setQuestionPayload(null); await loadRooms();
      notify('أُنشئت الغرفة وانضممت إليها.');
    } catch (error) { fail(errorOf(error)); }
    finally { setBusy(false); }
  };

  const joinRoom = async (item: Row) => {
    setBusy(true);
    try {
      const response = await emit('join-room', { roomId: item.id });
      setRoom(response.room); setParticipantCount(Number(response.room?.participant_count ?? item.playerCount ?? 1)); setRoundFinished(false); setQuestionPayload(null); setAnswerResult(null);
    } catch (error) { fail(errorOf(error)); }
    finally { setBusy(false); }
  };

  const leaveRoom = async () => {
    const current = room;
    if (!current?.id) return;
    setBusy(true);
    try { await emit('leave-room', { roomId: current.id }); setRoom(null); activeRoomRef.current = null; setQuestionPayload(null); setAnswerResult(null); setRoundFinished(false); await loadRooms(); }
    catch (error) { fail(errorOf(error)); }
    finally { setBusy(false); }
  };

  const startRound = async () => {
    if (!room?.id) return;
    setBusy(true);
    try { await emit('start-round', { roomId: room.id }); notify('بدأت الجولة.'); }
    catch (error) { fail(errorOf(error)); }
    finally { setBusy(false); }
  };

  const submitAnswer = async () => {
    if (!room?.id || !questionPayload || selectedOption == null) return;
    setBusy(true);
    try { await emit('submit-answer', { roomId: room.id, questionId: questionPayload.question.id, chosenIndex: selectedOption, timeTaken: Math.max(0, Math.floor((Date.now() - questionStartedAt) / 1000)) }); }
    catch (error) { fail(errorOf(error)); }
    finally { setBusy(false); }
  };

  const hostId = room?.host_id ?? room?.hostId;
  const isHost = Boolean(room?.id && hostId && user?.id && hostId === user.id);

  return <View style={styles.stack}>
    <Surface style={styles.card}>
      <SectionHeading title="مسابقة حوار المليون" action={<Ionicons name={connected ? 'radio' : 'radio-outline'} size={19} color={connected ? BRAND.teal : BRAND.muted} />} />
      <Text style={styles.copy}>{connected ? 'متصل بخدمة اللعب المباشر.' : 'أنشئ غرفة أو انضم إلى غرفة عامة للعب مع الطلاب.'}</Text>
      {!room ? <>
        <TextInput value={title} onChangeText={setTitle} placeholder="عنوان الغرفة الجديدة" placeholderTextColor={BRAND.muted} style={styles.input} textAlign="right" maxLength={80} />
        <PrimaryButton title="إنشاء غرفة عامة" icon="add-circle-outline" onPress={() => void createRoom()} loading={busy} disabled={title.trim().length < 3} />
        <View style={styles.listHeader}><Text style={styles.listTitle}>الغرف المتاحة</Text><PrimaryButton title="تحديث" icon="refresh-outline" tone="blue" onPress={() => void loadRooms()} loading={loadingRooms} /></View>
        {loadingRooms ? <ActivityIndicator color={BRAND.teal} /> : rooms.length ? rooms.map((item) => <View key={item.id} style={styles.roomRow}><View style={styles.rowCopy}><Text style={styles.rowTitle}>{item.title ?? 'غرفة مسابقة'}</Text><Text style={styles.copy}>{item.playerCount ?? 0}/{item.maxPlayers ?? 10} لاعب · تنتظر الانضمام</Text></View><PrimaryButton title="انضمام" icon="enter-outline" tone="teal" onPress={() => void joinRoom(item)} loading={busy} disabled={busy} /></View>) : <EmptyState title="لا توجد غرف نشطة" detail="أنشئ غرفة عامة ليتمكن زملاؤك من الانضمام." icon="game-controller-outline" />}
      </> : <>
        <View style={styles.roomBanner}><Text style={styles.roomTitle}>{room.title ?? 'غرفة المليون'}</Text><Text style={styles.copy}>{participantCount} لاعب · {isHost ? 'أنت مضيف الغرفة' : 'انضممت إلى الغرفة'}</Text></View>
        {!questionPayload && !roundFinished ? <><Text style={styles.copy}>{isHost ? 'ابدأ الجولة عندما يكون اللاعبون جاهزين.' : 'انتظر المضيف ليبدأ الجولة.'}</Text>{isHost ? <PrimaryButton title="بدء جولة جديدة" icon="play-circle-outline" onPress={() => void startRound()} loading={busy} disabled={!connected} /> : null}</> : null}
        {questionPayload ? <View style={styles.questionBox}><View style={styles.listHeader}><Text style={styles.copy}>السؤال {questionPayload.orderIndex + 1} من {questionPayload.totalQuestions}</Text><Text style={[styles.timer, secondsLeft <= 5 && styles.timerUrgent]}>{secondsLeft} ث</Text></View><Text style={styles.questionText}>{questionPayload.question.text_ar}</Text>{(Array.isArray(questionPayload.question.options) ? questionPayload.question.options : []).map((option, index) => <ChoiceButton key={`${questionPayload.question.id}-${index}`} title={option} selected={selectedOption === index} onPress={() => setSelectedOption(index)} />)}{answerResult ? <Text style={styles.answerFeedback}>الإجابة الصحيحة: {questionPayload.question.options?.[answerResult.correctIndex] ?? '—'}</Text> : <PrimaryButton title="إرسال الإجابة" icon="send-outline" onPress={() => void submitAnswer()} loading={busy} disabled={selectedOption == null || secondsLeft <= 0} />}</View> : null}
        {roundFinished ? <EmptyState title="انتهت الجولة" detail={leaderboard[0] ? `المتصدر: ${leaderboard[0].name ?? 'طالب'} · ${leaderboard[0].totalPoints ?? 0} نقطة` : 'اكتملت الجولة.'} icon="trophy-outline" /> : null}
        {leaderboard.length ? <View style={styles.leaderboard}><Text style={styles.listTitle}>الترتيب الحالي</Text>{leaderboard.slice(0, 10).map((item, index) => <View key={item.userId ?? index} style={styles.roomRow}><Text style={styles.copy}>{item.totalPoints ?? 0} نقطة</Text><Text style={styles.rowTitle}>#{item.rank ?? index + 1} · {item.name ?? 'طالب'}</Text></View>)}</View> : null}
        <PrimaryButton title="مغادرة الغرفة" icon="exit-outline" tone="blue" onPress={() => void leaveRoom()} loading={busy} />
      </>}
    </Surface>
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 12 }, card: { gap: 11 }, copy: { color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  input: { minHeight: 45, paddingHorizontal: 12, borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, backgroundColor: BRAND.paper, color: BRAND.ink, fontSize: 13, writingDirection: 'rtl' },
  listHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, listTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  roomRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderColor: BRAND.line }, rowCopy: { flex: 1, alignItems: 'flex-end', gap: 3 }, rowTitle: { color: BRAND.ink, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  roomBanner: { gap: 4, padding: 12, borderRadius: 13, backgroundColor: BRAND.tealSoft }, roomTitle: { color: BRAND.ink, fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  questionBox: { gap: 8, padding: 12, borderRadius: 13, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.canvas }, questionText: { color: BRAND.ink, fontSize: 17, fontWeight: '900', lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  timer: { color: BRAND.teal, fontSize: 15, fontWeight: '900' }, timerUrgent: { color: BRAND.red }, answerFeedback: { color: BRAND.teal, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', paddingVertical: 8 },
  leaderboard: { gap: 5, paddingTop: 8 },
});
