'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import {
  AlertCircle, ArrowLeft, Check, Copy, Hand, Info, Loader2, Maximize2, MessageCircle, Mic, MicOff,
  MonitorUp, PhoneOff, Send, Shield, Users, Video, VideoOff, Volume2, VolumeX, X, Radio, Sparkles
} from 'lucide-react'

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

type ActivePeer = {
  userId: string
  userName: string
  role: string
  isHost: boolean
  micOn: boolean
  cameraOn: boolean
  raisedHand: boolean
  isScreenSharing: boolean
}

type MeetingChatItem = {
  id: string
  userId: string
  userName: string
  message: string
  createdAt: number
  mine: boolean
}

function getError(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: string | string[] } }; message?: string }
  const message = candidate?.response?.data?.message
  return Array.isArray(message) ? message.join(' • ') : message || candidate?.message || fallback
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
]

/** Stage or Strip Participant Video Card */
function StreamTile({
  stream,
  name,
  isLocal,
  isHost,
  isSpotlight,
  cameraOn,
  micOn,
  speaking,
  raisedHand,
  isScreenSharing,
  canManage,
  onMuteToggle,
  onCameraToggle,
  onKick,
  isEnglish,
}: {
  stream?: MediaStream | null
  name: string
  isLocal?: boolean
  isHost?: boolean
  isSpotlight?: boolean
  cameraOn?: boolean
  micOn?: boolean
  speaking?: boolean
  raisedHand?: boolean
  isScreenSharing?: boolean
  canManage?: boolean
  onMuteToggle?: () => void
  onCameraToggle?: () => void
  onKick?: () => void
  isEnglish: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const hasActiveVideoTrack = Boolean(
    stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  )
  const isVideoVisible = Boolean(isScreenSharing || ((cameraOn ?? true) && hasActiveVideoTrack))

  useEffect(() => {
    if (!videoRef.current) return
    if (stream && stream.getVideoTracks().length > 0) {
      videoRef.current.srcObject = stream
    } else {
      videoRef.current.srcObject = null
    }
  }, [stream, isVideoVisible, cameraOn])

  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('') || 'ن'

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-[#112b3a] shadow-lg transition-all ${
        isSpotlight
          ? 'h-full min-h-[420px] sm:min-h-[520px] xl:min-h-[580px] w-full border-amber-400/30'
          : 'h-44 sm:h-52 min-w-[200px] sm:min-w-[240px] border-white/10'
      } ${speaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f2633]' : ''}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full ${isSpotlight ? 'object-contain sm:object-cover' : 'object-cover'} ${isVideoVisible ? 'block' : 'hidden'}`}
      />
      {!isVideoVisible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1c3f56] to-[#0c1f2b] text-white">
          <div
            className={`flex items-center justify-center rounded-full border border-white/20 bg-white/10 font-bold uppercase shadow-inner ${
              isSpotlight ? 'h-24 w-24 text-4xl' : 'h-14 w-14 text-xl'
            }`}
          >
            {initials}
          </div>
          <span className={`${isSpotlight ? 'text-sm' : 'text-xs'} text-white/70 font-medium`}>
            {isEnglish ? 'Camera off' : 'الكاميرا مغلقة'}
          </span>
        </div>
      )}

      {/* Floating Badges (Top) */}
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isHost && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
              <Shield className="h-3.5 w-3.5" />
              {isEnglish ? 'Teacher / Host' : 'المعلم / مقدم الدرس'}
            </span>
          )}
          {raisedHand && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-black shadow animate-pulse">
              ✋ {isEnglish ? 'Hand raised' : 'يد مرفوعة'}
            </span>
          )}
          {isScreenSharing && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
              <MonitorUp className="h-3.5 w-3.5" />
              {isEnglish ? 'Screen' : 'مشاركة الشاشة'}
            </span>
          )}
        </div>

        {/* Teacher Moderation Controls on Student Card */}
        {canManage && !isLocal && (
          <div className="pointer-events-auto flex items-center gap-1.5 bg-black/80 rounded-xl p-1.5 backdrop-blur-md shadow-lg border border-white/10 opacity-95 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            {onMuteToggle && (
              <button
                onClick={onMuteToggle}
                title={micOn ? (isEnglish ? 'Mute microphone' : 'كتم المايكروفون') : (isEnglish ? 'Request microphone' : 'طلب فتح المايكروفون')}
                className={`rounded-lg p-1.5 text-white transition-colors ${micOn ? 'hover:bg-rose-600 bg-rose-600/30' : 'hover:bg-emerald-600 bg-emerald-600/30'}`}
              >
                {micOn ? <MicOff className="h-3.5 w-3.5 text-rose-300" /> : <Mic className="h-3.5 w-3.5 text-emerald-300" />}
              </button>
            )}
            {onCameraToggle && (
              <button
                onClick={onCameraToggle}
                title={cameraOn ? (isEnglish ? 'Close camera' : 'إغلاق الكاميرا') : (isEnglish ? 'Request camera' : 'طلب فتح الكاميرا')}
                className={`rounded-lg p-1.5 text-white transition-colors ${cameraOn ? 'hover:bg-rose-600 bg-rose-600/30' : 'hover:bg-blue-600 bg-blue-600/30'}`}
              >
                {cameraOn ? <VideoOff className="h-3.5 w-3.5 text-rose-300" /> : <Video className="h-3.5 w-3.5 text-blue-300" />}
              </button>
            )}
            {onKick && (
              <button
                onClick={onKick}
                title={isEnglish ? 'Remove from room' : 'طرد من القاعة'}
                className="rounded-lg p-1.5 text-white hover:bg-rose-600 transition-colors bg-white/10"
              >
                <X className="h-3.5 w-3.5 text-rose-300" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-8 text-white">
        <span className={`truncate font-semibold ${isSpotlight ? 'text-base sm:text-lg max-w-[80%]' : 'text-xs sm:text-sm max-w-[75%]'}`}>
          {name}{isLocal ? (isEnglish ? ' (You)' : ' (أنت)') : ''}
        </span>
        <span
          className={`rounded-lg p-1.5 ${micOn ? 'bg-emerald-600/90' : 'bg-rose-600/90'}`}
          aria-label={micOn ? 'Microphone on' : 'Microphone muted'}
        >
          {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-white" />}
        </span>
      </div>
    </article>
  )
}

function RemoteAudioMount({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream
      const playPromise = audioRef.current.play()
      if (playPromise) playPromise.catch(() => undefined)
    }
  }, [stream])
  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
    />
  )
}

