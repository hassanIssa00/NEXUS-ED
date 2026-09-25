'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Paperclip, Phone, Video, 
  MoreVertical, CheckCheck, Smile, ShieldCheck 
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

const TEACHERS = [
  {
    id: 1,
    name: 'د. إسماعيل عيسى',
    subject: 'معلم الفصل — اللغة العربية والقرآن الكريم',
    avatarColor: 'from-orange-500 to-amber-500',
    online: true,
    unread: 1,
    lastSeen: 'متصل الآن 🟢',
    messages: [
      { id: 1, text: 'السلام عليكم ورحمة الله، أهلاً بك أستاذ فيصل. أود أن أطمئنك بأن ابننا أحمد يبدي تميزاً وتفاعلاً رائعاً اليوم في درس التلاوة والقراءة.', time: '09:00 ص', sender: 'teacher' },
      { id: 2, text: 'وعليكم السلام ورحمة الله دكتور إسماعيل، جزاكم الله خيراً وبارك في جهودكم الكريمة مع الأبناء.', time: '09:15 ص', sender: 'parent' },
      { id: 3, text: 'تم رصد وسام التميز و50 نقطة إضافية لأحمد اليوم لتشجيعه على الاستمرار في القمة. حفظه الله ورعاه.', time: '09:30 ص', sender: 'teacher' }
    ]
  },
  {
    id: 2,
    name: 'أ. أحمد سعيد',
    subject: 'اللغة العربية',
    avatarColor: 'from-emerald-500 to-teal-500',
    online: false,
    unread: 0,
    lastSeen: 'آخر ظهور: منذ ساعة',
    messages: [
      { id: 1, text: 'مرحباً، أرجو التنبيه على الطالب بضرورة إحضار كتاب النصوص غداً.', time: 'أمس', sender: 'teacher' },
      { id: 2, text: 'أهلاً بك، سأحرص على ذلك إن شاء الله.', time: 'أمس', sender: 'parent' }
    ]
  },
  {
    id: 3,
    name: 'أ. خالد الغامدي',
    subject: 'الفيزياء',
    avatarColor: 'from-orange-500 to-rose-500',
    online: true,
    unread: 1,
    lastSeen: 'متصل الآن',
    messages: [
      { id: 1, text: 'تحية طيبة، درجات الاختبار الدوري ممتازة، ولكن يحتاج لمراجعة قوانين نيوتن.', time: '10:00 ص', sender: 'teacher' }
    ]
  },
  {
    id: 4,
    name: 'أ. ياسر الشهراني',
    subject: 'الكيمياء',
    avatarColor: 'from-violet-500 to-fuchsia-500',
    online: false,
    unread: 0,
    lastSeen: 'آخر ظهور: أمس',
    messages: [
      { id: 1, text: 'أرجو مراجعة تقرير المختبر الذي أرسلته اليوم، أداء الطالب مبهر.', time: 'أمس', sender: 'teacher' }
    ]
  },
  {
    id: 5,
    name: 'أ. طارق الزهراني',
    subject: 'اللغة الإنجليزية',
    avatarColor: 'from-amber-500 to-orange-500',
    online: true,
    unread: 0,
    lastSeen: 'متصل الآن',
    messages: [
      { id: 1, text: 'Good morning! The speaking assessment was great.', time: '08:00 ص', sender: 'teacher' },
      { id: 2, text: 'Thank you teacher, appreciate your effort.', time: '08:15 ص', sender: 'parent' }
    ]
  }
];

