'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Mic, MicOff, Radio, RefreshCw, Square, Video, VideoOff, Wifi, WifiOff } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { classSessionApi, ClassSession } from '@/lib/api/class-session';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

type RoomTrack = { id: string; track: Track; name: string; local: boolean };
const payloadOf = <T,>(response: any): T => (response?.data?.data ?? response?.data) as T;

function TrackMedia({ item, isEnglish }: { item: RoomTrack; isEnglish: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const element = item.track.attach();
    if (element instanceof HTMLVideoElement) {
      element.autoplay = true;
      element.playsInline = true;
      element.className = 'h-full w-full object-cover';
    } else {
      element.autoplay = true;
      element.className = 'sr-only';
    }
    root.current.appendChild(element);
    return () => {
      item.track.detach(element);
      element.remove();
    };
  }, [item.track]);

  return <article className="relative aspect-video overflow-hidden rounded-2xl border bg-slate-950 shadow-sm">
    <div ref={root} className="absolute inset-0" />
    <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">{item.local ? (isEnglish ? 'You' : 'أنت') : item.name}</span>
  </article>;
}

export default function LiveClassPage() {
  const isEnglish = useLocale() === 'en';
  const tr = (ar: string, en: string) => isEnglish ? en : ar;
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const classId = params?.id || '';
  const roomRef = useRef<Room | null>(null);
  const [session, setSession] = useState<ClassSession | null>(null);
  const [tracks, setTracks] = useState<RoomTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const response = await classSessionApi.getActive(classId);
      setSession(payloadOf<ClassSession | null>(response) ?? null);
    } catch {
      setSession(null);
      setError(isEnglish ? 'Could not load a session for this account.' : 'لا يمكن تحميل الجلسة لهذا الحساب.');
    } finally { setLoading(false); }
  }, [classId, isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const connect = async () => {
    if (!session || connecting || connected) return;
    setConnecting(true); setError(''); setNotice('');
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const addTrack = (track: Track, participantName: string, local: boolean) => {
      const id = track.sid || `${local ? 'local' : 'remote'}-${participantName}-${track.kind}`;
      setTracks((current) => current.some((item) => item.id === id) ? current : [...current, { id, track, name: participantName, local }]);
    };
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => addTrack(track, participant.name || participant.identity, false));
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.track) addTrack(publication.track, isEnglish ? 'You' : 'أنت', true);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      const id = track.sid;
      setTracks((current) => current.filter((item) => item.id !== id && item.track !== track));
    });
    room.on(RoomEvent.Disconnected, () => { setConnected(false); setTracks([]); });

    try {
      const tokenResponse = await classSessionApi.createJoinToken(classId, session.id);
      const credentials = payloadOf<{ url: string; token: string }>(tokenResponse);
      await room.connect(credentials.url, credentials.token, { autoSubscribe: true });
      setConnected(true);
      try {
        await room.localParticipant.setCameraEnabled(true);
        setCameraEnabled(true);
      } catch { setCameraEnabled(false); setNotice(tr('اتصلت بالغرفة. تعذر تشغيل الكاميرا؛ يمكنك متابعة البث والاستماع.', 'You joined the room, but the camera could not start. You can still watch and listen.')); }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicEnabled(true);
      } catch { setMicEnabled(false); }
      for (const publication of room.localParticipant.trackPublications.values()) {
        if (publication.track) addTrack(publication.track, isEnglish ? 'You' : 'أنت', true);
      }
      if (user?.role === 'student') {
        const attendance = await classSessionApi.checkInAfterConnect(classId, session.id);
        const result = payloadOf<{ joinedAt?: string }>(attendance);
        const joinedAtLabel = result?.joinedAt
          ? ` · ${new Date(result.joinedAt).toLocaleTimeString(isEnglish ? 'en-US' : 'ar-SA', { hour: 'numeric', minute: '2-digit' })}`
          : '';
        setNotice(isEnglish
          ? `Your attendance was recorded automatically${joinedAtLabel}.`
          : `تم تسجيل حضورك تلقائيًا${joinedAtLabel}.`);
      } else setNotice(tr('اتصلت بغرفة البث الداخلية.', 'You joined the internal broadcast room.'));
    } catch (reason: any) {
      await room.disconnect().catch(() => undefined);
      roomRef.current = null;
      setTracks([]);
      setConnected(false);
      setError(tr('تعذر الاتصال بغرفة البث. تحقق من اتصال الشبكة وأذونات الكاميرا والميكروفون.', 'Could not connect to the broadcast room. Check your network and camera and microphone permissions.'));
    } finally { setConnecting(false); }
  };

  const leave = async () => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setTracks([]); setConnected(false); setMicEnabled(false); setCameraEnabled(false);
  };

  useEffect(() => () => { void roomRef.current?.disconnect(); }, []);

  const toggleMic = async () => {
    if (!roomRef.current) return;
    const next = !micEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };
  const toggleCamera = async () => {
    if (!roomRef.current) return;
    const next = !cameraEnabled;
    await roomRef.current.localParticipant.setCameraEnabled(next);
    setCameraEnabled(next);
  };

  return (
    <main dir={isEnglish ? 'ltr' : 'rtl'} className="mx-auto max-w-6xl space-y-5 p-4 pb-10 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-xl ${connected ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'}`}><Radio className="size-5" /></span><div><h1 className="text-xl font-bold">{tr('غرفة البث الداخلي', 'Internal live room')}</h1><p className="text-sm text-muted-foreground">{session ? `${session.title} · ${new Date(session.startTime).toLocaleDateString(isEnglish ? 'en-US' : 'ar-SA')}` : tr('اتصال مباشر وآمن بين المعلم والطلاب', 'A secure live connection between the teacher and students')}</p></div></div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{connected ? <><Wifi className="size-4" />{tr('متصل بالبث', 'Connected')}</> : <><WifiOff className="size-4" />{tr('غير متصل', 'Not connected')}</>}</span>
      </header>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {loading ? <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">{tr('جارٍ التحقق من البث...', 'Checking for a live broadcast…')}</div> : !session ? <section className="space-y-4 rounded-2xl border bg-card p-8 text-center"><p className="text-muted-foreground">{tr('لا يوجد بث مباشر نشط لهذا الفصل حاليًا.', 'There is no active live broadcast for this class right now.')}</p><div className="flex justify-center gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="me-2 size-4" />{tr('تحديث', 'Refresh')}</Button><Button variant="ghost" onClick={() => router.back()}>{tr('رجوع', 'Back')}</Button></div></section> : (
        <>
          <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-6">
            {connected ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tracks.filter((item) => item.track.kind === Track.Kind.Video).map((item) => <TrackMedia key={item.id} item={item} isEnglish={isEnglish} />)}{tracks.filter((item) => item.track.kind === Track.Kind.Audio).map((item) => <TrackMedia key={item.id} item={item} isEnglish={isEnglish} />)}</div> : <div className="grid min-h-72 place-items-center rounded-xl bg-slate-950 px-6 py-12 text-center text-white"><div className="max-w-md"><Video className="mx-auto size-12 text-white/70" /><h2 className="mt-4 text-lg font-semibold">{session.title}</h2><p className="mt-2 text-sm text-white/70">{tr('اضغط دخول لطلب اتصال مباشر. بعد اتصال الطالب، يسجل النظام حضوره تلقائيًا.', 'Join to connect to the live session. Student attendance is recorded automatically after connecting.')}</p><Button className="mt-5" onClick={() => void connect()} disabled={connecting}>{connecting ? tr('جارٍ الاتصال...', 'Connecting…') : tr('دخول البث', 'Join live session')}</Button></div></div>}
            {connected && <div className="mt-4 flex flex-wrap items-center justify-center gap-2"><Button variant={micEnabled ? 'outline' : 'destructive'} onClick={() => void toggleMic()} aria-label={micEnabled ? tr('كتم الميكروفون', 'Mute microphone') : tr('تشغيل الميكروفون', 'Turn on microphone')}>{micEnabled ? <Mic className="me-2 size-4" /> : <MicOff className="me-2 size-4" />}{micEnabled ? tr('كتم الصوت', 'Mute audio') : tr('تشغيل الصوت', 'Turn on audio')}</Button><Button variant={cameraEnabled ? 'outline' : 'destructive'} onClick={() => void toggleCamera()} aria-label={cameraEnabled ? tr('إيقاف الكاميرا', 'Turn off camera') : tr('تشغيل الكاميرا', 'Turn on camera')}>{cameraEnabled ? <VideoOff className="me-2 size-4" /> : <Video className="me-2 size-4" />}{cameraEnabled ? tr('إيقاف الكاميرا', 'Turn off camera') : tr('تشغيل الكاميرا', 'Turn on camera')}</Button><Button variant="destructive" onClick={() => void leave()}><Square className="me-2 size-4" />{tr('مغادرة البث', 'Leave session')}</Button></div>}
          </section>
          {connected && <p className="text-center text-xs text-muted-foreground">{tr('عدد المشاركين الظاهرين:', 'Visible participants:')} {new Set(tracks.map((item) => item.name)).size}</p>}
        </>
      )}
    </main>
  );
}