export default function NexusMeetingRoomPage() {
  const params = useParams<{ id: string }>()
  const meetingId = params.id
  const locale = useLocale() === 'en' ? 'en' : 'ar'
  const isEnglish = locale === 'en'
  const router = useRouter()
  const { profile } = useAuth()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectionLabel, setConnectionLabel] = useState('')
  const [microphoneOn, setMicrophoneOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [screenShareOn, setScreenShareOn] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [interactivePrompt, setInteractivePrompt] = useState<{
    type: 'unmute' | 'camera'
    title: string
    actionText: string
    action: () => void
  } | null>(null)

  const [chat, setChat] = useState<MeetingChatItem[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [activePeers, setActivePeers] = useState<ActivePeer[]>([])
  const [pendingEnd, setPendingEnd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [clockNow, setClockNow] = useState(() => Date.now())

  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const [, setStreamVersion] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isHost = meeting?.host.id === profile?.id
  const canManage = isHost || ['principal', 'hr'].includes(profile?.role || '')
  const scheduledTimeReached = !!meeting && new Date(meeting.scheduledAt).getTime() <= clockNow
  const canJoinScheduledMeeting = isHost || scheduledTimeReached
  const initials = useMemo(
    () => meeting?.host.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || 'ن',
    [meeting?.host.name]
  )

  const loadMeeting = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<Meeting>(`/meetings/${meetingId}`)
      setMeeting(data)
    } catch (requestError) {
      setError(getError(requestError, isEnglish ? 'Could not load this meeting.' : 'تعذر تحميل بيانات الاجتماع.'))
    } finally {
      setLoading(false)
    }
  }, [meetingId, isEnglish])

  useEffect(() => {
    void loadMeeting()
  }, [loadMeeting])

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  // Cleanly teardown media and connections
  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()
    pendingCandidatesRef.current.clear()
    setConnected(false)
    setMicrophoneOn(false)
    setCameraOn(false)
    setScreenShareOn(false)
    setHandRaised(false)
    setActivePeers([])
    setStreamVersion((v) => v + 1)
  }, [])

  const cleanupAndLeave = useCallback(async (navigate = true) => {
    cleanupMedia()
    try {
      await apiClient.post(`/meetings/${meetingId}/leave`)
    } catch {
      // Ignore exit reporting error
    }
    if (navigate) router.push('/meetings' as never)
  }, [cleanupMedia, meetingId, router])

  useEffect(() => {
    return () => {
      cleanupMedia()
      void apiClient.post(`/meetings/${meetingId}/leave`).catch(() => undefined)
    }
  }, [cleanupMedia, meetingId])

  // Flush queued ICE candidates after remote description is set
  const flushPendingCandidates = useCallback(async (remoteUserId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current.get(remoteUserId) || []
    while (queue.length > 0) {
      const cand = queue.shift()
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand))
        } catch {
          // Ignore duplicate / invalid ICE candidate
        }
      }
    }
  }, [])

  // Create an RTCPeerConnection for a remote peer with bidirectional transceivers
  const getOrCreatePeerConnection = useCallback((remoteUserId: string, isInitiator: boolean) => {
    let pc = peerConnectionsRef.current.get(remoteUserId)
    if (pc && pc.signalingState !== 'closed') return pc

    pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS })
    peerConnectionsRef.current.set(remoteUserId, pc)

    // Add current local tracks if available
    const currentStream = screenStreamRef.current || localStreamRef.current
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        pc!.addTrack(track, currentStream)
      })
    }

    // Ensure audio and video transceivers exist so we can receive even if local camera is off
    const existingKinds = pc.getTransceivers().map((t) => t.receiver.track?.kind)
    if (!existingKinds.includes('audio')) {
      pc.addTransceiver('audio', { direction: 'sendrecv' })
    }
    if (!existingKinds.includes('video')) {
      pc.addTransceiver('video', { direction: 'sendrecv' })
    }

    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track])
      const existing = remoteStreamsRef.current.get(remoteUserId)
      if (existing) {
        if (!existing.getTracks().some((t) => t.id === event.track.id)) {
          existing.addTrack(event.track)
        }
      } else {
        remoteStreamsRef.current.set(remoteUserId, incomingStream)
      }
      setStreamVersion((v) => v + 1)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void apiClient.post(`/meetings/${meetingId}/signal`, {
          toUserId: remoteUserId,
          signal: { type: 'ice', candidate: event.candidate },
        }).catch(() => undefined)
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        peerConnectionsRef.current.delete(remoteUserId)
        remoteStreamsRef.current.delete(remoteUserId)
        pendingCandidatesRef.current.delete(remoteUserId)
        setStreamVersion((v) => v + 1)
      }
    }

    if (isInitiator) {
      try { pc.createDataChannel('nexus-control') } catch {}

      void (async () => {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await apiClient.post(`/meetings/${meetingId}/signal`, {
            toUserId: remoteUserId,
            signal: { type: 'offer', sdp: offer },
          })
        } catch {
          // Ignore transient negotiation error
        }
      })()
    }

    return pc
  }, [meetingId])

  // Heartbeat loop: synchronizes active peers, meeting status, and incoming chat
  useEffect(() => {
    if (!connected || !meeting) return

    let cancelled = false
    const pollInterval = window.setInterval(async () => {
      if (cancelled) return
      try {
        const { data } = await apiClient.post<{
          meetingStatus: string
          peers: ActivePeer[]
          messages: Array<{ id: string; userId: string; userName: string; message: string; createdAt: number }>
        }>(`/meetings/${meeting.id}/heartbeat`, {
          micOn: microphoneOn,
          cameraOn,
          raisedHand: handRaised,
          isScreenSharing: screenShareOn,
        })

        if (cancelled) return

        if (data.meetingStatus === 'ENDED' || data.meetingStatus === 'CANCELLED') {
          cleanupMedia()
          setError(isEnglish ? 'The meeting has been ended by the organizer.' : 'تم إنهاء الاجتماع بواسطة المنظم.')
          window.setTimeout(() => router.push('/meetings' as never), 2000)
          return
        }

        setActivePeers(data.peers)

        // Connect to any other active peer in the room
        data.peers.forEach((peer) => {
          if (peer.userId === profile?.id) return
          if (!peerConnectionsRef.current.has(peer.userId)) {
            const isInitiator = (profile?.id || '') > peer.userId
            getOrCreatePeerConnection(peer.userId, isInitiator)
          }
        })

        // Prune peers that left
        const currentActiveIds = new Set(data.peers.map((p) => p.userId))
        peerConnectionsRef.current.forEach((pc, peerId) => {
          if (!currentActiveIds.has(peerId)) {
            pc.close()
            peerConnectionsRef.current.delete(peerId)
            remoteStreamsRef.current.delete(peerId)
            pendingCandidatesRef.current.delete(peerId)
            setStreamVersion((v) => v + 1)
          }
        })

        // Append new chat messages
        if (data.messages && data.messages.length > 0) {
          setChat((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const fresh = data.messages
              .filter((m) => !existingIds.has(m.id))
              .map((m) => ({
                id: m.id,
                userId: m.userId,
                userName: m.userName,
                message: m.message,
                createdAt: m.createdAt,
                mine: m.userId === profile?.id,
              }))
            if (fresh.length === 0) return prev
            return [...prev, ...fresh].slice(-100)
          })
        }
      } catch {
        // Suppress background polling network error
      }
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(pollInterval)
    }
  }, [connected, meeting, microphoneOn, cameraOn, handRaised, screenShareOn, profile?.id, getOrCreatePeerConnection, cleanupMedia, isEnglish, router])

  // Signal polling loop: fetches SDP offers/answers/ICE candidates and Teacher moderation commands
  useEffect(() => {
    if (!connected || !meeting) return

    let cancelled = false
    const signalInterval = window.setInterval(async () => {
      if (cancelled) return
      try {
        const { data } = await apiClient.get<
          Array<{ id: string; fromUserId: string; signal: any; createdAt: string }>
        >(`/meetings/${meeting.id}/signals`)

        if (cancelled || !data || data.length === 0) return

        for (const item of data) {
          const { fromUserId, signal } = item
          if (!signal || !fromUserId) continue

          // ── Teacher Moderation Actions ──
          if (signal.type === 'kick') {
            cleanupMedia()
            setError(isEnglish ? 'You were removed from this meeting by the teacher.' : 'تم استبعادك من هذا الاجتماع من قِبل المعلم.')
            window.setTimeout(() => router.push('/meetings' as never), 2200)
            return
          }

          if (signal.type === 'force_mute') {
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = false
              })
            }
            setMicrophoneOn(false)
            setNotice(isEnglish ? 'The teacher muted your microphone.' : 'قام المعلم بكتم صوتك.')
            continue
          }

          if (signal.type === 'force_camera_off') {
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = false
              })
            }
            setCameraOn(false)
            setNotice(isEnglish ? 'The teacher turned off your camera.' : 'قام المعلم بإغلاق الكاميرا الخاصة بك.')
            continue
          }

          if (signal.type === 'request_unmute') {
            setInteractivePrompt({
              type: 'unmute',
              title: isEnglish ? 'The teacher requested you to speak.' : 'طلب منك المعلم التحدث (فتح المايكروفون).',
              actionText: isEnglish ? 'Unmute microphone' : 'تشغيل المايكروفون الآن',
              action: () => {
                void toggleMicrophone()
                setInteractivePrompt(null)
              },
            })
            continue
          }

          if (signal.type === 'request_camera_on') {
            setInteractivePrompt({
              type: 'camera',
              title: isEnglish ? 'The teacher requested you to turn on your camera.' : 'طلب منك المعلم تشغيل الكاميرا الخاصة بك.',
              actionText: isEnglish ? 'Turn on camera' : 'تشغيل الكاميرا الآن',
              action: () => {
                void toggleCamera()
                setInteractivePrompt(null)
              },
            })
            continue
          }

          // ── WebRTC Handshake Signals ──
          const pc = getOrCreatePeerConnection(fromUserId, false)

          if (signal.type === 'offer' && signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            await flushPendingCandidates(fromUserId, pc)

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await apiClient.post(`/meetings/${meeting.id}/signal`, {
              toUserId: fromUserId,
              signal: { type: 'answer', sdp: answer },
            })
          } else if (signal.type === 'answer' && signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            await flushPendingCandidates(fromUserId, pc)
          } else if (signal.type === 'ice' && signal.candidate) {
            if (!pc.remoteDescription) {
              const pending = pendingCandidatesRef.current.get(fromUserId) || []
              pending.push(signal.candidate)
              pendingCandidatesRef.current.set(fromUserId, pending)
            } else {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              } catch {
                // Ignore late candidate
              }
            }
          }
        }
      } catch {
        // Suppress signal poll network failure
      }
    }, 1200)

    return () => {
      cancelled = true
      window.clearInterval(signalInterval)
    }
  }, [connected, meeting, getOrCreatePeerConnection, flushPendingCandidates, cleanupMedia, isEnglish, router])

  // Join meeting handler
  const connectToMeeting = async () => {
    if (!meeting || connecting || connected) return
    setConnecting(true)
    setError('')
    setNotice('')
    setConnectionLabel(isEnglish ? 'Accessing devices...' : 'جاري تشغيل المايكروفون والكاميرا...')

    try {
      // 1. Request camera and microphone access
      let localStream: MediaStream | null = null
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: true,
          })
          setMicrophoneOn(true)
          setCameraOn(true)
        } catch {
          // Fallback to audio only
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })
            setMicrophoneOn(true)
            setCameraOn(false)
            setNotice(isEnglish ? 'Connected with audio only (camera unavailable).' : 'تم الدخول بالصوت (الكاميرا غير متوفرة أو معطلة في المتصفح).')
          } catch {
            localStream = null
            setMicrophoneOn(false)
            setCameraOn(false)
            setNotice(isEnglish ? 'Connected in listen-only mode.' : 'تم الدخول كـ مستمع. يمكنك الضغط على المايكروفون لمنح الإذن في أي وقت.')
          }
        }
      }
      localStreamRef.current = localStream

      setConnectionLabel(isEnglish ? 'Entering classroom...' : 'الدخول لقاعة الاجتماع...')

      await apiClient.post<{
        mode?: string
        meeting: { id: string; title: string; status: string; hostId: string }
        user: { id: string; name: string; role: string }
      }>(`/meetings/${meeting.id}/join`)

      setMeeting((curr) => curr ? { ...curr, status: 'LIVE', startedAt: curr.startedAt || new Date().toISOString() } : curr)
      setConnected(true)
      setConnectionLabel(isEnglish ? 'Connected' : 'متصل')
    } catch (joinError) {
      cleanupMedia()
      setError(getError(joinError, isEnglish ? 'Could not join the meeting. Please try again.' : 'تعذر الانضمام للاجتماع. يرجى المحاولة مرة أخرى.'))
    } finally {
      setConnecting(false)
    }
  }

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream
        setMicrophoneOn(true)
        stream.getAudioTracks().forEach((track) => {
          peerConnectionsRef.current.forEach((pc) => {
            const audioTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio')
            if (audioTransceiver?.sender) {
              void audioTransceiver.sender.replaceTrack(track)
              audioTransceiver.direction = 'sendrecv'
            } else {
              pc.addTrack(track, stream)
            }
          })
        })
        setStreamVersion((v) => v + 1)
        return
      } catch {
        setNotice(isEnglish ? 'Microphone permission was denied by browser.' : 'تم رفض إذن المايكروفون من قِبل المتصفح.')
        return
      }
    }
    const liveAudioTrack = localStreamRef.current.getAudioTracks().find((t) => t.readyState === 'live')
    if (!liveAudioTrack) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const track = stream.getAudioTracks()[0]
        localStreamRef.current.addTrack(track)
        peerConnectionsRef.current.forEach((pc) => {
          const audioTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio')
          if (audioTransceiver?.sender) {
            void audioTransceiver.sender.replaceTrack(track)
            audioTransceiver.direction = 'sendrecv'
          } else {
            pc.addTrack(track, localStreamRef.current!)
          }
        })
        setMicrophoneOn(true)
        setStreamVersion((v) => v + 1)
        return
      } catch {
        setNotice(isEnglish ? 'Could not access microphone.' : 'تعذر تشغيل المايكروفون.')
        return
      }
    }
    const nextState = !microphoneOn
    liveAudioTrack.enabled = nextState
    setMicrophoneOn(nextState)
  }

  // Toggle camera (with robust transceiver track replacement)
  const toggleCamera = async () => {
    // If no stream exists yet, request camera
    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        setCameraOn(true)
        setMicrophoneOn(true)
        stream.getTracks().forEach((track) => {
          peerConnectionsRef.current.forEach((pc) => {
            const transceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === track.kind || t.sender.track?.kind === track.kind)
            if (transceiver?.sender) {
              void transceiver.sender.replaceTrack(track)
              transceiver.direction = 'sendrecv'
            } else {
              pc.addTrack(track, stream)
            }
          })
        })
        setStreamVersion((v) => v + 1)
        return
      } catch (err: any) {
        if (err?.name === 'NotReadableError') {
          setNotice(isEnglish ? 'Camera is currently in use by another tab or program.' : 'الكاميرا قيد الاستخدام حالياً في نافذة أخرى (أو برنامج آخر).')
        } else if (err?.name === 'NotAllowedError') {
          setNotice(isEnglish ? 'Camera permission was denied in browser settings.' : 'تم رفض إذن الكاميرا. اضغط على أيقونة القفل بجانب الرابط للسماح.')
        } else if (err?.name === 'NotFoundError') {
          setNotice(isEnglish ? 'No camera device found.' : 'لم يتم العثور على كاميرا في هذا الجهاز.')
        } else {
          setNotice(isEnglish ? 'Could not open camera.' : `تعذر تشغيل الكاميرا (${err?.name || 'خطأ'})`)
        }
        return
      }
    }

    const liveVideoTrack = localStreamRef.current.getVideoTracks().find((t) => t.readyState === 'live')
    if (!liveVideoTrack) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        const track = stream.getVideoTracks()[0]
        localStreamRef.current.addTrack(track)
        peerConnectionsRef.current.forEach((pc) => {
          const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video' || t.sender.track?.kind === 'video')
          if (videoTransceiver?.sender) {
            void videoTransceiver.sender.replaceTrack(track)
            videoTransceiver.direction = 'sendrecv'
          } else {
            pc.addTrack(track, localStreamRef.current!)
          }
        })
        setCameraOn(true)
        setStreamVersion((v) => v + 1)
        return
      } catch (err: any) {
        if (err?.name === 'NotReadableError') {
          setNotice(isEnglish ? 'Camera is currently in use by another tab.' : 'الكاميرا قيد الاستخدام حالياً في نافذة المعلم أو تطبيق آخر.')
        } else if (err?.name === 'NotAllowedError') {
          setNotice(isEnglish ? 'Camera permission was denied in browser settings.' : 'يرجى السماح بالكاميرا من إعدادات المتصفح.')
        } else {
          setNotice(isEnglish ? 'Could not access camera.' : `تعذر تشغيل الكاميرا (${err?.name || 'غير متوفرة'})`)
        }
        return
      }
    }

    const nextState = !cameraOn
    liveVideoTrack.enabled = nextState
    setCameraOn(nextState)
    setStreamVersion((v) => v + 1)
  }

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (screenShareOn) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
      setScreenShareOn(false)
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null
      peerConnectionsRef.current.forEach((pc) => {
        const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video' || t.sender.track?.kind === 'video')
        if (videoTransceiver?.sender && cameraTrack) {
          void videoTransceiver.sender.replaceTrack(cameraTrack)
        }
      })
      setStreamVersion((v) => v + 1)
      return
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error(isEnglish ? 'Screen sharing is not supported on this device.' : 'مشاركة الشاشة غير مدعومة على هذا الجهاز.')
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = stream
      setScreenShareOn(true)

      const screenTrack = stream.getVideoTracks()[0]
      screenTrack.onended = () => {
        void toggleScreenShare()
      }

      peerConnectionsRef.current.forEach((pc) => {
        const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video' || t.sender.track?.kind === 'video')
        if (videoTransceiver?.sender) {
          void videoTransceiver.sender.replaceTrack(screenTrack)
        } else {
          pc.addTrack(screenTrack, stream)
        }
      })
      setStreamVersion((v) => v + 1)
    } catch {
      setScreenShareOn(false)
    }
  }

  // Send chat message
  const sendChatMessage = async (e: FormEvent) => {
    e.preventDefault()
    const text = chatDraft.trim().slice(0, 1200)
    if (!text || !meeting) return
    try {
      const { data } = await apiClient.post<MeetingChatItem>(`/meetings/${meeting.id}/chat`, { message: text })
      setChat((prev) => [...prev, { ...data, mine: true }].slice(-100))
      setChatDraft('')
      window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {
      setNotice(isEnglish ? 'Could not send message.' : 'تعذر إرسال الرسالة.')
    }
  }

  const toggleHand = () => {
    setHandRaised((prev) => !prev)
  }

  // Host: End meeting for everyone
  const endMeeting = async () => {
    if (!meeting) return
    setPendingEnd(true)
    setError('')
    try {
      await apiClient.post(`/meetings/${meeting.id}/end`)
      cleanupMedia()
      router.push('/meetings' as never)
    } catch (endError) {
      setError(getError(endError, isEnglish ? 'Could not end the meeting.' : 'تعذر إنهاء الاجتماع.'))
    } finally {
      setPendingEnd(false)
    }
  }

  // Host: Toggle Student Mic (Mute or Request Unmute)
  const handleTeacherMicToggle = async (studentId: string, currentlyMicOn: boolean) => {
    if (!meeting) return
    try {
      if (currentlyMicOn) {
        // Force mute
        await apiClient.post(`/meetings/${meeting.id}/participants/${studentId}/mute`)
        setNotice(isEnglish ? 'Student microphone muted.' : 'تم كتم مايكروفون الطالب.')
      } else {
        // Request unmute
        await apiClient.post(`/meetings/${meeting.id}/signal`, {
          toUserId: studentId,
          signal: { type: 'request_unmute' },
        })
        setNotice(isEnglish ? 'Sent unmute request to student.' : 'تم إرسال طلب فتح المايكروفون للطالب.')
      }
    } catch {
      setNotice(isEnglish ? 'Could not control student microphone.' : 'تعذر التحكم في مايكروفون الطالب.')
    }
  }

  // Host: Toggle Student Camera (Force off or Request on)
  const handleTeacherCameraToggle = async (studentId: string, currentlyCameraOn: boolean) => {
    if (!meeting) return
    try {
      if (currentlyCameraOn) {
        // Force camera off
        await apiClient.post(`/meetings/${meeting.id}/signal`, {
          toUserId: studentId,
          signal: { type: 'force_camera_off' },
        })
        setNotice(isEnglish ? 'Student camera turned off.' : 'تم إغلاق كاميرا الطالب.')
      } else {
        // Request camera on
        await apiClient.post(`/meetings/${meeting.id}/signal`, {
          toUserId: studentId,
          signal: { type: 'request_camera_on' },
        })
        setNotice(isEnglish ? 'Sent camera request to student.' : 'تم إرسال طلب تشغيل الكاميرا للطالب.')
      }
    } catch {
      setNotice(isEnglish ? 'Could not control student camera.' : 'تعذر التحكم في كاميرا الطالب.')
    }
  }

  // Host: Mute All Students
  const handleMuteAll = async () => {
    if (!meeting) return
    try {
      await apiClient.post(`/meetings/${meeting.id}/mute-all`)
      setNotice(isEnglish ? 'All students muted.' : 'تم كتم صوت جميع الطلاب بالقاعة.')
    } catch {
      setNotice(isEnglish ? 'Could not mute all students.' : 'تعذر كتم صوت الجميع.')
    }
  }

  // Host: Kick a student
  const kickStudent = async (studentId: string) => {
    if (!meeting) return
    try {
      await apiClient.post(`/meetings/${meeting.id}/participants/${studentId}/remove`)
      const pc = peerConnectionsRef.current.get(studentId)
      if (pc) {
        pc.close()
        peerConnectionsRef.current.delete(studentId)
        remoteStreamsRef.current.delete(studentId)
        pendingCandidatesRef.current.delete(studentId)
        setStreamVersion((v) => v + 1)
      }
      setNotice(isEnglish ? 'Student removed from room.' : 'تم استبعاد الطالب من القاعة.')
    } catch {
      setNotice(isEnglish ? 'Could not remove participant.' : 'تعذر استبعاد المشارك.')
    }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setNotice(isEnglish ? 'Could not copy link.' : 'تعذر نسخ الرابط.')
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground" dir={isEnglish ? 'ltr' : 'rtl'}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {isEnglish ? 'Loading meeting...' : 'جاري تحميل قاعة الاجتماع...'}
      </main>
    )
  }

  if (!meeting) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 py-16 text-center" dir={isEnglish ? 'ltr' : 'rtl'}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold">{error || (isEnglish ? 'Meeting unavailable' : 'الاجتماع غير متاح')}</h1>
        <button
          onClick={() => router.push('/meetings' as never)}
          className="rounded-xl bg-[#234a65] px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {isEnglish ? 'Back to meetings' : 'العودة لقائمة الاجتماعات'}
        </button>
      </main>
    )
  }

  const otherPeers = activePeers.filter((p) => p.userId !== profile?.id)

  // ── Spotlight Role Mapping ──
  // If current user is host -> Current user is Spotlight Presenter.
  // If current user is student -> Teacher peer (if in room) is Spotlight Presenter.
  const remoteHostPeer = otherPeers.find((p) => p.isHost)
  const isTeacherOnStage = isHost || Boolean(remoteHostPeer)

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4" dir={isEnglish ? 'ltr' : 'rtl'}>
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => void cleanupAndLeave()}
            aria-label={isEnglish ? 'Back to meetings' : 'العودة للاجتماعات'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-bold text-base sm:text-lg">{meeting.title}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : meeting.status === 'LIVE' ? 'bg-amber-400' : 'bg-slate-400'}`} />
              {connected
                ? connectionLabel
                : meeting.status === 'LIVE'
                  ? (isEnglish ? 'Live room' : 'غرفة حية ومفتوحة الآن')
                  : new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(meeting.scheduledAt))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void copyInviteLink()}
            className="inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium hover:bg-muted"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? (isEnglish ? 'Copied' : 'تم النسخ') : (isEnglish ? 'Copy link' : 'نسخ الرابط')}
          </button>

          {connected && (
            <>
              <button
                onClick={() => setChatOpen((v) => !v)}
                className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${chatOpen ? 'bg-[#234a65] text-white' : 'hover:bg-muted'}`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {isEnglish ? 'Chat' : 'المحادثة'}
                {chat.length > 0 && <span className="ms-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{chat.length}</span>}
              </button>

              <button
                onClick={() => setParticipantsOpen((v) => !v)}
                className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${participantsOpen ? 'bg-[#234a65] text-white' : 'hover:bg-muted'}`}
              >
                <Users className="h-3.5 w-3.5" />
                {isEnglish ? 'Attendees' : 'المشاركون'}
                <span className="ms-1 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] text-white">{activePeers.length || 1}</span>
              </button>

              {canManage && (
                <button
                  disabled={pendingEnd}
                  onClick={() => void endMeeting()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                >
                  {pendingEnd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOff className="h-3.5 w-3.5" />}
                  {isEnglish ? 'End meeting' : 'إنهاء للجميع'}
                </button>
              )}

              {!canManage && (
                <button
                  onClick={() => void cleanupAndLeave()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                  {isEnglish ? 'Leave' : 'مغادرة'}
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Interactive Teacher Action Prompt (e.g. Unmute request, Camera request) */}
      {interactivePrompt && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-md animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-600 animate-pulse" />
            <span className="font-bold">{interactivePrompt.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={interactivePrompt.action}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow"
            >
              {interactivePrompt.actionText}
            </button>
            <button
              onClick={() => setInteractivePrompt(null)}
              className="rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              {isEnglish ? 'Dismiss' : 'تجاهل'}
            </button>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm animate-in fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <button onClick={() => setError('')} aria-label={isEnglish ? 'Dismiss' : 'إغلاق'} className="ms-auto text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Gentle Notice / Guidance Banner */}
      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-800 shadow-sm animate-in fade-in">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
          <p className="flex-1 font-medium">{notice}</p>
          <button onClick={() => setNotice('')} aria-label={isEnglish ? 'Dismiss' : 'إغلاق'} className="ms-auto text-blue-600 hover:text-blue-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── NOT CONNECTED: Pre-Join Room Card ── */}
      {!connected ? (
        <section className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-3xl border bg-card shadow-lg">
          <div className="bg-gradient-to-br from-[#193d53] to-[#356079] px-6 py-8 text-center text-white sm:px-10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/10 text-2xl font-bold shadow-inner">
              {initials}
            </div>
            <p className="text-xs text-white/75 font-medium">
              {isEnglish ? `Meeting host • ${meeting.host.name}` : `منظم الاجتماع • ${meeting.host.name}`}
              {meeting.classroom?.name ? ` • ${meeting.classroom.name}` : ''}
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{meeting.title}</h2>
            {meeting.description && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/80">{meeting.description}</p>}
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{isEnglish ? 'Start time' : 'موعد الاجتماع'}</p>
                <p className="mt-1 text-sm font-semibold">
                  {new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(meeting.scheduledAt))}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{isEnglish ? 'Invited participants' : 'المشاركون المدعوون'}</p>
                <p className="mt-1 text-sm font-semibold">{meeting.participants.length} {isEnglish ? 'school accounts' : 'حساب مدرسي'}</p>
              </div>
            </div>

            {meeting.status === 'SCHEDULED' && !isHost && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {scheduledTimeReached
                  ? (isEnglish ? 'The scheduled time has arrived. Join now to open the room.' : 'حان موعد الاجتماع. انضم الآن لفتح الغرفة.')
                  : (isEnglish ? 'You can enter when the scheduled time arrives.' : 'يمكنك الدخول عند حلول موعد الاجتماع.')}
              </div>
            )}

            {(meeting.status === 'ENDED' || meeting.status === 'CANCELLED') && (
              <div className="rounded-xl border bg-muted p-4 text-sm text-muted-foreground">
                {isEnglish ? `This meeting is ${meeting.status.toLowerCase()}.` : `هذا الاجتماع ${meeting.status === 'ENDED' ? 'منتهي' : 'ملغي'}.`}
              </div>
            )}

            {meeting.status !== 'ENDED' && meeting.status !== 'CANCELLED' && (meeting.status === 'LIVE' || (meeting.status === 'SCHEDULED' && canJoinScheduledMeeting)) && (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#234a65]/20 bg-gradient-to-r from-[#234a65]/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-base">{isEnglish ? 'Enter Meeting Room' : 'الدخول المباشر للقاعة'}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {isEnglish ? 'Instant join with full teacher control and platform account.' : 'دخول فوري بحسابك المسجل في المنصة بدون الحاجة لأي تسجيل خارجي.'}
                  </p>
                </div>
                <button
                  disabled={connecting}
                  onClick={() => void connectToMeeting()}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#234a65] px-6 text-sm font-bold text-white shadow-md hover:bg-[#1a384d] disabled:opacity-60 transition-colors"
                >
                  {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                  {connecting
                    ? (isEnglish ? 'Joining...' : 'جاري الانضمام...')
                    : (meeting.status === 'SCHEDULED' && !isHost ? (isEnglish ? 'Join Room' : 'انضم الآن لفتح الغرفة') : (isEnglish ? 'Join Room' : 'انضمام الآن'))}
                </button>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3.5 text-xs leading-5 text-muted-foreground">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#234a65]" />
              {isEnglish
                ? 'Only school members can enter. Teacher has full moderation authority.'
                : 'الدخول للحساب المدرسي في المنصة. المعلم يمتلك كامل صلاحيات إدارة القاعة.'}
            </div>
          </div>
        </section>
      ) : (
        /* ── CONNECTED: Spotlight Stage Classroom Layout ── */
        <div className={`grid gap-4 ${chatOpen || participantsOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
          <section className="flex flex-col overflow-hidden rounded-2xl border bg-[#0f2633] shadow-lg p-3 sm:p-4 gap-3">
            {/* ── STAGE VIEW (Main Hero Area for Teacher) ── */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* LARGE SPOTLIGHT: Teacher / Presenter */}
              <div className="w-full flex-1 min-h-[380px] sm:min-h-[480px] xl:min-h-[540px]">
                {isHost ? (
                  /* Current user is the teacher -> Large Hero Stage */
                  <StreamTile
                    stream={screenStreamRef.current || localStreamRef.current}
                    name={profile?.full_name || 'أنت'}
                    isLocal
                    isHost
                    isSpotlight
                    cameraOn={cameraOn}
                    micOn={microphoneOn}
                    raisedHand={handRaised}
                    isScreenSharing={screenShareOn}
                    isEnglish={isEnglish}
                  />
                ) : remoteHostPeer ? (
                  /* Current user is a student -> Teacher is in Large Hero Stage */
                  <div className="h-full w-full">
                    <StreamTile
                      stream={remoteStreamsRef.current.get(remoteHostPeer.userId)}
                      name={remoteHostPeer.userName}
                      isLocal={false}
                      isHost
                      isSpotlight
                      cameraOn={remoteHostPeer.cameraOn}
                      micOn={remoteHostPeer.micOn}
                      raisedHand={remoteHostPeer.raisedHand}
                      isScreenSharing={remoteHostPeer.isScreenSharing}
                      isEnglish={isEnglish}
                    />
                    {remoteStreamsRef.current.get(remoteHostPeer.userId) && (
                      <RemoteAudioMount stream={remoteStreamsRef.current.get(remoteHostPeer.userId)!} />
                    )}
                  </div>
                ) : (
                  /* Waiting for teacher to enter */
                  <div className="h-full min-h-[380px] sm:min-h-[480px] rounded-2xl border border-white/10 bg-[#112b3a] flex flex-col items-center justify-center p-6 text-center text-white/70 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                    <div>
                      <p className="font-bold text-lg text-white">{isEnglish ? 'Waiting for Teacher to start stage...' : 'في انتظار اعتلاء المعلم المنصة...'}</p>
                      <p className="text-xs text-white/50 mt-1">{isEnglish ? 'You are in the classroom. Teacher will appear here.' : 'أنت متواجد بالقاعة، وستظهر شاشة المعلم هنا فور دخوله.'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECONDARY STRIP: Students & Classmates ── */}
              <div className="w-full pt-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    {isEnglish ? 'Classroom Participants' : 'طلاب ومشاركو القاعة'}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white">
                      {isHost ? otherPeers.length : otherPeers.filter((p) => !p.isHost).length + 1}
                    </span>
                  </span>
                  {canManage && otherPeers.length > 0 && (
                    <button
                      onClick={handleMuteAll}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors bg-white/10 hover:bg-white/15 rounded-lg px-2.5 py-1"
                    >
                      <MicOff className="h-3 w-3" />
                      {isEnglish ? 'Mute All Students' : 'كتم صوت الجميع'}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20">
                  {/* If user is student, render local student tile in the secondary strip */}
                  {!isHost && (
                    <div className="shrink-0">
                      <StreamTile
                        stream={screenStreamRef.current || localStreamRef.current}
                        name={profile?.full_name || 'أنت'}
                        isLocal
                        isHost={false}
                        cameraOn={cameraOn}
                        micOn={microphoneOn}
                        raisedHand={handRaised}
                        isScreenSharing={screenShareOn}
                        isEnglish={isEnglish}
                      />
                    </div>
                  )}

                  {/* Render other students */}
                  {otherPeers
                    .filter((p) => isHost || !p.isHost) // If student, don't duplicate teacher in strip
                    .map((peer) => {
                      const peerStream = remoteStreamsRef.current.get(peer.userId)
                      return (
                        <div key={peer.userId} className="shrink-0">
                          <StreamTile
                            stream={peerStream}
                            name={peer.userName}
                            isLocal={false}
                            isHost={peer.isHost}
                            cameraOn={peer.cameraOn}
                            micOn={peer.micOn}
                            raisedHand={peer.raisedHand}
                            isScreenSharing={peer.isScreenSharing}
                            canManage={canManage}
                            onMuteToggle={() => void handleTeacherMicToggle(peer.userId, peer.micOn)}
                            onCameraToggle={() => void handleTeacherCameraToggle(peer.userId, peer.cameraOn)}
                            onKick={() => void kickStudent(peer.userId)}
                            isEnglish={isEnglish}
                          />
                          {peerStream && <RemoteAudioMount stream={peerStream} />}
                        </div>
                      )
                    })}

                  {otherPeers.length === 0 && isHost && (
                    <div className="flex h-44 w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-xs text-white/50 text-center">
                      {isEnglish ? 'No students have joined yet. Share the invite link.' : 'لم ينضم أي طالب بعد. انسخ الرابط وشاركه مع طلابك.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom Controls Bar ── */}
            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-[#132f3e] p-3 sm:gap-3 rounded-xl mt-1">
              {/* Microphone Toggle */}
              <button
                title={microphoneOn ? (isEnglish ? 'Turn microphone off' : 'كتم المايكروفون') : (isEnglish ? 'Turn microphone on' : 'تشغيل المايكروفون')}
                onClick={() => void toggleMicrophone()}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition-all shadow-md ${microphoneOn ? 'bg-[#35576a] hover:bg-[#436e86]' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {microphoneOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              {/* Camera Toggle */}
              <button
                title={cameraOn ? (isEnglish ? 'Turn camera off' : 'إغلاق الكاميرا') : (isEnglish ? 'Turn camera on' : 'تشغيل الكاميرا')}
                onClick={() => void toggleCamera()}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition-all shadow-md ${cameraOn ? 'bg-[#35576a] hover:bg-[#436e86]' : 'bg-[#26485c] hover:bg-[#325c75]'}`}
              >
                {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-white/60" />}
              </button>

              {/* Screen Share Toggle */}
              <button
                title={screenShareOn ? (isEnglish ? 'Stop sharing screen' : 'إيقاف مشاركة الشاشة') : (isEnglish ? 'Share screen' : 'مشاركة الشاشة')}
                onClick={() => void toggleScreenShare()}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition-all shadow-md ${screenShareOn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#26485c] hover:bg-[#325c75]'}`}
              >
                <MonitorUp className="h-5 w-5" />
              </button>

              {/* Raise Hand Toggle */}
              <button
                title={handRaised ? (isEnglish ? 'Lower hand' : 'إنزال اليد') : (isEnglish ? 'Raise hand' : 'رفع اليد')}
                onClick={toggleHand}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition-all shadow-md ${handRaised ? 'bg-amber-500 text-black font-bold' : 'bg-[#26485c] hover:bg-[#325c75]'}`}
              >
                <Hand className="h-5 w-5" />
              </button>

              {/* Fullscreen Button */}
              <button
                title={isEnglish ? 'Full screen' : 'ملء الشاشة'}
                onClick={() => void document.documentElement.requestFullscreen?.()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#26485c] text-white hover:bg-[#325c75] transition-all shadow-md"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              {/* Host End Meeting Button */}
              {canManage && (
                <button
                  disabled={pendingEnd}
                  onClick={() => void endMeeting()}
                  title={isEnglish ? 'End meeting for everyone' : 'إنهاء الاجتماع للجميع'}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white shadow-md hover:bg-rose-700 disabled:opacity-60 transition-colors"
                >
                  {pendingEnd ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                  {isEnglish ? 'End' : 'إنهاء للجميع'}
                </button>
              )}

              {/* Attendee Leave Button */}
              {!canManage && (
                <button
                  onClick={() => void cleanupAndLeave()}
                  title={isEnglish ? 'Leave meeting' : 'مغادرة الاجتماع'}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white shadow-md hover:bg-rose-700 transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                  {isEnglish ? 'Leave' : 'مغادرة'}
                </button>
              )}
            </div>
          </section>

          {/* ── SIDE DRAWER: Live Chat & Attendees ── */}
          {(chatOpen || participantsOpen) && (
            <aside className="flex max-h-[82vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border bg-card shadow-md">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  {chatOpen ? <MessageCircle className="h-4 w-4 text-[#234a65]" /> : <Users className="h-4 w-4 text-[#234a65]" />}
                  <h2 className="font-bold text-sm">
                    {chatOpen ? (isEnglish ? 'Meeting Chat' : 'محادثة القاعة') : (isEnglish ? 'Active Attendees' : 'المشاركون الحاليون')}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setChatOpen((v) => !v); setParticipantsOpen(false) }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${chatOpen ? 'bg-[#234a65] text-white' : 'hover:bg-muted'}`}
                  >
                    {isEnglish ? 'Chat' : 'المحادثة'}
                  </button>
                  <button
                    onClick={() => { setParticipantsOpen((v) => !v); setChatOpen(false) }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${participantsOpen ? 'bg-[#234a65] text-white' : 'hover:bg-muted'}`}
                  >
                    {isEnglish ? 'Attendees' : 'المشاركون'}
                  </button>
                  <button
                    onClick={() => { setChatOpen(false); setParticipantsOpen(false) }}
                    aria-label={isEnglish ? 'Close' : 'إغلاق'}
                    className="ms-1 rounded-lg p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Attendee Roster View */}
              {participantsOpen && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {isEnglish ? `In room (${activePeers.length || 1})` : `المتواجدون في القاعة (${activePeers.length || 1})`}
                    </p>
                    {canManage && otherPeers.length > 0 && (
                      <button
                        onClick={handleMuteAll}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        {isEnglish ? 'Mute all' : 'كتم الجميع'}
                      </button>
                    )}
                  </div>

                  {/* Current user */}
                  <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-2.5 text-xs">
                    <span className="font-semibold">{profile?.full_name || 'أنت'} (أنت){isHost ? ' • المعلم' : ''}</span>
                    <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">نشط</span>
                  </div>

                  {/* Remote peers */}
                  {otherPeers.map((peer) => (
                    <div key={peer.userId} className="flex items-center justify-between rounded-xl border bg-card p-2.5 text-xs gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{peer.userName}{peer.isHost ? ' • المعلم' : ''}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{peer.micOn ? 'المايك يعمل' : 'المايك مغلق'}</span>
                          <span>•</span>
                          <span>{peer.cameraOn ? 'الكاميرا تعمل' : 'الكاميرا مغلقة'}</span>
                          {peer.raisedHand && <span className="text-amber-500 font-bold">• ✋</span>}
                        </p>
                      </div>

                      {/* Teacher moderation buttons */}
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => void handleTeacherMicToggle(peer.userId, peer.micOn)}
                            className={`rounded-lg p-1.5 transition-colors ${peer.micOn ? 'text-amber-700 hover:bg-amber-100 bg-amber-50' : 'text-emerald-700 hover:bg-emerald-100 bg-emerald-50'}`}
                            title={peer.micOn ? (isEnglish ? 'Mute microphone' : 'كتم المايكروفون') : (isEnglish ? 'Request microphone' : 'طلب فتح المايكروفون')}
                          >
                            {peer.micOn ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => void handleTeacherCameraToggle(peer.userId, peer.cameraOn)}
                            className={`rounded-lg p-1.5 transition-colors ${peer.cameraOn ? 'text-rose-700 hover:bg-rose-100 bg-rose-50' : 'text-blue-700 hover:bg-blue-100 bg-blue-50'}`}
                            title={peer.cameraOn ? (isEnglish ? 'Turn off camera' : 'إغلاق الكاميرا') : (isEnglish ? 'Request camera' : 'طلب فتح الكاميرا')}
                          >
                            {peer.cameraOn ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => void kickStudent(peer.userId)}
                            className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-100 bg-rose-50 transition-colors"
                            title={isEnglish ? 'Remove from room' : 'طرد من القاعة'}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Chat View */}
              {chatOpen && (
                <>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
                    {chat.length === 0 ? (
                      <p className="py-12 text-center text-xs text-muted-foreground">
                        {isEnglish ? 'No messages yet. Send a message to everyone.' : 'لا توجد رسائل بعد. ابدأ بمراسلة الحاضرين.'}
                      </p>
                    ) : (
                      chat.map((item) => (
                        <div
                          key={item.id}
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${item.mine ? 'ms-auto bg-[#234a65] text-white' : 'me-auto bg-muted'}`}
                        >
                          <p className="mb-0.5 text-[10px] font-semibold opacity-75">
                            {item.mine ? (isEnglish ? 'You' : 'أنت') : item.userName}
                          </p>
                          <p className="whitespace-pre-wrap break-words leading-5 text-xs sm:text-sm">{item.message}</p>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={sendChatMessage} className="flex items-center gap-2 border-t p-3 bg-muted/20">
                    <input
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value.slice(0, 1200))}
                      maxLength={1200}
                      placeholder={isEnglish ? 'Type a message...' : 'اكتب رسالة للجميع...'}
                      className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#356079]/40"
                    />
                    <button
                      disabled={!chatDraft.trim()}
                      aria-label={isEnglish ? 'Send message' : 'إرسال الرسالة'}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#234a65] text-white disabled:opacity-40 transition-opacity"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              )}
            </aside>
          )}
        </div>
      )}
    </main>
  )
}