export default function ParentMessagesPage() {
  const [selectedId, setSelectedId] = useState(1);
  const [inputText, setInputText] = useState('');
  const [chats, setChats] = useState(TEACHERS);

  const selectedTeacher = chats.find(t => t.id === selectedId) || chats[0];

  const handleSend = () => {
    if (!inputText.trim()) return;

    setChats(prev => prev.map(teacher => {
      if (teacher.id === selectedId) {
        return {
          ...teacher,
          messages: [
            ...teacher.messages,
            { id: Date.now(), text: inputText, time: 'الآن', sender: 'parent' }
          ]
        };
      }
      return teacher;
    }));
    setInputText('');
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">التواصل مع المعلمين</h1>
          <p className="text-sm font-medium text-gray-500">منصة تواصل آمنة ومباشرة مع طاقم التدريس الخاص بأبنائك</p>
        </div>
        <Link href="/parent">
          <motion.button whileHover={{ scale: 1.05 }} className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2">
            العودة للرئيسية <ArrowRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>

      <div className="h-[75vh] flex gap-6">
        {/* Sidebar */}
        <div className="w-[380px] bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] flex flex-col shadow-sm overflow-hidden flex-shrink-0">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="ابحث عن معلم أو مادة..." 
                className="w-full bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl py-3.5 pr-11 pl-4 text-sm font-bold focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all text-gray-900 dark:text-white shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chats.map((teacher) => (
              <motion.div 
                key={teacher.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedId(teacher.id);
                  // Mark as read
                  if(teacher.unread > 0) {
                    setChats(prev => prev.map(t => t.id === teacher.id ? {...t, unread: 0} : t));
                  }
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                  selectedId === teacher.id 
                    ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-sm' 
                    : 'hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${teacher.avatarColor} flex items-center justify-center text-white font-black shadow-md text-xl`}>
                    {teacher.name.split(' ')[1]?.[0] || teacher.name[0]}
                  </div>
                  {teacher.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#1e1e2d] rounded-full shadow-sm" />
                  )}
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className={`font-extrabold text-sm truncate ${selectedId === teacher.id ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                      {teacher.name}
                    </h3>
                    <span className={`text-[10px] font-bold ${teacher.unread > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                      {teacher.messages[teacher.messages.length - 1]?.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate font-medium ${teacher.unread > 0 ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                      {teacher.messages[teacher.messages.length - 1]?.text}
                    </p>
                    {teacher.unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        {teacher.unread}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] flex flex-col shadow-sm overflow-hidden relative">
          
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          {/* Chat Header */}
          <div className="h-24 px-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#1e1e2d]/80 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedTeacher.avatarColor} flex items-center justify-center text-white font-black shadow-lg text-xl`}>
                  {selectedTeacher.name.split(' ')[1]?.[0] || selectedTeacher.name[0]}
                </div>
                {selectedTeacher.online && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#1e1e2d] rounded-full shadow-sm" />
                )}
              </div>
              <div>
                <h2 className="font-black text-gray-900 dark:text-white text-lg mb-0.5 flex items-center gap-2">
                  {selectedTeacher.name}
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </h2>
                <p className={`text-xs font-bold ${selectedTeacher.online ? 'text-emerald-500' : 'text-gray-400'}`}>
                  معلم مادة {selectedTeacher.subject} • {selectedTeacher.lastSeen}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-11 h-11 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-white/5">
                <Phone className="w-5 h-5" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-11 h-11 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-white/5">
                <Video className="w-5 h-5" />
              </motion.button>
              <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />
              <button className="w-11 h-11 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center transition-colors text-gray-400">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50 dark:bg-[#151521] relative z-0">
            <div className="text-center pb-6">
              <span className="bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 px-4 py-1.5 rounded-full text-[10px] font-bold text-gray-400 shadow-sm">
                هذه المحادثة مشفرة ومؤمنة بالكامل
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {selectedTeacher.messages.map((msg, idx) => {
                const isMe = msg.sender === 'parent';
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && (
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedTeacher.avatarColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-auto shadow-sm`}>
                          {selectedTeacher.name.split(' ')[1]?.[0]}
                        </div>
                      )}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-5 py-3.5 shadow-sm border ${
                          isMe 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-600 text-white rounded-2xl rounded-br-sm' 
                            : 'bg-white dark:bg-[#1e1e2d] border-gray-100 dark:border-white/5 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm'
                        }`}>
                          <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 mt-2 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] font-bold text-gray-400">{msg.time}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          <div className="p-5 bg-white dark:bg-[#1e1e2d] border-t border-gray-100 dark:border-white/5 relative z-10">
            <div className="flex items-end gap-3 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl p-2.5 shadow-inner">
              <button className="w-11 h-11 rounded-xl hover:bg-white dark:hover:bg-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-gray-600 dark:hover:text-white hover:shadow-sm flex-shrink-0">
                <Smile className="w-6 h-6" />
              </button>
              <button className="w-11 h-11 rounded-xl hover:bg-white dark:hover:bg-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-gray-600 dark:hover:text-white hover:shadow-sm flex-shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="اكتب رسالتك للمعلم هنا..." 
                className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none py-3 px-3 text-sm font-bold focus:outline-none text-gray-900 dark:text-white"
                rows={1}
              />

              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 disabled:from-gray-300 disabled:to-gray-400 disabled:dark:from-white/10 disabled:dark:to-white/5 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-all text-white flex-shrink-0 shadow-md disabled:shadow-none"
              >
                <Send className="w-5 h-5 -mr-1" />
              </motion.button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
