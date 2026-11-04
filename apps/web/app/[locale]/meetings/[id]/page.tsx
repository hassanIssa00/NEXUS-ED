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
]

function StreamTile({
  stream,
  name,
  isLocal,
  isHost,
  cameraOn,
  micOn,
  speaking,
  raisedHand,
  isScreenSharing,
  canManage,
  onMute,
  onKick,
  isEnglish,
}: {
  stream?: MediaStream | null
  name: string
  isLocal?: boolean
  isHost?: boolean
  cameraOn?: boolean
  micOn?: boolean
  speaking?: boolean
  raisedHand?: boolean
  isScreenSharing?: boolean
  canManage?: boolean
  onMute?: () => void
  onKick?: () => void
  isEnglish: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return
    if (stream && stream.getVideoTracks().length > 0) {
      videoRef.current.srcObject = stream
    } else {
      videoRef.current.srcObject = null
    }
  }, [stream, cameraOn])

  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('') || 'ن'
  const hasVideo = Boolean(cameraOn && stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'))

  return (
    <article className={`group relative min-h-52 overflow-hidden rounded-2xl border bg-[#112b3a] shadow-md transition-all sm:min-h-64 ${speaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f2633]' : 'border-white/10'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1c3f56] to-[#0c1f2b] text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-bold uppercase shadow-inner">
            {initials}
          </div>
          <span className="text-xs text-white/70">
            {isEnglish ? 'Camera off' : 'الكاميرا مغلقة'}
          </span>
        </div>
      )}

      {/* Floating Badges */}
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isHost && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
              <Shield className="h-3 w-3" />
              {isEnglish ? 'Host' : 'المعلم / المنظم'}
            </span>
          )}
          {raisedHand && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-black shadow animate-pulse">
              ✋ {isEnglish ? 'Hand raised' : 'يد مرفوعة'}
            </span>
          )}
          {isScreenSharing && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
              <MonitorUp className="h-3 w-3" />
              {isEnglish ? 'Screen' : 'مشاركة الشاشة'}
            </span>
          )}
        </div>

        {/* Host controls on student tile */}
        {canManage && !isLocal && (
          <div className="pointer-events-auto opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 bg-black/70 rounded-xl p-1 backdrop-blur-sm shadow">
            {onMute && (
              <button
                onClick={onMute}
                title={isEnglish ? 'Mute microphone' : 'كتم صوت المشارك'}
                className="rounded-lg p-1.5 text-white hover:bg-white/20 transition-colors"
              >
                <MicOff className="h-3.5 w-3.5 text-amber-300" />
              </button>
            )}
            {onKick && (
              <button
                onClick={onKick}
                title={isEnglish ? 'Remove participant' : 'طرد من الاجتماع'}
                className="rounded-lg p-1.5 text-white hover:bg-rose-600 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-rose-300" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-8 text-white">
        <span className="max-w-[75%] truncate text-sm font-semibold">
          {name}{isLocal ? (isEnglish ? ' (You)' : ' (أنت)') : ''}
        </span>
        <span
          className={`rounded-lg p-1.5 ${micOn ? 'bg-emerald-600/80' : 'bg-rose-600/80'}`}
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
      audioRef.current.play().catch(() => undefined)
    }
  }, [stream])
  return <audio ref={audioRef} autoPlay playsInline className="hidden" />
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

  // Cleanly teardown all WebRTC connections and media tracks
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

  // Create an RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = useCallback((remoteUserId: string, isInitiator: boolean) => {
    let pc = peerConnectionsRef.current.get(remoteUserId)
    if (pc && pc.signalingState !== 'closed') return pc

    pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS })
    peerConnectionsRef.current.set(remoteUserId, pc)

    // Add current local tracks
    const currentStream = screenStreamRef.current || localStreamRef.current
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        pc!.addTrack(track, currentStream)
      })
    }

    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track])
      remoteStreamsRef.current.set(remoteUserId, incomingStream)
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
        setStreamVersion((v) => v + 1)
      }
    }

    if (isInitiator) {
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

        // Connect to any new peers whose userId is lower than ours (deterministic handshake to avoid glare)
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

  // Signal polling loop: fetches SDP offers/answers/ICE candidates addressed to me
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

          // Handle special control signals
          if (signal.type === 'kick') {
            cleanupMedia()
            setError(isEnglish ? 'You were removed from this meeting by the teacher.' : 'تم استبعادك من هذا الاجتماع من قِبل المعلم.')
            window.setTimeout(() => router.push('/meetings' as never), 2200)
            return
          }

          if (signal.type === 'mute') {
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = false
              })
            }
            setMicrophoneOn(false)
            setError(isEnglish ? 'The teacher muted your microphone.' : 'قام المعلم بكتم صوتك.')
            continue
          }

          // Handle WebRTC handshake signals
          const pc = getOrCreatePeerConnection(fromUserId, false)
          if (signal.type === 'offer' && signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await apiClient.post(`/meetings/${meeting.id}/signal`, {
              toUserId: fromUserId,
              signal: { type: 'answer', sdp: answer },
            })
          } else if (signal.type === 'answer' && signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          } else if (signal.type === 'ice' && signal.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
            } catch {
              // Ignore late ICE candidates
            }
          }
        }
      } catch {
        // Suppress signal poll network failure
      }
    }, 1500)

    return () => {
      cancelled = true
      window.clearInterval(signalInterval)
    }
  }, [connected, meeting, getOrCreatePeerConnection, cleanupMedia, isEnglish, router])

  // Join meeting handler
  const connectToMeeting = async () => {
    if (!meeting || connecting || connected) return
    setConnecting(true)
    setError('')
    setConnectionLabel(isEnglish ? 'Requesting camera & microphone...' : 'طلب إذن الكاميرا والمايكروفون...')

    try {
      // 1. Request camera and microphone access
      let localStream: MediaStream | null = null
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 20 } },
          })
          setMicrophoneOn(true)
          setCameraOn(true)
        } catch {
          // If video failed (e.g. no camera attached), fallback to audio only
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })
            setMicrophoneOn(true)
            setCameraOn(false)
          } catch {
            // Join as listener without media tracks
            localStream = null
            setMicrophoneOn(false)
            setCameraOn(false)
          }
        }
      }
      localStreamRef.current = localStream

      setConnectionLabel(isEnglish ? 'Entering private classroom...' : 'الدخول لقاعة الاجتماع...')

      // 2. Register join in API
      const { data } = await apiClient.post<{
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
        // Add track to peers
        stream.getAudioTracks().forEach((track) => {
          peerConnectionsRef.current.forEach((pc) => pc.addTrack(track, stream))
        })
        setStreamVersion((v) => v + 1)
        return
      } catch {
        setError(isEnglish ? 'Microphone permission was denied by browser.' : 'تم رفض إذن المايكروفون من قِبل المتصفح.')
        return
      }
    }
    const audioTracks = localStreamRef.current.getAudioTracks()
    if (audioTracks.length === 0) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const track = stream.getAudioTracks()[0]
        localStreamRef.current.addTrack(track)
        peerConnectionsRef.current.forEach((pc) => pc.addTrack(track, localStreamRef.current!))
        setMicrophoneOn(true)
        setStreamVersion((v) => v + 1)
        return
      } catch {
        setError(isEnglish ? 'Could not access microphone.' : 'تعذر الوصول للمايكروفون.')
        return
      }
    }
    const nextState = !microphoneOn
    audioTracks.forEach((t) => { t.enabled = nextState })
    setMicrophoneOn(nextState)
  }

  // Toggle camera
  const toggleCamera = async () => {
    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        setCameraOn(true)
        setMicrophoneOn(true)
        stream.getTracks().forEach((track) => {
          peerConnectionsRef.current.forEach((pc) => pc.addTrack(track, stream))
        })
        setStreamVersion((v) => v + 1)
        return
      } catch {
        setError(isEnglish ? 'Camera permission was denied.' : 'تم رفض إذن الكاميرا من قِبل المتصفح.')
        return
      }
    }
    const videoTracks = localStreamRef.current.getVideoTracks()
    if (videoTracks.length === 0) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } })
        const track = stream.getVideoTracks()[0]
        localStreamRef.current.addTrack(track)
        peerConnectionsRef.current.forEach((pc) => pc.addTrack(track, localStreamRef.current!))
        setCameraOn(true)
        setStreamVersion((v) => v + 1)
        return
      } catch {
        setError(isEnglish ? 'Could not access camera.' : 'تعذر تشغيل الكاميرا.')
        return
      }
    }
    const nextState = !cameraOn
    videoTracks.forEach((t) => { t.enabled = nextState })
    setCameraOn(nextState)
  }

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (screenShareOn) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
      setScreenShareOn(false)
      // Switch senders back to camera track
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders()
        const videoSender = senders.find((s) => s.track?.kind === 'video')
        if (videoSender && cameraTrack) {
          void videoSender.replaceTrack(cameraTrack)
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

      // Replace video sender on all peers with screen track
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders()
        const videoSender = senders.find((s) => s.track?.kind === 'video')
        if (videoSender) {
          void videoSender.replaceTrack(screenTrack)
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
      setError(isEnglish ? 'Could not send message.' : 'تعذر إرسال الرسالة.')
    }
  }

  // Toggle hand raise
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

  // Host: Mute a student
  const muteStudent = async (studentId: string) => {
    if (!meeting) return
    try {
      await apiClient.post(`/meetings/${meeting.id}/participants/${studentId}/mute`)
    } catch {
      setError(isEnglish ? 'Could not mute participant.' : 'تعذر كتم صوت المشارك.')
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
        setStreamVersion((v) => v + 1)
      }
    } catch {
      setError(isEnglish ? 'Could not remove participant.' : 'تعذر استبعاد المشارك.')
    }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError(isEnglish ? 'Could not copy the link.' : 'تعذر نسخ الرابط.')
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

  // List of other active peers (excluding self)
  const otherPeers = activePeers.filter((p) => p.userId !== profile?.id)

  return (
    <main className="mx-auto w-full max-w-[1550px] space-y-4" dir={isEnglish ? 'ltr' : 'rtl'}>
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
                  {isEnglish ? 'End meeting' : 'إنهاء الاجتماع للجميع'}
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

      {/* Global Notification Banner */}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm animate-in fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <button onClick={() => setError('')} aria-label={isEnglish ? 'Dismiss' : 'إغلاق'} className="ms-auto text-rose-600 hover:text-rose-900">
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
                    {isEnglish ? 'Clicking join will prompt for camera and microphone access.' : 'عند الضغط سيطلب المتصفح إذن المايكروفون والكاميرا، وسيتم إدخالك باسمك تلقائياً دون تسجيل دخول خارجي.'}
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
                ? 'Only invited school members can access. The display name is linked to your platform profile with zero third-party accounts required.'
                : 'الدخول للحساب المدرسي المدعو فقط. الاسم يظهر مباشرة من حسابك في المنصة بدون الحاجة لأي حساب جيميل أو خارجي.'}
            </div>
          </div>
        </section>
      ) : (
        /* ── CONNECTED: Native WebRTC Video Conferencing Room ── */
        <div className={`grid gap-4 ${chatOpen || participantsOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
          <section className="flex flex-col overflow-hidden rounded-2xl border bg-[#0f2633] shadow-lg">
            {/* Main Video Tiles Grid */}
            <div className="grid min-h-[55vh] flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:min-h-[70vh] xl:grid-cols-3">
              {/* Local User Tile */}
              <StreamTile
                stream={screenStreamRef.current || localStreamRef.current}
                name={profile?.full_name || (isEnglish ? 'You' : 'أنت')}
                isLocal
                isHost={isHost}
                cameraOn={cameraOn}
                micOn={microphoneOn}
                raisedHand={handRaised}
                isScreenSharing={screenShareOn}
                isEnglish={isEnglish}
              />

              {/* Remote Peer Tiles */}
              {otherPeers.map((peer) => {
                const remoteStream = remoteStreamsRef.current.get(peer.userId)
                return (
                  <div key={peer.userId}>
                    <StreamTile
                      stream={remoteStream}
                      name={peer.userName}
                      isLocal={false}
                      isHost={peer.isHost}
                      cameraOn={peer.cameraOn}
                      micOn={peer.micOn}
                      raisedHand={peer.raisedHand}
                      isScreenSharing={peer.isScreenSharing}
                      canManage={canManage}
                      onMute={() => void muteStudent(peer.userId)}
                      onKick={() => void kickStudent(peer.userId)}
                      isEnglish={isEnglish}
                    />
                    {remoteStream && <RemoteAudioMount stream={remoteStream} />}
                  </div>
                )
              })}

              {otherPeers.length === 0 && (
                <div className="col-span-full flex min-h-64 flex-col items-center justify-center gap-2 text-sm text-white/70">
                  <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                  <p>{isEnglish ? 'Waiting for other participants to enter the room...' : 'في انتظار انضمام المشاركين الآخرين للقاعة...'}</p>
                  <p className="text-xs text-white/40">{isEnglish ? 'You can share the meeting link with invited students.' : 'يمكنك نسخ رابط الاجتماع ومشاركته مع الطلاب المدعوين.'}</p>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-[#132f3e] p-3 sm:gap-3">
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
            <aside className="flex max-h-[78vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border bg-card shadow-md">
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
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {isEnglish ? `In room (${activePeers.length || 1})` : `المتواجدون في القاعة (${activePeers.length || 1})`}
                  </p>
                  {/* Current user */}
                  <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-2.5 text-xs">
                    <span className="font-semibold">{profile?.full_name || 'أنت'} (أنت){isHost ? ' • المعلم' : ''}</span>
                    <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">نشط</span>
                  </div>

                  {/* Remote peers */}
                  {otherPeers.map((peer) => (
                    <div key={peer.userId} className="flex items-center justify-between rounded-xl border bg-card p-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{peer.userName}{peer.isHost ? ' • المنظم' : ''}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {peer.micOn ? 'المايكروفون يعمل' : 'المايكروفون مغلق'}{peer.raisedHand ? ' • ✋ يرفع يده' : ''}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => void muteStudent(peer.userId)}
                            className="rounded-lg p-1 text-amber-700 hover:bg-amber-50"
                            title={isEnglish ? 'Mute' : 'كتم الصوت'}
                          >
                            <MicOff className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void kickStudent(peer.userId)}
                            className="rounded-lg p-1 text-rose-700 hover:bg-rose-50"
                            title={isEnglish ? 'Remove' : 'طرد'}
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
