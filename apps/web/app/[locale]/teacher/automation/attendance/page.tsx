'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, CheckCircle2, XCircle, Clock, ArrowLeft, Users, Save } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// Mock Data
const classes = [
    { id: '10-a', name: 'الصف 10 - أ', time: 'الحصة الأولى (08:00 ص)' },
    { id: '10-b', name: 'الصف 10 - ب', time: 'الحصة الثالثة (10:00 ص)' },
    { id: '11-a', name: 'الصف 11 - أ', time: 'الحصة الرابعة (11:00 ص)' },
]

const initialStudents = [
    { id: 1, name: 'أحمد سعيد المولد', status: 'pending' },
    { id: 2, name: 'سالم عبدالله الشهري', status: 'pending' },
    { id: 3, name: 'فهد محمد الدوسري', status: 'pending' },
    { id: 4, name: 'خالد عبدالعزيز الغامدي', status: 'pending' },
    { id: 5, name: 'عبدالرحمن طارق الزهراني', status: 'pending' },
    { id: 6, name: 'عمر حسن المالكي', status: 'pending' },
    { id: 7, name: 'يوسف جمال العتيبي', status: 'pending' },
    { id: 8, name: 'بدر ناصر المري', status: 'pending' },
]

export default function AttendanceAutomation() {
    const [selectedClass, setSelectedClass] = useState<string>('')
    const [students, setStudents] = useState(initialStudents)
    const [isSaving, setIsSaving] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    // Stats
    const total = students.length
    const present = students.filter(s => s.status === 'present').length
    const absent = students.filter(s => s.status === 'absent').length
    const late = students.filter(s => s.status === 'late').length
    const isTouched = students.some(s => s.status !== 'pending')

    const markAllPresent = () => {
        setStudents(students.map(s => ({ ...s, status: 'present' })))
    }

    const setStatus = (id: number, status: string) => {
        setStudents(students.map(s => s.id === id ? { ...s, status } : s))
    }

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => {
            setIsSaving(false)
            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 3000)
        }, 1500)
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/teacher/automation">
                    <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-muted">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                            <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">تحضير الطلاب بضغطة زر</h1>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 mr-14">حضّر الجميع كحاضرين بنقرة واحدة، ثم استثنِ الغائبين فقط.</p>
                </div>
            </div>

            {/* Selection Controls */}
            <Card className="border-border shadow-sm bg-card">
                <CardContent className="p-6">
                    <div className="space-y-2 max-w-md">
                        <label className="text-sm font-semibold text-foreground">الفصل الدراسي والحصة</label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-10 rounded-md mt-1 border-border focus:ring-violet-500">
                                <SelectValue placeholder="اختر الفصل..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex justify-between items-center w-full">
                                            <span>{c.name}</span>
                                            <span className="text-xs text-muted-foreground mx-4">{c.time}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedClass && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Stats & Master Action */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-none shadow-md bg-gradient-to-br from-violet-600 to-purple-700 text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/noise.webp')] opacity-10 mix-blend-overlay"></div>
                            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                            <CardContent className="p-8 flex flex-col items-center justify-center h-full relative z-10 text-center">
                                <Users className="w-10 h-10 text-white/60 mb-3" />
                                <h2 className="text-xl font-bold mb-2">تسجيل الحضور للفصل كامل</h2>
                                <p className="text-violet-100 text-sm mb-6 max-w-sm">وفر وقتك وسجل جميع الطلاب الـ {total} כحاضرين، ثم عدل الغياب لاحقاً بكل سهولة.</p>
                                <Button 
                                    onClick={markAllPresent}
                                    className="bg-white text-violet-700 hover:bg-violet-50 font-bold text-base h-12 px-8 rounded-lg shadow-sm hover:scale-105 transition-transform"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    الكل حاضر (بضغطة زر)
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="grid grid-rows-3 gap-4">
                            <Card className="border-border shadow-sm bg-green-50 dark:bg-green-950/20 border-r-4 border-r-green-500">
                                <CardContent className="p-4 flex items-center justify-between h-full">
                                    <div>
                                        <p className="text-green-700 dark:text-green-400 font-semibold text-sm">حاضر</p>
                                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{present}</p>
                                    </div>
                                    <CheckCircle2 className="w-6 h-6 text-green-500 opacity-50" />
                                </CardContent>
                            </Card>
                            <Card className="border-border shadow-sm bg-red-50 dark:bg-red-950/20 border-r-4 border-r-red-500">
                                <CardContent className="p-4 flex items-center justify-between h-full">
                                    <div>
                                        <p className="text-red-700 dark:text-red-400 font-semibold text-sm">غائب</p>
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{absent}</p>
                                    </div>
                                    <XCircle className="w-6 h-6 text-red-500 opacity-50" />
                                </CardContent>
                            </Card>
                            <Card className="border-border shadow-sm bg-yellow-50 dark:bg-yellow-950/20 border-r-4 border-r-yellow-500">
                                <CardContent className="p-4 flex items-center justify-between h-full">
                                    <div>
                                        <p className="text-yellow-700 dark:text-yellow-400 font-semibold text-sm">متأخر</p>
                                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{late}</p>
                                    </div>
                                    <Clock className="w-6 h-6 text-yellow-500 opacity-50" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Students List */}
                    <Card className="border-border shadow-sm bg-card">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-5">
                            {students.map((student, index) => (
                                <div 
                                    key={student.id} 
                                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                                        student.status === 'present' ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800' :
                                        student.status === 'absent' ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800' :
                                        student.status === 'late' ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800' :
                                        'bg-card border-border hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground text-sm font-semibold w-6">{index + 1}</span>
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-foreground text-xs shadow-sm">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-foreground">{student.name}</h4>
                                            {student.status === 'pending' && <p className="text-xs text-muted-foreground">لم يتم التحضير</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex bg-background rounded-md p-1 shadow-sm border border-border">
                                        <button 
                                            onClick={() => setStatus(student.id, 'present')}
                                            className={`p-1.5 rounded transition-colors ${student.status === 'present' ? 'bg-green-500 text-white' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                            title="حاضر"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setStatus(student.id, 'late')}
                                            className={`p-1.5 rounded transition-colors ${student.status === 'late' ? 'bg-yellow-500 text-white' : 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`}
                                            title="متأخر"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setStatus(student.id, 'absent')}
                                            className={`p-1.5 rounded transition-colors ${student.status === 'absent' ? 'bg-red-500 text-white' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                            title="غائب"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Floating Save Action */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <AnimatePresence>
                            {(isTouched && !isSaved) && (
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 100, opacity: 0 }}
                                    className="bg-foreground text-background p-3 pl-4 pr-5 rounded-full shadow-2xl flex items-center gap-5 border border-border"
                                >
                                    <div className="font-semibold text-sm">
                                        تم تحضير {total - students.filter(s => s.status === 'pending').length} من أصل {total} طلاب
                                    </div>
                                    <Button 
                                        onClick={handleSave}
                                        disabled={isSaving || students.some(s => s.status === 'pending')}
                                        className="bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full h-9 px-6 min-w-[120px] disabled:opacity-50 transition-transform active:scale-95"
                                    >
                                        {isSaving ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 ml-1.5" />
                                                اعتماد الحضور
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            )}

                            {isSaved && (
                                <motion.div
                                    initial={{ y: 100, scale: 0.9, opacity: 0 }}
                                    animate={{ y: 0, scale: 1, opacity: 1 }}
                                    exit={{ y: 100, scale: 0.9, opacity: 0 }}
                                    className="bg-green-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 font-semibold border-2 border-green-500"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    تم اعتماد الغياب بنجاح!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
