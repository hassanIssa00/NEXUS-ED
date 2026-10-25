'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { useLocale } from 'next-intl'
import { BrainCircuit, Send, X, Sparkles } from 'lucide-react'

export function AiTutorWidget() {
  const isEnglish = useLocale() === 'en'
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim(); setInput('')
    setMessages(p => [...p, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await apiClient.post('/ai/ask', { question: q })
      setMessages(p => [...p, { role: 'ai', text: res.data?.data?.answer || (isEnglish ? 'I could not answer that.' : 'لم أتمكن من الإجابة.') }])
    } catch { setMessages(p => [...p, { role: 'ai', text: isEnglish ? 'Something went wrong. Please try again.' : 'حدث خطأ. حاول مجدداً.' }]) }
    finally { setLoading(false) }
  }

  return (
    <>
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(p => !p)}
        className="fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-[0_0_30px_rgba(35,74,101,0.5)] flex items-center justify-center border-4 border-white dark:border-[#12121a]"
        aria-label={isEnglish ? 'AI Tutor' : 'المعلم الذكي'}>
        <BrainCircuit className="w-7 h-7" />
        <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-400 border-2 border-white dark:border-[#12121a] rounded-full animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            dir={isEnglish ? 'ltr' : 'rtl'} className="fixed bottom-28 left-6 z-50 w-80 sm:w-96 bg-white/95 dark:bg-[#1e1e2d]/95 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col"
            style={{ height: 480 }}>
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-extrabold text-sm">{isEnglish ? 'AI Tutor' : 'المعلم الذكي AI'}</p>
                  <p className="text-violet-200 text-[10px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> {isEnglish ? 'Online and ready' : 'متصل ومستعد'}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#12121a]/50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                    <Sparkles className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{isEnglish ? 'How can I help?' : 'كيف يمكنني مساعدتك؟'}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{isEnglish ? 'Ask me about a lesson or topic, and I’ll explain it as clearly as I can.' : 'اسألني عن أي درس أو مفهوم وسأشرحه لك بأبسط طريقة ممكنة.'}</p>
                  <div className="mt-4 flex flex-col gap-2 w-full">
                    {(isEnglish ? ['Explain percentages', 'What is the solar system?', 'How do I solve equations?'] : ['اشرح لي النسب المئوية', 'ما هو النظام الشمسي؟', 'كيف أحل المعادلات؟']).map(q => (
                      <button key={q} onClick={() => setInput(q)} className="text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-3 py-2 rounded-xl font-medium hover:bg-violet-100 transition-colors text-right">
                        {q} {isEnglish ? '→' : '←'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`text-sm px-4 py-3 shadow-sm leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-sm' : 'bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm'}`}>
                    {m.text}
                  </p>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                    {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-white dark:bg-[#1e1e2d] border-t border-gray-100 dark:border-white/5">
              <div className="relative flex items-center">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder={isEnglish ? 'Type your question…' : 'اكتب سؤالك هنا...'} className="w-full text-sm bg-gray-100 dark:bg-white/5 rounded-full pl-12 pr-4 py-3.5 outline-none border border-transparent focus:border-violet-500/50 transition-colors placeholder:text-gray-400" />
                <button onClick={send} disabled={!input.trim() || loading} className="absolute left-1.5 w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-full flex items-center justify-center text-white transition-colors shadow-md">
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
