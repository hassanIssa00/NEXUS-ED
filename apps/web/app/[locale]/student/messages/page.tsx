'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, User, GraduationCap, Paperclip,
  CheckCheck, Smile, Phone, Video, Info, Search,
  MessageSquare, Circle, ArrowRight
} from 'lucide-react'

interface Contact {
  id: string
  name: string
  role: string
  subject: string
  avatar: string
  online: boolean
  lastSeen?: string
}

interface ChatMessage {
  id: string | number
  sender: 'student' | 'teacher'
  text: string
  time: string
}

const TEACHER_CONTACTS: Contact[] = [
  {
    id: 'dr-ismail',
    name: 'د. إسماعيل عيسى',
    role: 'رائد الفصل ومعلم المادة',
    subject: 'لغتي العربية',
    avatar: '👨‍🏫',
    online: true,
  },
  {
    id: 't-mohammed',
    name: 'أ. محمد الغامدي',
    role: 'معلم المادة',
    subject: 'الرياضيات',
    avatar: '📐',
    online: true,
  },
  {
    id: 't-abdulrahman',
    name: 'الشيخ عبد الرحمن السعيد',
    role: 'معلم المادة',
    subject: 'القرآن الكريم والتربية الإسلامية',
    avatar: '🕌',
    online: false,
    lastSeen: 'منذ ساعتين',
  },
  {
    id: 't-fahad',
    name: 'أ. فهد الزهراني',
    role: 'معلم المادة',
    subject: 'العلوم',
    avatar: '🔬',
    online: true,
  },
  {
    id: 't-khaled',
    name: 'أ. خالد العتيبي',
    role: 'معلم المادة',
    subject: 'الحاسب الآلي والتقنية',
    avatar: '💻',
    online: false,
    lastSeen: 'أمس 04:15 م',
  },
  {
    id: 't-ahmed',
    name: 'ك. أحمد الشهري',
    role: 'معلم المادة',
    subject: 'التربية الفنية والبدنية',
    avatar: '🎨',
    online: false,
    lastSeen: 'منذ ساعة',
  },
  {
    id: 'admin-office',
    name: 'إدارة شؤون الطلاب',
    role: 'الإدارة المدرسية',
    subject: 'مدارس الإخلاص الأهلية',
    avatar: '🏫',
    online: true,
  },
]

