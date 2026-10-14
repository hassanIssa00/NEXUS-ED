'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export function AiTutorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { profile } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      let subjectContext = 'General';
      if (pathname.includes('/student/assignments')) {
        subjectContext = 'Homework Help';
      } else if (pathname.includes('/student/content')) {
        subjectContext = 'Lesson Review';
      }

      const res = await apiClient.post('/ai/ask', {
        question: userMsg,
        subject: subjectContext,
        history: messages.slice(-10).map((message) => ({
          role: message.role,
          content: message.content.slice(0, 1500),
        })),
      });

      if (res.data?.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.answer }]);
      } else {
        throw new Error('Failed to get answer');
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const apiMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const message = typeof apiMessage === 'string' ? apiMessage : Array.isArray(apiMessage) ? apiMessage.join('، ') : '';
      const content = message || (status === 401
        ? 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم حاول.'
        : status === 403
          ? 'المساعد غير متاح لهذا الحساب حاليًا.'
        : status === 429
          ? 'وصل المساعد إلى حد الطلبات المؤقت. انتظر قليلًا ثم أعد المحاولة.'
          : status === 503
            ? 'خدمة الذكاء الاصطناعي غير متاحة مؤقتًا. حاول بعد قليل.'
            : 'تعذر الوصول إلى المساعد. تحقق من الاتصال وحاول مرة أخرى.');
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-[0_8px_30px_rgb(124,58,237,0.5)] hover:shadow-[0_8px_40px_rgb(124,58,237,0.7)] hover:scale-105 transition-all duration-300 flex items-center justify-center group"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
            <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[340px] sm:w-[400px] bg-white/80 dark:bg-[#1e1e2d]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm shadow-sm">المساعد الذكي NEXUS</h3>
                  <p className="text-[11px] text-violet-100 font-medium">مساعدك الشخصي للنجاح</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-primary-foreground/20 rounded-md transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-primary-foreground/20 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-black/20">
                  {messages.length === 0 && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Bot className="w-10 h-10 text-violet-500" />
                      </div>
                      <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                        مرحباً {profile?.full_name ? profile.full_name.split(' ')[0] : ''}! 
                      </p>
                      <p>أنا مساعدك الذكي NEXUS.<br/>كيف يمكنني مساعدتك اليوم؟</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      dir={msg.role === 'user' ? 'ltr' : 'rtl'}
                    >
                      <div 
                        className={`max-w-[85%] p-3.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-white dark:bg-[#2b2b3d] border border-gray-100 dark:border-white/5 rounded-tl-sm text-gray-800 dark:text-gray-200'
                        }`}
                        dir="rtl"
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-end" dir="ltr">
                      <div className="bg-white dark:bg-[#2b2b3d] border border-gray-100 dark:border-white/5 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white/50 dark:bg-black/20 backdrop-blur-md border-t border-gray-100 dark:border-white/5">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      maxLength={2000}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="اسألني أي سؤال..."
                      className="flex-1 bg-white dark:bg-[#2b2b3d] border border-gray-200 dark:border-white/10 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-inner"
                      dir="rtl"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="rounded-full shrink-0 w-10 h-10 bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-transform active:scale-95"
                      disabled={!inputValue.trim() || isLoading}
                    >
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
