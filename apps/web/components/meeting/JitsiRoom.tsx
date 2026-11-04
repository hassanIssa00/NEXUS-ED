'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const JitsiMeeting = dynamic(
  () => import('@jitsi/react-sdk').then((mod) => mod.JitsiMeeting),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-[#0f2633] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold">جارٍ تجهيز قاعة اجتماعات نكسس...</p>
      </div>
    ),
  }
)

interface JitsiRoomProps {
  roomName: string
  displayName: string
  domain?: string
  height?: string
  onLeft?: () => void
  onReady?: () => void
}

export function JitsiRoom({
  roomName,
  displayName,
  domain = 'meet.jit.si',
  height = '600px',
  onLeft,
  onReady,
}: JitsiRoomProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f2633] text-white"
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        <span className="text-sm">جارٍ تحميل القاعة...</span>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-xl" style={{ height }}>
      <JitsiMeeting
        domain={domain}
        roomName={roomName}
        configOverwrite={{
          prejoinConfig: {
            enabled: false,
          },
          prejoinPageEnabled: false,
          skipPrejoin: true,
          requireDisplayName: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false,
          defaultLanguage: 'ar',
          disableDeepLinking: true,
          toolbarButtons: [
            'camera',
            'chat',
            'desktop',
            'fullscreen',
            'hangup',
            'microphone',
            'noisesuppression',
            'participants-pane',
            'profile',
            'raisehand',
            'select-background',
            'settings',
            'tileview',
            'toggle-camera',
            'videoquality',
            'whiteboard',
          ],
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
        }}
        userInfo={{
          displayName: displayName || 'عضو المدرسة',
          email: '',
        }}
        getIFrameRef={(node) => {
          if (node) {
            node.style.height = height
            node.style.width = '100%'
            node.style.border = 'none'
            node.setAttribute('allow', 'camera; microphone; display-capture; autoplay; clipboard-write; hid')
          }
        }}
        onApiReady={(externalApi) => {
          onReady?.()
          externalApi.addListener('videoConferenceLeft', () => {
            onLeft?.()
          })
          externalApi.addListener('readyToClose', () => {
            onLeft?.()
          })
        }}
      />
    </div>
  )
}