export default function StudentMessagesPage() {
  const [selectedContact, setSelectedContact] = useState<Contact>(TEACHER_CONTACTS[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [chatThreads, setChatThreads] = useState<Record<string, ChatMessage[]>>({})
  const [input, setInput] = useState('')
  const [showCallAlert, setShowCallAlert] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_student_chat_threads')
      if (saved) {
        setChatThreads(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Auto-scroll when messages change
  const currentMessages = chatThreads[selectedContact.id] || []
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, selectedContact.id])

  const handleSend = () => {
    if (!input.trim()) return
    const textToSend = input.trim()
    const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      text: textToSend,
      time: nowTime,
    }

    setChatThreads(prev => {
      const updated = {
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), userMsg],
      }
      try {
        localStorage.setItem('nexus_student_chat_threads', JSON.stringify(updated))
      } catch {}
      return updated
    })

    setInput('')
  }

  const filteredContacts = TEACHER_CONTACTS.filter(c =>
    c.name.includes(searchQuery) || c.subject.includes(searchQuery) || c.role.includes(searchQuery)
  )

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* ── HEADER BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] p-7 text-white shadow-[0_20px_60px_rgba(14,165,233,0.3)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold text-sky-100 mb-2">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              منصة المحادثات والتواصل المدرسي
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">التواصل والرسائل المباشرة 💬</h1>
            <p className="text-xs sm:text-sm text-sky-100 font-medium mt-1">
              محادثات فورية مباشرة وموثقة مع معلمي المواد وإدارة المدرسة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-white/20 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-white/20">
              {TEACHER_CONTACTS.filter(t => t.online).length} معلمون متصلون الآن 🟢
            </span>
          </div>
        </div>
      </motion.div>

      {/* CALL MODAL ALERT */}
      <AnimatePresence>
        {showCallAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100 dark:border-white/10">
              <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-500/20 text-3xl flex items-center justify-center mx-auto">
                {selectedContact.avatar}
              </div>
              <div>
                <h3 className="font-black text-lg text-gray-900 dark:text-white">{selectedContact.name}</h3>
                <p className="text-xs text-gray-500">{selectedContact.subject} • {selectedContact.role}</p>
              </div>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-bold animate-pulse">
                {showCallAlert}
              </p>
              <button
                onClick={() => setShowCallAlert(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 font-black text-xs hover:bg-gray-200 transition-colors"
              >
                إلغاء الطلب
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WHATSAPP-STYLE TWO-COLUMN CONTAINER ── */}
      <div className="bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row h-[680px] overflow-hidden">
        
        {/* ── SIDEBAR: TEACHERS & CONTACTS LIST ── */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-l border-gray-100 dark:border-white/5 flex flex-col bg-gray-50/50 dark:bg-white/[0.01]">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-100 dark:border-white/5">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث عن معلم أو مادة..."
                className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 text-xs font-bold outline-none focus:border-sky-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
            {filteredContacts.map(contact => {
              const isSelected = selectedContact.id === contact.id
              const msgs = chatThreads[contact.id] || []
              const lastMsg = msgs[msgs.length - 1]

              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-4 flex items-center gap-3.5 text-right transition-colors ${
                    isSelected
                      ? 'bg-sky-50/80 dark:bg-sky-500/10 border-r-4 border-sky-600'
                      : 'hover:bg-gray-100/60 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900/40 dark:to-blue-900/40 flex items-center justify-center text-2xl shadow-sm">
                      {contact.avatar}
                    </div>
                    {contact.online ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1e1e2d] absolute -bottom-0.5 -right-0.5" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-[#1e1e2d] absolute -bottom-0.5 -right-0.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">
                        {contact.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[10px] text-gray-400 font-mono">{lastMsg.time}</span>
                      )}
                    </div>
                    <p className="text-xs text-sky-600 dark:text-sky-400 font-bold truncate">
                      {contact.subject}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : <span className="italic text-gray-400">لا توجد رسائل سابقة</span>}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── ACTIVE CHAT AREA ── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1e1e2d]">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900/40 dark:to-blue-900/40 flex items-center justify-center text-2xl shadow-sm">
                  {selectedContact.avatar}
                </div>
                {selectedContact.online && (
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1e1e2d] absolute -bottom-0.5 -right-0.5" />
                )}
              </div>
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                  {selectedContact.name}
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 font-bold">
                    {selectedContact.subject}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {selectedContact.online ? (
                    <span className="text-emerald-600 font-bold">متصل الآن 🟢</span>
                  ) : (
                    <span>آخر ظهور: {selectedContact.lastSeen}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCallAlert(`جاري الاتصال الصوتي بالمعلم ${selectedContact.name}...`)}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-200 transition-colors"
                title="اتصال صوتي"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCallAlert(`جاري طلب بدء محادثة فيديو مع ${selectedContact.name}...`)}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-200 transition-colors"
                title="اتصال فيديو"
              >
                <Video className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/20 dark:bg-black/10">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-500 text-2xl">
                  💬
                </div>
                <h4 className="font-black text-base text-gray-800 dark:text-gray-200">
                  محادثة تعليمية مباشرة مع {selectedContact.name}
                </h4>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                  يمكنك إرسال استفساراتك الأكاديمية أو صور حل الواجبات وسيقوم المعلم بالرد والمتابعة معك مباشرة.
                </p>
              </div>
            ) : (
              currentMessages.map(msg => {
                const isStudent = msg.sender === 'student'
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isStudent ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs flex-shrink-0 text-white font-bold ${
                        isStudent
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
                          : 'bg-gradient-to-br from-sky-500 to-blue-600'
                      }`}
                    >
                      {isStudent ? <User className="w-4 h-4" /> : selectedContact.avatar}
                    </div>

                    <div className={`max-w-[75%] flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-black text-gray-500">
                          {isStudent ? 'أحمد فيصل (أنا)' : selectedContact.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">{msg.time}</span>
                      </div>

                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isStudent
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-tl-sm shadow-sm'
                            : 'bg-white dark:bg-[#252538] text-gray-900 dark:text-gray-100 rounded-tr-sm border border-gray-100 dark:border-white/5 shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {isStudent && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-teal-600 dark:text-teal-400 px-1 font-bold">
                          <CheckCheck className="w-3.5 h-3.5" />
                          تم الإرسال
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
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
                title="إرفاق ملف"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`اكتب رسالتك إلى ${selectedContact.name} (${selectedContact.subject})...`}
                className="flex-1 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-black text-xs shadow-lg shadow-teal-500/20 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                إرسال
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
