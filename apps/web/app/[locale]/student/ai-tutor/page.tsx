'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Target, AlertTriangle, TrendingUp, Sparkles, Send, User, RotateCcw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import Link from 'next/link'

function ChatMessage({ msg }: { msg: { role: 'user' | 'ai', text: string } }) {
    const isUser = msg.role === 'user'
    return (
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex gap-3 max-w-[85%] ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isUser ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                {isUser ? <User className="w-4 h-4 text-white" /> : <BrainCircuit className="w-4 h-4 text-white" />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 rounded-tr-sm border border-indigo-100 dark:border-indigo-500/20' : 'bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-tl-sm'}`}>
                {msg.text}
            </div>
        </motion.div>
    )
}

export default function AiPersonalTutorPage() {
    const [data, setData] = useState<any>(null)
    const [loadingMap, setLoadingMap] = useState(true)
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([])
    const [input, setInput] = useState('')
    const [loadingChat, setLoadingChat] = useState(false)
    const [chatError, setChatError] = useState('')
    const chatRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        apiClient.get('/ai/weakness-map/me')
            .then(res => { if (res.data?.success) setData(res.data.data) })
            .catch(() => {})
            .finally(() => setLoadingMap(false))
    }, [])

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, [messages, loadingChat])

    const sendMsg = async () => {
        if (!input.trim() || loadingChat) return
        const q = input.trim(); setInput('')
        setMessages(p => [...p, { role: 'user', text: q }])
        setLoadingChat(true)
        setChatError('')
        try {
            const res = await apiClient.post('/ai/ask', { question: q })
            const answer = res.data?.data?.answer
            if (!answer) throw new Error('AI response is empty')
            setMessages(p => [...p, { role: 'ai', text: answer }])
        } catch {
            setChatError('تعذر الحصول على رد من خدمة المساعد الآن.')
        } finally {
            setLoadingChat(false)
        }
    }

    if (loadingMap) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <div className="relative w-24 h-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-10 h-10 text-indigo-500 animate-pulse" />
                </div>
            </div>
            <p className="text-sm font-bold text-gray-500">جاري بناء خريطة ذكائك الاصطناعي...</p>
        </div>
    )

    return (
        <div className="space-y-6 pb-12" dir="rtl">
            {/* HERO */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-900 via-violet-800 to-purple-900 p-8 text-white shadow-2xl">
                <div className="absolute inset-0 pointer-events-none opacity-30">
                    <motion.div animate={{ scale: [1, 1.2, 1], rotate: 360 }} transition={{ duration: 30, repeat: Infinity }}
                        className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/40 rounded-full blur-3xl" />
                    <motion.div animate={{ scale: [1, 1.5, 1], rotate: -360 }} transition={{ duration: 40, repeat: Infinity }}
                        className="absolute -bottom-40 -left-20 w-80 h-80 bg-fuchsia-500/40 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner shadow-white/10">
                        <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">المعلم الذكي التفاعلي</h1>
                        <p className="text-indigo-200 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                            مساعدك الشخصي المدعوم بالذكاء الاصطناعي. يناقش معك الدروس، يحلل نقاط ضعفك، ويبني لك مساراً للنجاح.
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_400px] gap-6">
                {/* CHAT INTERFACE */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm flex flex-col h-[600px] overflow-hidden relative">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 dark:from-indigo-900/10 dark:to-violet-900/10 border-b border-indigo-100 dark:border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">نكسس AI</h3>
                                <p className="text-[10px] text-gray-500 font-medium">خدمة خارجية تعتمد على إعدادات المدرسة</p>
                            </div>
                        </div>
                        <button onClick={() => { setMessages([]); setChatError('') }}
                            className="p-2 bg-white dark:bg-[#12121a] rounded-lg border border-gray-100 dark:border-white/10 text-gray-500 hover:text-indigo-600 transition-colors shadow-sm" title="محادثة جديدة">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-gray-50/30 dark:bg-transparent">
                        <AnimatePresence>
                            {messages.length === 0 && <p className="text-center text-sm text-gray-500">اكتب سؤالك لبدء محادثة جديدة.</p>}
                            {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
                            {loadingChat && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 ml-auto">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                                        <BrainCircuit className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center">
                                        {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {chatError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{chatError}</p>}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white dark:bg-[#1e1e2d] border-t border-gray-100 dark:border-white/5">
                        <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-[#12121a] rounded-2xl border border-gray-200 dark:border-white/10 p-1 focus-within:border-indigo-500/50 transition-colors shadow-inner">
                            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                                placeholder="اسألني عن أي شيء..." rows={1}
                                className="w-full max-h-32 min-h-[44px] bg-transparent text-sm text-gray-900 dark:text-white px-4 py-3 outline-none resize-none placeholder:text-gray-400" />
                            <button onClick={sendMsg} disabled={!input.trim() || loadingChat}
                                className="w-11 h-11 mb-0.5 ml-0.5 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 rounded-xl flex items-center justify-center text-white transition-all shadow-md">
                                <Send className="w-5 h-5 -ml-1 rtl:rotate-180" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* AI ANALYSIS PANEL */}
                <div className="space-y-6">
                    {/* Learning Path */}
                    {data?.learningPath && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                            <h3 className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 text-sm mb-3 relative z-10">
                                <Target className="w-4 h-4 text-indigo-500" /> مسار التعلم الذكي
                            </h3>
                            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200 leading-relaxed relative z-10">"{data.learningPath}"</p>
                        </motion.div>
                    )}

                    {/* Weaknesses */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                        <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm mb-5">
                            <AlertTriangle className="w-4 h-4 text-rose-500" /> خريطة التحسين
                        </h3>
                        {data?.topics?.length > 0 ? (
                            <div className="space-y-4">
                                {data.topics.map((t: any, i: number) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{t.topic}</p>
                                                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{t.description}</p>
                                            </div>
                                            <span className="text-[10px] font-black bg-rose-50 text-rose-600 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-500/20">
                                                فجوة درجات {t.score}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div className="h-full bg-rose-500 rounded-full relative"
                                                initial={{ width: 0 }} animate={{ width: `${t.score}%` }} transition={{ duration: 1 }}>
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-50" />
                                            </motion.div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : data ? (
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                                <p className="text-xs text-gray-500">لا توجد بيانات كافية لعرض نقاط تحسين حتى الآن.</p>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">خريطة التحسين غير متاحة حاليًا.</p>
                        )}
                    </motion.div>

                    {/* Recommendations */}
                    {data?.recommendations?.length > 0 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                            className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm">
                            <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2 text-sm mb-4">
                                <TrendingUp className="w-4 h-4 text-emerald-500" /> التوصيات
                            </h3>
                            <ul className="space-y-3">
                                {data.recommendations.map((rec: string, i: number) => (
                                    <li key={i} className="flex gap-3 items-start bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-black shadow-sm">
                                            {i + 1}
                                        </div>
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{rec}</p>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
