'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Send, Sparkles, User, GraduationCap, Paperclip,
  CheckCheck, Smile, Phone, Video, Info
} from 'lucide-react'

interface Message {
  id: string | number
  sender: 'student' | 'teacher'
  text: string
  time: string
}

export default function StudentMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'teacher',
      text: 'السلام عليكم ورحمة الله يا أحمد. أحسنت اليوم في تسميع سورة الناس وقراءة درس المد الطبيعي! 🌟',
      time: '08:15 ص',
    },
    {
      id: 2,
      sender: 'student',
      text: 'وعليكم السلام ورحمة الله دكتور إسماعيل، شكراً لك يا أستاذي وسأواصل التدريب اليوم في المنزل.',
      time: '08:20 ص',
    },
    {
      id: 3,
      sender: 'teacher',
      text: 'بارك الله فيك وفي والدك الكريم. لا تنسَ حل تمرين كتاب لغتي صفحة 24 وتسليمه عبر بوابة الواجبات.',
      time: '08:30 ص',
    },
  ])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || sending) return
    const userMsg: Message = {
      id: Date.now(),
      sender: 'student',
      text: input.trim(),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    // Doctor Ismail automated smart reply
    setTimeout(() => {
      const replies = [
        'أحسنت يا بني! رائع جداً، سأراجع ما أرسلته وأسجل لك درجات التميز.',
        'ممتاز يا أحمد! استمر في تفوقك ونشاطك الدائم في الصف.',
        'جزاك الله خيراً يا بطل! تم استلام رسالتك وسأوافيك بالتوجيه في الحصة القادمة.',
      ]
      const randomReply = replies[Math.floor(Math.random() * replies.length)]
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'teacher',
          text: randomReply,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setSending(false)
    }, 1200)
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] p-7 text-white shadow-[0_20px_60px_rgba(14,165,233,0.3)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl flex-shrink-0 border border-white/30">
              👨‍🏫
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold text-sky-100 mb-1">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                معلم الفصل المباشر
              </div>
              <h1 className="text-2xl font-black">د. إسماعيل عيسى</h1>
              <p className="text-xs text-sky-100 font-medium">معلم مواد الصف الأول الابتدائي — متصل الآن 🟢</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('تم إرسال طلب اتصال صوتي مع المعلم...')}
              className="p-3 rounded-2xl bg-white/15 backdrop-blur-md hover:bg-white/25 transition-colors"
              title="اتصال صوتي"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('تم فتح نافذة الغرفة الافتراضية المرئية...')}
              className="p-3 rounded-2xl bg-white/15 backdrop-blur-md hover:bg-white/25 transition-colors"
              title="اتصال فيديو"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── CHAT WINDOW CONTAINER ── */}
      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm flex flex-col h-[560px] overflow-hidden">
        {/* Messages Header info */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
            <Info className="w-4 h-4 text-sky-500" />
            محادثة تعليمية مباشرة وموثقة مع معلم الصف
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-black">
            تشفير نكسس الآمن 🔒
          </span>
        </div>

        {/* Message Bubble List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map(msg => {
            const isStudent = msg.sender === 'student'
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm flex-shrink-0 text-white ${
                    isStudent
                      ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
                      : 'bg-gradient-to-br from-sky-500 to-blue-600'
                  }`}
                >
                  {isStudent ? <User className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                </div>

                <div className={`max-w-[78%] flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-black text-gray-500">
                      {isStudent ? 'أحمد فيصل (أنا)' : 'د. إسماعيل عيسى'}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">{msg.time}</span>
                  </div>

                  <div
                    className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                      isStudent
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-tl-sm shadow-md'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100 rounded-tr-sm border border-gray-200/50 dark:border-white/5'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {isStudent && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-teal-600 dark:text-teal-400 px-1 font-bold">
                      <CheckCheck className="w-3.5 h-3.5" />
                      تمت القراءة
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-3"
          >
            <button
              type="button"
              onClick={() => alert('إرفاق ملف واجب أو صورة دفتر...')}
              className="p-3 rounded-2xl bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/15 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب استفسارك أو إجابتك للمعلم د. إسماعيل..."
              className="flex-1 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />

            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-black text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
