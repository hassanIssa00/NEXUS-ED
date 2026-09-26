'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, Pin, Crown } from 'lucide-react'
import type { CommunityMessage } from '@/lib/nexusDataBridge'

export default function ParentCommunityPage() {
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [parentName, setParentName] = useState('فيصل الغامدي')
  const [parentId, setParentId] = useState('acc_parent_faisal')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    try {
      const { nexusBridge } = await import('@/lib/nexusDataBridge')
      setMessages(nexusBridge.getCommunityMessages())
      try {
        const stored = localStorage.getItem('nexus_user')
        if (stored) {
          const acc = JSON.parse(stored)
          if (acc.name) setParentName(acc.name)
          if (acc.id) setParentId(acc.id)
        }
      } catch {}
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
        senderId: parentId,
        senderName: parentName,
        senderRole: 'parent',
        text: inputText.trim(),
      })
      setInputText('')
      await loadMessages()
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const pinnedMsg = messages.find(m => m.isPinned)

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#b45309] via-[#d97706] to-[#F59E0B] p-8 text-white shadow-[0_20px_60px_rgba(245,158,11,0.3)]">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="text-xs font-bold text-amber-100">ملتقى أولياء الأمور</span>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">مجتمع الأسرة التعليمية 👨👩👧👦</h1>
          <p className="text-amber-100 text-sm font-medium">تواصل مع د. إسماعيل وأولياء أمور الزملاء</p>
          <div className="mt-4">
            <div className="bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl inline-block">
              <p className="text-[10px] text-amber-200 font-medium">إجمالي الرسائل</p>
              <p className="text-lg font-black">{messages.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {pinnedMsg && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Pin className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">رسالة مثبتة من د. إسماعيل عيسى</span>
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{pinnedMsg.text}</p>
        </div>
      )}

      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-[400px] overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : (
            messages.map((msg, i) => {
              const isTeacher = msg.senderRole === 'teacher'
              const isMe = msg.senderId === parentId
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isTeacher ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700'
                  }`}>
                    {isTeacher ? '🎓' : msg.senderName[0]}
                  </div>
                  <div className={`flex-1 max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{msg.senderName}</span>
                      {isTeacher && <Crown className="w-3 h-3 text-amber-500" />}
                      {msg.isAnnouncement && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 text-[9px] font-black">إعلان</span>}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isTeacher ? 'bg-emerald-50 dark:bg-emerald-500/10 text-gray-800 dark:text-gray-200'
                        : isMe ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200'
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
        <div className="border-t border-gray-100 dark:border-white/5 p-4 flex items-center gap-3">
          <input value={inputText} onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="اكتب رسالتك لمجتمع الفصل..."
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          <button onClick={handleSend} disabled={!inputText.trim() || sending}
            className="w-10 h-10 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 shadow-md shadow-amber-500/30">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
