'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Sparkles } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

const SUGGESTIONS = [
    'كيف أحل مسألة الحركة المتسارعة؟',
    'اشرح لي المعادلة التربيعية',
    'ساعدني في اللغة العربية',
]

export function AIAssistantFab() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [error, setError] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    const sendMessage = async (text: string) => {
        const question = text.trim()
        if (!question || isTyping) return
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)
        setError('')
        try {
            const response = await apiClient.post<{ success?: boolean; data?: { answer?: string } }>('/ai/ask', { question })
            const answer = response.data?.data?.answer
            if (!answer) throw new Error('AI response is empty')
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: answer }])
        } catch {
            setError('تعذر الحصول على رد من خدمة المساعد الآن.')
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <>
            {/* FAB Button */}
            <motion.button
                onClick={() => setIsOpen(v => !v)}
                className="fixed bottom-6 left-6 z-50 w-14 h-14 nexus-gradient rounded-full shadow-2xl flex items-center justify-center text-white"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={isOpen ? {} : {
                    boxShadow: ['0 0 0 0 rgba(79,70,229,0.4)', '0 0 0 15px rgba(79,70,229,0)', '0 0 0 0 rgba(79,70,229,0)']
                }}
                transition={isOpen ? {} : { duration: 2, repeat: Infinity }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X className="w-6 h-6" />
                        </motion.div>
                    ) : (
                        <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                            <Bot className="w-6 h-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20, originX: 0, originY: 1 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 bg-white rounded-[20px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                        style={{ height: 480 }}
                    >
                        {/* Header */}
                        <div className="nexus-gradient p-4 flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">NEXUS AI ✨</p>
                                <p className="text-white/70 text-xs">مساعدك الذكي الشخصي</p>
                            </div>
                            <Sparkles className="mr-auto h-4 w-4 text-white/80" />
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                            {messages.length === 0 && (
                                <p className="py-4 text-center text-sm text-slate-500">اكتب سؤالك أو اختر سؤالًا مقترحًا.</p>
                            )}
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-white border border-slate-200 text-slate-700 rounded-br-sm shadow-sm'
                                        : 'nexus-gradient text-white rounded-bl-sm shadow-md'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {error && <p role="alert" className="text-sm text-red-700" dir="rtl">{error}</p>}

                            {/* Typing indicator */}
                            <AnimatePresence>
                                {isTyping && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex justify-end"
                                    >
                                        <div className="bg-primary-500 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center shadow-md">
                                            {[0, 1, 2].map(i => (
                                                <motion.span
                                                    key={i}
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                    className="w-2 h-2 bg-white rounded-full block"
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestions */}
                        {messages.length === 0 && (
                            <div className="px-4 py-2 border-t border-slate-100 bg-white">
                                <p className="text-xs text-slate-400 mb-1.5">اقتراحات سريعة:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => void sendMessage(s)}
                                            className="text-xs px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full border border-primary-100 hover:bg-primary-100 transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && void sendMessage(input)}
                                placeholder="اكتب سؤالك هنا..."
                                className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none border-0 placeholder:text-slate-400"
                                dir="rtl"
                            />
                            <button
                                onClick={() => void sendMessage(input)}
                                className="w-9 h-9 nexus-gradient rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                                disabled={!input.trim() || isTyping}
                            >
                                <Send className="w-4 h-4 text-white rotate-180" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
