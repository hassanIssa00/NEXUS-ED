'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import {
  AlertCircle, ArrowLeft, Check, Copy, Hand, Loader2, Maximize2, MessageCircle, Mic, MicOff,
  MonitorUp, PhoneOff, Send, Shield, Users, Video, VideoOff, Volume2, VolumeX, X,
} from 'lucide-react'
import type { AudioTrack, Participant, Room, VideoTrack } from 'livekit-client'

type StaffMember = { id: string; name: string; role: string; avatar?: string | null }
type Meeting = {
  id: string
  title: string
  description?: string | null
  scheduledAt: string
  startedAt?: string | null
  endedAt?: string | null
  status: string
  meetingType: 'CLASS' | 'PARENT' | 'STAFF' | string
  classroom?: { id: string; name: string } | null
  hostId: string
  host: StaffMember
  participants: Array<{ userId: string; joinedAt?: string | null; leftAt?: string | null; user: StaffMember }>
}
type JoinResponse = { url: string; token: string; meeting: { id: string; title: string; status: string; hostId: string } }
type MeetingChatItem = { id: string; name: string; identity: string; message: string; createdAt: number; mine: boolean }
type ParticipantTileState = { participant: Participant; camera?: VideoTrack; screen?: VideoTrack; microphone?: AudioTrack; speaking: boolean }

function getError(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: string | string[] } }; message?: string }
  const message = candidate?.response?.data?.message
  return Array.isArray(message) ? message.join('، ') : message || candidate?.message || fallback
}

function MediaTile({ tile, isEnglish }: { tile: ParticipantTileState; isEnglish: boolean }) {
  const videoMount = useRef<HTMLDivElement>(null)
  const audioMount = useRef<HTMLDivElement>(null)
  const visibleVideo = tile.screen || tile.camera

  useEffect(() => {
    if (!visibleVideo || !videoMount.current) return
    const element = visibleVideo.attach() as HTMLVideoElement
    element.autoplay = true
    element.playsInline = true
    element.muted = true
    element.className = 'h-full w-full object-cover'
    videoMount.current.replaceChildren(element)
    return () => { visibleVideo.detach(element); element.remove() }
  }, [visibleVideo])

  useEffect(() => {
    if (!tile.microphone || tile.participant.isLocal || !audioMount.current) return
    const element = tile.microphone.attach()
    element.autoplay = true
    element.muted = false
    element.volume = 1
    audioMount.current.replaceChildren(element)
    return () => { tile.microphone?.detach(element); element.remove() }
  }, [tile.microphone, tile.participant.isLocal])

  const name = tile.participant.name || tile.participant.identity
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
  return <article className={`relative min-h-48 overflow-hidden rounded-2xl border bg-[#112b3a] shadow-sm sm:min-h-64 ${tile.speaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background' : 'border-white/10'}`}>
    <div ref={videoMount} className="absolute inset-0" />
    <div ref={audioMount} className="hidden" />
    {!visibleVideo && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#244a61] to-[#102a3a] text-white"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-bold uppercase">{initials || <Users className="h-7 w-7" />}</div><span className="text-xs text-white/70">{isEnglish ? 'Camera off' : 'الكاميرا مغلقة'}</span></div>}
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-white"><span className="max-w-[75%] truncate text-sm font-semibold">{name}{tile.participant.isLocal ? (isEnglish ? ' (You)' : ' (أنت)') : ''}{tile.screen ? (isEnglish ? ' · Sharing screen' : ' · يشارك الشاشة') : ''}</span><span className="rounded-lg bg-black/35 p-1.5" aria-label={tile.participant.isMicrophoneEnabled ? (isEnglish ? 'Microphone on' : 'الميكروفون يعمل') : (isEnglish ? 'Microphone off' : 'الميكروفون مغلق')}>{tile.participant.isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-rose-200" />}</span></div>
  </article>
}

