'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Sparkles, Loader2, UploadCloud, FileJson, Layers, CheckCircle2, BookOpen, Presentation, Check, Info, ImageIcon, Download, ChevronRight } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

export default function ContentGeneratorPage() {
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [imageLoading, setImageLoading] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('summary')
    const [error, setError] = useState('')

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setLoading(true)
        try {
            const res = await apiClient.post('/upload/pdf-to-text', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            if (res.data?.success) setText(res.data.text)
        } catch {
            alert('تعذر قراءة ملف الـ PDF. يرجى المحاولة مرة أخرى.')
        } finally { setLoading(false) }
    }

    const handleGenerateImage = async () => {
        if (!result?.summary) return
        setImageLoading(true)
        setImageUrl(null)
        try {
            const res = await apiClient.post('/ai/generate-image', { prompt: result.summary })
            if (res.data?.success) setImageUrl(res.data.data.url)
        } catch (error: any) {
            alert(error?.response?.data?.message || 'تعذر توليد الصورة. تأكد من إعدادات مزود الصور.')
        } finally { setImageLoading(false) }
    }

    const handleGenerate = async () => {
        if (!text.trim()) return
        setLoading(true)
        setResult(null)
        setError('')
        try {
            const res = await apiClient.post('/ai/process-document', { text })
            if (res.data?.success) setResult(res.data.data)
            else setError('لم يرجع الذكاء الاصطناعي محتوى صالحًا.')
        } catch (error: any) {
            setError(error?.response?.data?.message || 'تعذر إنشاء المحتوى بالذكاء الاصطناعي.')
        } finally { setLoading(false) }
    }

    const handleSaveTemplate = async () => {
        if (!result) return
        setLoading(true)
        try {
            const res = await apiClient.post('/teacher/ai-generator/templates', { title: 'درس مولد بالذكاء الاصطناعي', content: result, type: 'LESSON_PLAN' })
            if (res.data?.success) alert('تم حفظ القالب بنجاح!')
        } catch {
            alert('حدث خطأ أثناء الحفظ')
        } finally { setLoading(false) }
    }

    const tabs = [
        { id: 'summary', label: 'الملخص والمفاهيم' },
        { id: 'quiz', label: 'الاختبار الذكي' },
        { id: 'flashcards', label: 'بطاقات الاستذكار' },
        { id: 'homework', label: 'الواجبات' },
        { id: 'image', label: 'الرسومات' }
    ]

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12" dir="rtl">
            {/* HERO */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-pink-600 p-8 md:p-10 text-white shadow-[0_20px_50px_rgba(192,38,211,0.25)]">
                <div className="absolute inset-0 pointer-events-none opacity-40">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                        className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-300/30 rounded-full blur-3xl" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                        className="absolute -bottom-40 -left-20 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                        <FileJson className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">محول المحتوى التفاعلي (AI)</h1>
                        <p className="text-fuchsia-100 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                            ألصق محتوى الدرس أو الملزمة وسيقوم الذكاء الاصطناعي بإنشاء ملخصات، بطاقات استذكار، واختبارات تفاعلية تلقائياً بضغطة زر.
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
                {/* INPUT SECTION */}
                <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm flex flex-col h-fit overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                        <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-500" /> المحتوى الأصلي
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">أدخل النص أو ارفع ملف PDF للتحليل</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-6 text-center hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer block group">
                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-6 h-6 text-indigo-500" />
                            </div>
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">رفع ملف PDF</p>
                            <p className="text-[10px] text-gray-400 mt-1">سيتم استخراج النص تلقائياً</p>
                        </label>
                        
                        <textarea 
                            placeholder="ألصق محتوى الدرس هنا..." 
                            className="w-full min-h-[250px] bg-gray-50 dark:bg-[#12121a] border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-y placeholder:text-gray-400"
                            value={text} onChange={(e) => setText(e.target.value)}
                        />

                        <button 
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-fuchsia-500/30 transition-all disabled:opacity-50"
                            onClick={handleGenerate} disabled={!text.trim() || loading}
                        >
                            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري التحليل...</> : <><Sparkles className="w-5 h-5" /> توليد المحتوى الآن</>}
                        </button>
                        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
                    </div>
                </div>

                {/* OUTPUT SECTION */}
                <div className="bg-white dark:bg-[#1e1e2d] border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm flex flex-col min-h-[600px] overflow-hidden">
                    {!result && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                                <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا يوجد محتوى مولد بعد</h3>
                            <p className="text-sm text-gray-500 max-w-sm">
                                أدخل المحتوى في القسم الجانبي واضغط على "توليد المحتوى" لتبدأ سحر الذكاء الاصطناعي.
                            </p>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="relative w-24 h-24 mb-6">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    className="absolute inset-0 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-fuchsia-500 animate-pulse" />
                                </div>
                            </div>
                            <p className="font-bold text-lg text-fuchsia-600 dark:text-fuchsia-400 animate-pulse">
                                العقل الذكي يقوم بصياغة المحتوى...
                            </p>
                        </div>
                    )}

                    {result && !loading && (
                        <>
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] px-2 py-2 overflow-x-auto hide-scrollbar">
                                <div className="flex gap-2 min-w-max">
                                    {tabs.map(t => (
                                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleSaveTemplate} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors shrink-0 mr-4">
                                    <CheckCircle2 className="w-4 h-4" /> حفظ القالب
                                </button>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'summary' && (
                                        <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                            <div>
                                                <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                                    <BookOpen className="w-5 h-5 text-fuchsia-500" /> الملخص الذكي
                                                </h3>
                                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-[#12121a] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                                                    {result.summary}
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                                    <Presentation className="w-5 h-5 text-indigo-500" /> المفاهيم الرئيسية
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.keyConcepts.map((concept: string, idx: number) => (
                                                        <span key={idx} className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20">
                                                            {concept}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'quiz' && (
                                        <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                            {result.quiz.map((q: any, idx: number) => (
                                                <div key={idx} className="bg-gray-50 dark:bg-[#12121a] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-base mb-4 flex gap-2">
                                                        <span className="text-fuchsia-500">{idx + 1}.</span> {q.question}
                                                    </h4>
                                                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                                        {q.options.map((opt: string, optIdx: number) => (
                                                            <div key={optIdx} className={`p-3.5 rounded-xl border-2 text-sm font-medium flex items-center justify-between ${optIdx === q.correctAnswer ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-[#1e1e2d] border-transparent text-gray-700 dark:text-gray-300'}`}>
                                                                {opt}
                                                                {optIdx === q.correctAnswer && <Check className="w-4 h-4 text-emerald-500" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 p-3 rounded-xl text-xs font-medium flex gap-2 items-start">
                                                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                        <p className="leading-relaxed">{q.explanation}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}

                                    {activeTab === 'flashcards' && (
                                        <motion.div key="flashcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid sm:grid-cols-2 gap-4">
                                            {result.flashcards.map((card: any, idx: number) => (
                                                <div key={idx} className="group perspective-1000 h-[200px]">
                                                    <div className="relative w-full h-full transition-all duration-700 transform-style-3d group-hover:rotate-y-180">
                                                        {/* Front */}
                                                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-50 to-white dark:from-[#1e1e2d] dark:to-[#12121a] border border-indigo-100 dark:border-white/10 rounded-2xl shadow-sm flex flex-col justify-center items-center p-6 text-center">
                                                            <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 mb-3 uppercase tracking-widest bg-indigo-100/50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">المصطلح</span>
                                                            <h4 className="font-black text-xl text-gray-900 dark:text-white">{card.front}</h4>
                                                        </div>
                                                        {/* Back */}
                                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-fuchsia-600 to-violet-600 rounded-2xl shadow-xl flex flex-col justify-center items-center p-6 text-center text-white">
                                                            <span className="text-[10px] font-black text-fuchsia-200 mb-3 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">التعريف</span>
                                                            <p className="text-sm font-bold leading-relaxed">{card.back}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}

                                    {activeTab === 'homework' && (
                                        <motion.div key="homework" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                            {result.homework.map((hw: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[#12121a] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <p className="font-bold text-gray-700 dark:text-gray-300 leading-relaxed text-sm pt-1.5">{hw}</p>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}

                                    {activeTab === 'image' && (
                                        <motion.div key="image" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#12121a] rounded-2xl border border-gray-100 dark:border-white/5 text-center min-h-[400px]">
                                            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                                                <ImageIcon className="w-10 h-10 text-indigo-500" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">توليد رسومات للدرس</h3>
                                            <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                                                سيبتكر الذكاء الاصطناعي صورة إبداعية جذابة تعبر عن مفاهيم الدرس لتستخدمها في العرض التقديمي.
                                            </p>
                                            
                                            <button onClick={handleGenerateImage} disabled={imageLoading}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30">
                                                {imageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                                ابتكر الصورة الآن
                                            </button>

                                            {imageUrl && (
                                                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="mt-10 w-full max-w-md mx-auto">
                                                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border-[6px] border-white dark:border-[#1e1e2d]">
                                                        <img src={imageUrl} alt="AI Generated" className="w-full h-auto" />
                                                    </div>
                                                    <button onClick={() => window.open(imageUrl, '_blank')}
                                                        className="mt-4 flex items-center justify-center gap-2 w-full bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <Download className="w-4 h-4" /> تحميل الصورة بدقة عالية
                                                    </button>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
