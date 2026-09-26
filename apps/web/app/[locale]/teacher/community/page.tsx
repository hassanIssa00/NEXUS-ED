'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, Pin, Crown, CheckSquare, Square } from 'lucide-react'
import type { CommunityMessage } from '@/lib/nexusDataBridge'

export default function TeacherCommunityPage() {
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      setMessages(nexusBridge.getCommunityMessages())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadMessages()
    window.addEventListener('nexus:data-changed', loadMessages)
    return () => window.removeEventListener('nexus:data-changed', loadMessages)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputText.trim() || sending) return
    setSending(true)
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      nexusBridge.sendCommunityMessage({
        senderId: 'acc_teacher_ismail',
        senderName: 'د. إسماعيل عيسى',
        senderRole: 'teacher',
        text: inputText.trim(),
        isAnnouncement,
      })
      setInputText('')
      setIsAnnouncement(false)
      await loadMessages()
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const pinnedMsg = messages.find(m => m.isPinned)

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3B82F6] p-8 text-white shadow-[0_20px_60px_rgba(59,130,246,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-blue-100">ملتقى الأسرة التعليمية</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">مجتمع أولياء الأمور 👨‍👩‍👧‍👦</h1>
          <p className="text-blue-100 text-sm font-medium">التواصل والإعلانات لأولياء أمور فصل د. إسماعيل عيسى</p>
          <div className="mt-4">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl inline-block">
              <p className="text-[10px] text-blue-200">إجمالي الرسائل</p>
              <p className="text-lg font-black">{messages.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {pinnedMsg && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">رسالة مثبتة</span>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">{pinnedMsg.text}</p>
        </div>
      )}

      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-[420px] overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          ) : (
            messages.map((msg, i) => {
              const isTeacher = msg.senderRole === 'teacher'
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex gap-3 ${!isTeacher ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isTeacher ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700'
                  }`}>
                    {isTeacher ? '🎓' : msg.senderName[0]}
                  </div>
                  <div className={`flex-1 max-w-[75%] flex flex-col gap-1 ${!isTeacher ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{msg.senderName}</span>
                      {isTeacher && <Crown className="w-3 h-3 text-blue-500" />}
                      {msg.isAnnouncement && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 text-[9px] font-black">إعلان رسمي</span>}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isTeacher ? 'bg-blue-50 dark:bg-blue-500/10 text-gray-800 dark:text-gray-200' : 'bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200'
                    }`}>{msg.text}</div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.createdAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </motion.div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-gray-100 dark:border-white/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsAnnouncement(!isAnnouncement)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isAnnouncement ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700' : 'bg-gray-100 dark:bg-white/5 text-gray-500'
              }`}>
              {isAnnouncement ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              إعلان رسمي
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isAnnouncement ? 'اكتب إعلانك الرسمي هنا...' : 'اكتب رسالتك للمجتمع...'}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            <button onClick={handleSend} disabled={!inputText.trim() || sending}
              className="w-10 h-10 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