export default function NexusMeetingRoomPage() {
  const params = useParams<{ id: string }>()
  const meetingId = params.id
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const isEnglish = locale === 'en'
  const router = useRouter()
  const { profile } = useAuth()
  const roomRef = useRef<Room | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectionLabel, setConnectionLabel] = useState('')
  const [microphoneOn, setMicrophoneOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [screenShareOn, setScreenShareOn] = useState(false)
  const [audioNeedsPlayback, setAudioNeedsPlayback] = useState(false)
  const [error, setError] = useState('')
  const [tiles, setTiles] = useState<ParticipantTileState[]>([])
  const [chat, setChat] = useState<MeetingChatItem[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [raisedHands, setRaisedHands] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(true)
  const [pendingEnd, setPendingEnd] = useState(false)
  const [copied, setCopied] = useState(false)

  const isHost = meeting?.host.id === profile?.id
  const canManage = isHost || ['principal', 'hr'].includes(profile?.role || '')
  const isLive = meeting?.status === 'LIVE'
  const initials = useMemo(() => meeting?.host.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'N', [meeting?.host.name])

  const loadMeeting = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<Meeting>(`/meetings/${meetingId}`)
      setMeeting(data)
    } catch (requestError) {
      setError(getError(requestError, isEnglish ? 'Could not load this meeting.' : 'تعذر تحميل الاجتماع.'))
    } finally { setLoading(false) }
  }, [meetingId, isEnglish])

  useEffect(() => { void loadMeeting() }, [loadMeeting])

  const refreshTiles = useCallback((room: Room) => {
    const list = [room.localParticipant, ...room.remoteParticipants.values()]
    setTiles(list.map((participant) => {
      const cameraPublication = participant.getTrackPublication('camera' as never)
      const screenPublication = participant.getTrackPublication('screen_share' as never)
      const audioPublication = participant.getTrackPublication('microphone' as never)
      return {
        participant,
        camera: cameraPublication?.track as VideoTrack | undefined,
        screen: screenPublication?.track as VideoTrack | undefined,
        microphone: audioPublication?.track as AudioTrack | undefined,
        speaking: room.activeSpeakers.some((speaker) => speaker.identity === participant.identity),
      }
    }))
  }, [])

  const connectToMeeting = async () => {
    if (!meeting || connecting || connected) return
    setConnecting(true)
    setError('')
    setConnectionLabel(isEnglish ? 'Connecting to the private room…' : 'جارٍ الاتصال بغرفة الاجتماع الخاصة…')
    let room: Room | null = null
    try {
      const { data } = await apiClient.post<JoinResponse>(`/meetings/${meeting.id}/join`)
      const livekit = await import('livekit-client')
      room = new livekit.Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: livekit.VideoPresets.h360.resolution },
        publishDefaults: { videoEncoding: { maxBitrate: 520_000, maxFramerate: 15 }, simulcast: false },
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        disconnectOnPageLeave: true,
      })
      roomRef.current = room
      const updateTiles = () => refreshTiles(room!)
      room
        .on(livekit.RoomEvent.TrackSubscribed, updateTiles)
        .on(livekit.RoomEvent.TrackUnsubscribed, updateTiles)
        .on(livekit.RoomEvent.TrackPublished, updateTiles)
        .on(livekit.RoomEvent.TrackUnpublished, updateTiles)
        .on(livekit.RoomEvent.TrackMuted, updateTiles)
        .on(livekit.RoomEvent.TrackUnmuted, updateTiles)
        .on(livekit.RoomEvent.ParticipantConnected, updateTiles)
        .on(livekit.RoomEvent.ParticipantDisconnected, updateTiles)
        .on(livekit.RoomEvent.LocalTrackPublished, updateTiles)
        .on(livekit.RoomEvent.LocalTrackUnpublished, updateTiles)
        .on(livekit.RoomEvent.ActiveSpeakersChanged, updateTiles)
        .on(livekit.RoomEvent.Reconnecting, () => setConnectionLabel(isEnglish ? 'Connection interrupted — reconnecting…' : 'انقطع الاتصال مؤقتًا — جارٍ إعادة الاتصال…'))
        .on(livekit.RoomEvent.Reconnected, () => { setConnectionLabel(isEnglish ? 'Connected' : 'متصل'); setError('') })
        .on(livekit.RoomEvent.ConnectionStateChanged, (state) => setConnectionLabel(state === livekit.ConnectionState.Connected ? (isEnglish ? 'Connected' : 'متصل') : state === livekit.ConnectionState.Reconnecting ? (isEnglish ? 'Reconnecting…' : 'جارٍ إعادة الاتصال…') : state))
        .on(livekit.RoomEvent.Disconnected, () => { setConnected(false); setMicrophoneOn(false); setCameraOn(false); setScreenShareOn(false); setTiles([]) })
        .on(livekit.RoomEvent.AudioPlaybackStatusChanged, () => setAudioNeedsPlayback(!room!.canPlaybackAudio))
        .on(livekit.RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
          if (topic !== 'nexus-room-chat' && topic !== 'nexus-room-hand') return
          try {
            const packet = JSON.parse(new TextDecoder().decode(payload)) as { type?: string; message?: string; raised?: boolean }
            const identity = participant?.identity || 'participant'
            if (packet.type === 'chat' && typeof packet.message === 'string') {
              const name = participant?.name || identity
              setChat((previous) => [...previous, { id: `${identity}-${Date.now()}-${Math.random()}`, name, identity, message: packet.message!.slice(0, 1200), createdAt: Date.now(), mine: identity === profile?.id }].slice(-100))
            }
            if (packet.type === 'hand') setRaisedHands((previous) => packet.raised ? [...new Set([...previous, identity])] : previous.filter((item) => item !== identity))
          } catch { /* Ignore malformed meeting data packets. */ }
        })

      await room.connect(data.url, data.token, { autoSubscribe: true, maxRetries: 3, peerConnectionTimeout: 15_000 })
      setConnected(true)
      setConnectionLabel(isEnglish ? 'Connected' : 'متصل')
      setMeeting((current) => current ? { ...current, status: 'LIVE', startedAt: current.startedAt || new Date().toISOString() } : current)
      refreshTiles(room)
      try {
        await room.startAudio()
        setAudioNeedsPlayback(!room.canPlaybackAudio)
      } catch { setAudioNeedsPlayback(true) }
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setMicrophoneOn(true)
      } catch {
        setMicrophoneOn(false)
        setError(isEnglish ? 'Connected, but microphone permission was denied. Allow microphone access and press the microphone button.' : 'تم الاتصال، لكن المتصفح لم يسمح باستخدام الميكروفون. اسمح به من إعدادات المتصفح ثم اضغط زر الميكروفون.')
      }
    } catch (requestError) {
      room?.disconnect()
      roomRef.current = null
      setConnected(false)
      setError(getError(requestError, isEnglish ? 'Could not join the Nexus room. Check the meeting server and network.' : 'تعذر دخول غرفة نكسس. تحقق من خادم الاجتماعات والاتصال بالإنترنت.'))
    } finally {
      setConnecting(false)
    }
  }

  const cleanupAndLeave = async (navigate = true) => {
    const room = roomRef.current
    roomRef.current = null
    room?.disconnect()
    setConnected(false)
    try { await apiClient.post(`/meetings/${meetingId}/leave`) } catch { /* Leaving media still succeeds when the API is temporarily unreachable. */ }
    if (navigate) router.push('/meetings' as never)
  }

  useEffect(() => () => {
    roomRef.current?.disconnect()
    roomRef.current = null
    void apiClient.post(`/meetings/${meetingId}/leave`).catch(() => undefined)
  }, [meetingId])

  const toggleMicrophone = async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.localParticipant.setMicrophoneEnabled(!microphoneOn)
      setMicrophoneOn(!microphoneOn)
      setError('')
      refreshTiles(room)
    } catch (toggleError) { setError(getError(toggleError, isEnglish ? 'Could not change the microphone.' : 'تعذر تغيير حالة الميكروفون.')) }
  }

  const toggleCamera = async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.localParticipant.setCameraEnabled(!cameraOn, { resolution: (await import('livekit-client')).VideoPresets.h360.resolution, frameRate: 15 })
      setCameraOn(!cameraOn)
      setError('')
      refreshTiles(room)
    } catch (toggleError) { setError(getError(toggleError, isEnglish ? 'Could not start the camera. The room remains connected without video.' : 'تعذر تشغيل الكاميرا. يظل الاجتماع متصلًا بدون صورة.')) }
  }

  const toggleScreenShare = async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.localParticipant.setScreenShareEnabled(!screenShareOn)
      setScreenShareOn(!screenShareOn)
      setError('')
      refreshTiles(room)
    } catch (toggleError) { setError(getError(toggleError, isEnglish ? 'Screen sharing could not be started.' : 'تعذر بدء مشاركة الشاشة.')) }
  }

  const sendChatMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const room = roomRef.current
    const message = chatDraft.trim().slice(0, 1200)
    if (!room || !message) return
    try {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'chat', message })), { reliable: true, topic: 'nexus-room-chat' })
      setChat((previous) => [...previous, { id: `${profile?.id || 'me'}-${Date.now()}`, name: profile?.full_name || (isEnglish ? 'You' : 'أنت'), identity: profile?.id || 'me', message, createdAt: Date.now(), mine: true }].slice(-100))
      setChatDraft('')
    } catch (sendError) { setError(getError(sendError, isEnglish ? 'Message could not be sent.' : 'تعذر إرسال الرسالة.')) }
  }

  const toggleHand = async () => {
    const room = roomRef.current
    if (!room || !profile?.id) return
    const raised = !raisedHands.includes(profile.id)
    try {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'hand', raised })), { reliable: true, topic: 'nexus-room-hand' })
      setRaisedHands((previous) => raised ? [...new Set([...previous, profile.id])] : previous.filter((item) => item !== profile.id))
    } catch (handError) { setError(getError(handError, isEnglish ? 'Could not update raised hand.' : 'تعذر تحديث رفع اليد.')) }
  }

  const endMeeting = async () => {
    if (!meeting) return
    setPendingEnd(true)
    setError('')
    try {
      await apiClient.post(`/meetings/${meeting.id}/end`)
      const room = roomRef.current
      roomRef.current = null
      room?.disconnect()
      setConnected(false)
      router.push('/meetings' as never)
    } catch (endError) { setError(getError(endError, isEnglish ? 'Could not end the meeting.' : 'تعذر إنهاء الاجتماع.')) }
    finally { setPendingEnd(false) }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { setError(isEnglish ? 'This browser does not allow copying the link.' : 'المتصفح لم يسمح بنسخ الرابط.') }
  }

  if (loading) return <main className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground" dir={isEnglish ? 'ltr' : 'rtl'}><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? 'Loading meeting…' : 'جارٍ تحميل الاجتماع…'}</main>
  if (!meeting) return <main className="mx-auto max-w-3xl space-y-4 py-16 text-center" dir={isEnglish ? 'ltr' : 'rtl'}><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><AlertCircle className="h-6 w-6" /></div><h1 className="text-xl font-bold">{error || (isEnglish ? 'Meeting unavailable' : 'الاجتماع غير متاح')}</h1><button onClick={() => router.push('/meetings' as never)} className="rounded-xl bg-[#234a65] px-4 py-2 text-sm font-semibold text-white">{isEnglish ? 'Back to meetings' : 'العودة للاجتماعات'}</button></main>

  return <main className="mx-auto w-full max-w-[1500px] space-y-4" dir={isEnglish ? 'ltr' : 'rtl'}>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm sm:px-5">
      <div className="flex min-w-0 items-center gap-3"><button onClick={() => void cleanupAndLeave()} aria-label={isEnglish ? 'Back to meetings' : 'العودة للاجتماعات'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0"><h1 className="truncate font-bold">{meeting.title}</h1><p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : meeting.status === 'LIVE' ? 'bg-amber-400' : 'bg-slate-400'}`} />{connected ? connectionLabel : meeting.status === 'LIVE' ? (isEnglish ? 'Live room' : 'غرفة مباشرة') : new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(meeting.scheduledAt))}</p></div></div>
      <div className="flex items-center gap-2"><button onClick={() => void copyInviteLink()} className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium"><Copy className="h-3.5 w-3.5" />{copied ? (isEnglish ? 'Copied' : 'تم النسخ') : (isEnglish ? 'Copy link' : 'نسخ الرابط')}</button>{connected && <button onClick={() => setChatOpen((value) => !value)} className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium ${chatOpen ? 'bg-muted' : ''}`}><MessageCircle className="h-3.5 w-3.5" />{isEnglish ? 'Chat' : 'الدردشة'}</button>}</div>
    </header>

    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p><button onClick={() => setError('')} aria-label={isEnglish ? 'Dismiss' : 'إغلاق'} className="ms-auto"><X className="h-4 w-4" /></button></div>}

    {!connected ? <section className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border bg-card shadow-lg">
      <div className="bg-gradient-to-br from-[#193d53] to-[#356079] px-6 py-8 text-center text-white sm:px-10"><div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/10 text-2xl font-bold">{initials}</div><p className="text-xs text-white/70">{isEnglish ? `Meeting host · ${meeting.host.name}` : `منظم الاجتماع · ${meeting.host.name}`}{meeting.classroom?.name ? ` · ${meeting.classroom.name}` : ''}</p><h2 className="mt-2 text-2xl font-bold">{meeting.title}</h2>{meeting.description && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/75">{meeting.description}</p>}</div>
      <div className="space-y-5 p-6 sm:p-8"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{isEnglish ? 'Start time' : 'موعد الاجتماع'}</p><p className="mt-1 text-sm font-semibold">{new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(meeting.scheduledAt))}</p></div><div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{isEnglish ? 'Invited participants' : 'المشاركون المدعوون'}</p><p className="mt-1 text-sm font-semibold">{meeting.participants.length} {isEnglish ? 'school accounts' : 'حساب مدرسي'}</p></div></div>
        {meeting.status === 'SCHEDULED' && !isHost && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{isEnglish ? 'The meeting host has not opened the room yet.' : 'منظم الاجتماع لم يفتح الغرفة بعد.'}</div>}
        {(meeting.status === 'ENDED' || meeting.status === 'CANCELLED') && <div className="rounded-xl border bg-muted p-4 text-sm text-muted-foreground">{isEnglish ? `This meeting is ${meeting.status.toLowerCase()}.` : `هذا الاجتماع ${meeting.status === 'ENDED' ? 'انتهى' : 'ملغي'}.`}</div>}
        {meeting.status !== 'ENDED' && meeting.status !== 'CANCELLED' && (meeting.status === 'LIVE' || isHost) && <div className="flex flex-col gap-3 rounded-xl border border-[#234a65]/15 bg-[#234a65]/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{isEnglish ? 'Join with audio' : 'الدخول بالصوت'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{isEnglish ? 'Microphone starts only after you click. Camera stays off until you enable it.' : 'سيُفعّل الميكروفون بعد اختيارك. تظل الكاميرا مغلقة حتى تشغلها.'}</p></div><button disabled={connecting} onClick={() => void connectToMeeting()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#234a65] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}{connecting ? (isEnglish ? 'Joining…' : 'جارٍ الدخول…') : (isEnglish ? 'Join with audio' : 'انضم بالصوت')}</button></div>}
        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground"><Shield className="mt-0.5 h-4 w-4 shrink-0" />{isEnglish ? 'Only the invited active platform account can enter. The displayed name comes from that account; guest names are not accepted. Meetings are not recorded.' : 'الدخول للحساب المدرسي النشط المدعو فقط، والاسم من ملفه في المنصة ولا يوجد دخول باسم ضيف. لا يتم تسجيل الاجتماع.'}</div>
      </div>
    </section> : <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-2xl border bg-[#0f2633] shadow-sm">
        <div className="grid min-h-[50vh] grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:min-h-[68vh] xl:grid-cols-3">{tiles.map((tile) => <MediaTile key={tile.participant.identity} tile={tile} isEnglish={isEnglish} />)}{tiles.length === 0 && <div className="col-span-full flex min-h-64 items-center justify-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? 'Waiting for participants…' : 'بانتظار المشاركين…'}</div>}</div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-[#132f3e] p-3 sm:gap-3">
          <button title={microphoneOn ? (isEnglish ? 'Turn microphone off' : 'إيقاف الميكروفون') : (isEnglish ? 'Turn microphone on' : 'تشغيل الميكروفون')} onClick={() => void toggleMicrophone()} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${microphoneOn ? 'bg-[#35576a]' : 'bg-rose-600'}`}>{microphoneOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
          <button title={cameraOn ? (isEnglish ? 'Turn camera off' : 'إيقاف الكاميرا') : (isEnglish ? 'Turn camera on' : 'تشغيل الكاميرا')} onClick={() => void toggleCamera()} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${cameraOn ? 'bg-[#35576a]' : 'bg-[#26485c]'}`}>{cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</button>
          <button title={screenShareOn ? (isEnglish ? 'Stop sharing' : 'إيقاف المشاركة') : (isEnglish ? 'Share screen' : 'مشاركة الشاشة')} onClick={() => void toggleScreenShare()} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${screenShareOn ? 'bg-emerald-600' : 'bg-[#26485c]'}`}><MonitorUp className="h-5 w-5" /></button>
          <button title={raisedHands.includes(profile?.id || '') ? (isEnglish ? 'Lower hand' : 'إنزال اليد') : (isEnglish ? 'Raise hand' : 'رفع اليد')} onClick={() => void toggleHand()} className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${raisedHands.includes(profile?.id || '') ? 'bg-amber-500' : 'bg-[#26485c]'}`}><Hand className="h-5 w-5" /></button>
          {audioNeedsPlayback && <button title={isEnglish ? 'Enable meeting audio' : 'تفعيل صوت الاجتماع'} onClick={() => void roomRef.current?.startAudio().then(() => setAudioNeedsPlayback(false)).catch(() => setAudioNeedsPlayback(true))} className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-white"><VolumeX className="h-5 w-5" /></button>}
          {canManage && <button disabled={pendingEnd} onClick={() => void endMeeting()} title={isEnglish ? 'End meeting for everyone' : 'إنهاء الاجتماع للجميع'} className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{pendingEnd ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}{isEnglish ? 'End' : 'إنهاء'}</button>}
          {!canManage && <button onClick={() => void cleanupAndLeave()} title={isEnglish ? 'Leave meeting' : 'مغادرة الاجتماع'} className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white"><PhoneOff className="h-4 w-4" />{isEnglish ? 'Leave' : 'مغادرة'}</button>}
          <button title={isEnglish ? 'Full screen' : 'ملء الشاشة'} onClick={() => void document.documentElement.requestFullscreen?.()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#26485c] text-white"><Maximize2 className="h-4 w-4" /></button>
        </div>
      </section>

      {chatOpen && <aside className="flex max-h-[68vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#234a65]" /><h2 className="font-semibold">{isEnglish ? 'Meeting chat' : 'دردشة الاجتماع'}</h2></div><span className="text-xs text-muted-foreground">{tiles.length} <Users className="inline h-3.5 w-3.5" /></span></div>
        <div className="border-b px-4 py-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">{isEnglish ? 'Participants' : 'المشاركون'}</p><div className="max-h-28 space-y-1 overflow-y-auto">{meeting.participants.map((item) => <div key={item.userId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{item.user.name}{item.userId === meeting.host.id ? ` · ${isEnglish ? 'Organizer' : 'منظم'}` : ''}{raisedHands.includes(item.userId) ? ' ✋' : ''}</span>{canManage && item.userId !== profile?.id && item.userId !== meeting.host.id && <button onClick={() => void apiClient.post(`/meetings/${meeting.id}/participants/${item.userId}/remove`).then(() => { const room = roomRef.current; if (room) setTiles((previous) => previous.filter((tile) => tile.participant.identity !== item.userId)) }).catch((removeError) => setError(getError(removeError, isEnglish ? 'Could not remove participant.' : 'تعذر إخراج المشارك.')))} className="shrink-0 text-rose-700 hover:underline">{isEnglish ? 'Remove' : 'إخراج'}</button>}</div>)}</div></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">{chat.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">{isEnglish ? 'Messages stay in this room and are not saved after the meeting.' : 'تبقى الرسائل داخل هذه الغرفة ولا تُحفظ بعد الاجتماع.'}</p> : chat.map((item) => <div key={item.id} className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${item.mine ? 'ms-auto bg-[#234a65] text-white' : 'me-auto bg-muted'}`}><p className="mb-1 text-[10px] font-semibold opacity-75">{item.mine ? (isEnglish ? 'You' : 'أنت') : item.name}</p><p className="whitespace-pre-wrap break-words leading-5">{item.message}</p></div>)}<div ref={chatEndRef} /></div>
        <form onSubmit={sendChatMessage} className="flex items-center gap-2 border-t p-3"><input value={chatDraft} onChange={(event) => setChatDraft(event.target.value.slice(0, 1200))} maxLength={1200} placeholder={isEnglish ? 'Write a message…' : 'اكتب رسالة…'} className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#356079]/30" /><button disabled={!chatDraft.trim()} aria-label={isEnglish ? 'Send message' : 'إرسال الرسالة'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#234a65] text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form>
      </aside>}
    </div>}
  </main>
}
