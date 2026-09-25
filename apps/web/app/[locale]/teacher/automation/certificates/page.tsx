'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Award, ArrowLeft, Printer, Download, CheckCircle2, UserCheck, Star, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

const classes = [
    { id: 'dr-ismail-1', name: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى' },
]

const templates = [
    { id: 'classic', name: 'الكلاسيكي الذهبي', colors: 'from-amber-600 to-yellow-500' },
    { id: 'modern', name: 'العصري الأزرق', colors: 'from-blue-600 to-indigo-600' },
    { id: 'creative', name: 'المبتكر الأخضر', colors: 'from-emerald-500 to-teal-500' },
]

function getTemplateAccentColors(gradient: string) {
    const colorStops = gradient.split(' ')
    const start = colorStops.find(stop => stop.startsWith('from-'))?.replace('from-', '') ?? 'amber-600'
    const end = colorStops.find(stop => stop.startsWith('to-'))?.replace('to-', '') ?? start

    return { start, end }
}

export default function CertificatesAutomation() {
    const [selectedClass, setSelectedClass] = useState<string>('dr-ismail-1')
    const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[number]>(templates[0]!)
    const [studentList, setStudentList] = useState<any[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [issuedAlert, setIssuedAlert] = useState<string | null>(null)
    const templateAccentColors = getTemplateAccentColors(selectedTemplate.colors)

    useEffect(() => {
        const load = async () => {
            try {
                const { nexusBridge } = await import('@/lib/nexusDataBridge')
                const students = nexusBridge.getStudents()
                setStudentList(students.map((s, idx) => ({
                    id: s.id,
                    name: s.fullName,
                    score: s.averageGrade,
                    isSelected: idx < 3,
                })))
            } catch (e) {
                console.error('load students for certs error:', e)
            }
        }
        load()
    }, [])

    const toggleStudent = (id: string | number) => {
        setStudentList(studentList.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s))
    }

    const selectAll = () => {
        setStudentList(studentList.map(s => ({ ...s, isSelected: true })))
    }

    const deselectAll = () => {
        setStudentList(studentList.map(s => ({ ...s, isSelected: false })))
    }

    const selectedCount = studentList.filter(s => s.isSelected).length

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const { nexusBridge } = await import('@/lib/nexusDataBridge')
            const selectedStudents = studentList.filter(s => s.isSelected)
            selectedStudents.forEach(st => {
                nexusBridge.issueCertificate({
                    studentId: String(st.id),
                    studentName: st.name,
                    programTitle: 'التميز الأكاديمي والانضباط الصفي',
                    achievement: 'التفوق الاستثنائي في تطبيقات اللغة العربية والقرآن الكريم والحساب الذهني',
                    score: st.score || 98,
                    completionDate: new Date().toISOString().split('T')[0],
                    doctorName: 'د. إسماعيل عيسى',
                    doctorTitle: 'المشرف الأكاديمي ومعلم الفصل',
                    badge: 'وسام الشرف والامتياز',
                })
            })
            setIssuedAlert(`تم إصدار ${selectedStudents.length} شهادات معتمدة برقم تسلسلي وباركود توثيق بنجاح!`)
            setTimeout(() => setIssuedAlert(null), 5000)
            window.print()
        } catch (e) {
            console.error('issue cert error:', e)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/teacher/automation">
                    <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-muted border-border">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">شهادات التقدير التلقائية</h1>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 mr-14">توليد وطباعة شهادات تقدير لمجموعة طلاب بضغطة زر واحدة.</p>
                </div>
            </div>

            {/* Selection Controls */}
            <Card className="border-border shadow-sm bg-card">
                <CardContent className="p-6">
                    <div className="space-y-2 max-w-md">
                        <label className="text-sm font-semibold text-foreground">الفصل الدراسي</label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-10 rounded-md mt-1 border-border focus:ring-amber-500">
                                <SelectValue placeholder="اختر الفصل..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedClass && (
                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Left Column: Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-border shadow-sm bg-card">
                            <CardContent className="p-5">
                                <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-foreground">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    تصميم الشهادة
                               </h3>
                                <div className="space-y-3">
                                    {templates.map(tpl => (
                                        <div 
                                            key={tpl.id}
                                            onClick={() => setSelectedTemplate(tpl)}
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedTemplate.id === tpl.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-transparent bg-muted/50 hover:border-border hover:bg-muted'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${tpl.colors} flex-shrink-0 shadow-sm border border-background/20`}></div>
                                            <span className="font-semibold text-sm text-foreground flex-1">{tpl.name}</span>
                                            {selectedTemplate.id === tpl.id && <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border shadow-sm bg-card flex flex-col h-[360px]">
                            <CardContent className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                                    <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                                        <UserCheck className="w-4 h-4 text-muted-foreground" />
                                        اختيار الطلاب ({selectedCount})
                                    </h3>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={selectAll} className="font-semibold text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 py-1.5 rounded transition-colors">تحديد الكل</button>
                                        <button onClick={deselectAll} className="font-semibold text-muted-foreground hover:bg-muted px-2 py-1.5 rounded transition-colors">إلغاء الكل</button>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
                                    {studentList.map(student => (
                                        <div 
                                            key={student.id}
                                            onClick={() => toggleStudent(student.id)}
                                            className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                                        >
                                            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center shrink-0 ${student.isSelected ? 'bg-amber-500 border-amber-500' : 'border-muted-foreground/40'}`}>
                                                {student.isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="font-medium text-sm text-foreground truncate">{student.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Preview & Print */}
                    <div className="lg:col-span-3">
                        <Card className="border-border shadow-md bg-muted/30 overflow-hidden sticky top-6 flex flex-col h-full min-h-[500px]">
                            <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center bg-background gap-4">
                                <h3 className="font-bold flex items-center gap-2 text-sm text-foreground">
                                    معاينة الطباعة <Badge variant="secondary" className="mr-1">{selectedCount} شهادات</Badge>
                                </h3>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="font-semibold hover:bg-muted border-border h-9"
                                        disabled={selectedCount === 0}
                                    >
                                        <Download className="w-4 h-4 ml-1.5" /> PDF
                                    </Button>
                                    <Button 
                                        size="sm"
                                        onClick={handleGenerate}
                                        disabled={selectedCount === 0 || isGenerating}
                                        className="font-semibold bg-amber-500 hover:bg-amber-600 text-white h-9 shadow-sm"
                                    >
                                        {isGenerating ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Printer className="w-4 h-4 ml-1.5" /> استخراج وطباعة
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            
                            <CardContent className="p-6 md:p-8 flex justify-center items-center flex-1 bg-muted/20">
                                {selectedCount > 0 ? (
                                    <motion.div 
                                        key={selectedTemplate.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full max-w-2xl bg-white aspect-[1.414/1] shadow-xl relative border border-gray-200 flex flex-col items-center justify-center p-8 sm:p-12 overflow-hidden mx-auto"
                                    >
                                        {/* Certificate Design Details */}
                                        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${selectedTemplate.colors}`}></div>
                                        <div className={`absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r ${selectedTemplate.colors}`}></div>
                                        <div className={`absolute top-4 left-4 border-t-8 border-l-8 w-12 h-12 border-t-${templateAccentColors.start} border-l-${templateAccentColors.start} opacity-80`}></div>
                                        <div className={`absolute bottom-4 right-4 border-b-8 border-r-8 w-12 h-12 border-b-${templateAccentColors.end} border-r-${templateAccentColors.end} opacity-80`}></div>
                                        
                                        <Award className={`w-16 h-16 md:w-20 md:h-20 mb-6 text-${templateAccentColors.start} opacity-10 absolute top-8 right-8`} />
                                        
                                        <div className="text-center z-10 w-full space-y-6 md:space-y-8">
                                            <div>
                                                <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-wide mb-2">شـهـادة شـكـر وتـقـديـر</h1>
                                                <div className={`h-1 w-24 bg-gradient-to-r ${selectedTemplate.colors} mx-auto mt-3 opacity-80`}></div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <p className="text-lg md:text-xl text-gray-600 font-medium">يُسعدنا أن نتقدم بخالص الشكر والتقدير للطالب المتميز</p>
                                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 pb-2 border-b border-dashed border-gray-300 inline-block px-8">
                                                    {studentList.find(s => s.isSelected)?.name || 'اسم الطالب'}
                                                </h2>
                                                <p className="text-base md:text-lg text-gray-600 font-medium max-w-sm md:max-w-md mx-auto leading-relaxed px-4">
                                                    وذلك لتميزه الدراسي وتفوقه الملحوظ خلال الفصل الدراسي الحالي، متمنين له دوام التوفيق والنجاح.
                                                </p>
                                            </div>

                                            <div className="flex justify-between items-end w-full px-4 sm:px-12 pt-8 md:pt-12">
                                                <div className="text-center">
                                                    <p className="text-gray-500 text-xs md:text-sm font-bold mb-1">التاريخ</p>
                                                    <p className="font-bold text-gray-800 text-sm">{new Date().toLocaleDateString('ar-SA')}</p>
                                                </div>
                                                <div className="text-center relative">
                                                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-amber-500/20 flex flex-col items-center justify-center -rotate-12 absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 opacity-20">
                                                        <Star className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
                                                        <span className="font-black text-[10px] md:text-xs mt-1">NEXUS EDU</span>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-gray-500 text-xs md:text-sm font-bold mb-1">توقيع المعلم والمشرف</p>
                                                    <p className="font-black text-gray-800 font-serif italic text-lg md:text-xl relative z-10">د. إسماعيل عيسى</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="text-center text-muted-foreground flex flex-col items-center justify-center w-full h-full">
                                        <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-semibold text-sm">اختر طالباً واحداً على الأقل لمعاينة الشهادة</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
